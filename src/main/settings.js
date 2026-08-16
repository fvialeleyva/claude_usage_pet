// Preferencias de la app a nivel general (hoy solo autoarranque con
// Windows). JSON local aparte de pet-appearance.json / pet-window-state.json
// porque conceptualmente no tiene que ver con la mascota sino con la app.

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_SETTINGS = {
  autostart: false, // opt-in: no arrancar con Windows salvo que el usuario lo elija
};

function settingsPath() {
  return path.join(app.getPath("userData"), "pet-settings.json");
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch {
    // Nice-to-have; si falla no rompemos la app.
  }
}

module.exports = { loadSettings, saveSettings, DEFAULT_SETTINGS };
