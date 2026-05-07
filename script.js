const STORAGE_KEY = "catan-live-dashboard-v1";

const state = loadState();

const standingsTableBody = document.querySelector("#standingsTable tbody");
const eventLog = document.querySelector("#eventLog");
const playerSelect = document.querySelector("#playerSelect");

const addPlayerForm = document.querySelector("#addPlayerForm");
const updatePointsForm = document.querySelector("#updatePointsForm");

const resetAllBtn = document.querySelector("#resetAllBtn");
const clearLogBtn = document.querySelector("#clearLogBtn");

addPlayerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const playerNameInput = document.querySelector("#playerName");
  const name = playerNameInput.value.trim();

  if (!name) return;
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Spieler existiert bereits.");
    return;
  }

  state.players.push(createPlayer(name));
  addLog(`Spieler ${name} hinzugefügt.`);
  persistAndRender();
  addPlayerForm.reset();
});

updatePointsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = playerSelect.value;
  const player = state.players.find((p) => p.id === id);
  if (!player) return;

  player.settlements = sanitizeNumber(document.querySelector("#settlements").value);
  player.cities = sanitizeNumber(document.querySelector("#cities").value);
  player.victoryCards = sanitizeNumber(document.querySelector("#victoryCards").value);
  player.longestRoad = document.querySelector("#longestRoad").checked;
  player.largestArmy = document.querySelector("#largestArmy").checked;

  const note = document.querySelector("#note").value.trim();
  const points = calcPoints(player);
  const noteText = note ? ` – ${note}` : "";
  addLog(`${player.name} aktualisiert: ${points} Punkte${noteText}`);

  persistAndRender();
});

playerSelect.addEventListener("change", () => {
  const player = state.players.find((p) => p.id === playerSelect.value);
  if (!player) return;
  hydratePlayerEditor(player);
});

resetAllBtn.addEventListener("click", () => {
  if (!confirm("Wirklich alles zurücksetzen?")) return;
  state.players = [];
  state.events = [];
  persistAndRender();
});

clearLogBtn.addEventListener("click", () => {
  state.events = [];
  persistAndRender();
});

function createPlayer(name) {
  return {
    id: crypto.randomUUID(),
    name,
    settlements: 0,
    cities: 0,
    victoryCards: 0,
    longestRoad: false,
    largestArmy: false,
  };
}

function calcPoints(player) {
  return (
    player.settlements +
    player.cities * 2 +
    player.victoryCards +
    (player.longestRoad ? 2 : 0) +
    (player.largestArmy ? 2 : 0)
  );
}

function sanitizeNumber(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 0) return 0;
  return number;
}

function addLog(message) {
  state.events.unshift({ message, ts: new Date().toISOString() });
  state.events = state.events.slice(0, 100);
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { players: [], events: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      players: Array.isArray(parsed.players) ? parsed.players : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { players: [], events: [] };
  }
}

function render() {
  renderStandings();
  renderPlayerSelect();
  renderLog();
}

function renderStandings() {
  const sorted = [...state.players].sort((a, b) => calcPoints(b) - calcPoints(a));
  standingsTableBody.innerHTML = "";

  sorted.forEach((player, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td><strong>${calcPoints(player)}</strong></td>
      <td>${player.settlements}</td>
      <td>${player.cities}</td>
      <td>${player.victoryCards}</td>
      <td>${player.longestRoad ? "Ja" : "Nein"}</td>
      <td>${player.largestArmy ? "Ja" : "Nein"}</td>
    `;
    standingsTableBody.appendChild(row);
  });
}

function renderPlayerSelect() {
  const currentValue = playerSelect.value;
  playerSelect.innerHTML = "";

  if (!state.players.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Bitte erst Spieler anlegen";
    playerSelect.appendChild(option);
    playerSelect.disabled = true;
    updatePointsForm.querySelector("button[type='submit']").disabled = true;
    return;
  }

  state.players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    playerSelect.appendChild(option);
  });

  playerSelect.disabled = false;
  updatePointsForm.querySelector("button[type='submit']").disabled = false;

  playerSelect.value = state.players.some((p) => p.id === currentValue)
    ? currentValue
    : state.players[0].id;

  const selected = state.players.find((p) => p.id === playerSelect.value);
  if (selected) hydratePlayerEditor(selected);
}

function hydratePlayerEditor(player) {
  document.querySelector("#settlements").value = player.settlements;
  document.querySelector("#cities").value = player.cities;
  document.querySelector("#victoryCards").value = player.victoryCards;
  document.querySelector("#longestRoad").checked = player.longestRoad;
  document.querySelector("#largestArmy").checked = player.largestArmy;
}

function renderLog() {
  eventLog.innerHTML = "";
  for (const item of state.events) {
    const li = document.createElement("li");
    const time = new Date(item.ts).toLocaleTimeString("de-DE");
    li.innerHTML = `<span class="time">${time}</span><span class="message">${item.message}</span>`;
    eventLog.appendChild(li);
  }
}

render();
