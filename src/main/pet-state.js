// Persiste posición y visibilidad de la mascota flotante en un JSON local
// bajo el userData de la app (no en el repo, no en ~/.claude).

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function statePath() {
  return path.join(app.getPath("userData"), "pet-window-state.json");
}

function loadPetState() {
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return { x: null, y: null, visible: true };
  }
}

let saveTimer = null;

function savePetState(state) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(statePath(), JSON.stringify(state, null, 2));
    } catch {
      // Persistir la posición es un nice-to-have; si falla no rompemos la app.
    }
  }, 300);
}

module.exports = { loadPetState, savePetState };
