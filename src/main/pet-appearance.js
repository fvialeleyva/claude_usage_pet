// Persiste el personaje elegido (skin) y qué accesorios tiene puestos
// (capas intercambiables: lentes, gorra, bigote) en un JSON local bajo el
// userData de la app. Los skins son diseños propios, no reproducciones de
// personajes ni personas reales — ver notas en renderer-pet/pet.css.

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const SKINS = ["smiley", "floppy-o", "monitor-max", "forbino-max", "calc-a-tron", "action", "mug", "custom"];

const DEFAULT_APPEARANCE = {
  skin: "smiley",
  glasses: false,
  hat: false,
  mustache: false,
};

function appearancePath() {
  return path.join(app.getPath("userData"), "pet-appearance.json");
}

function loadAppearance() {
  try {
    const raw = fs.readFileSync(appearancePath(), "utf8");
    const parsed = { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
    if (!SKINS.includes(parsed.skin)) parsed.skin = DEFAULT_APPEARANCE.skin;
    return parsed;
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

function saveAppearance(appearance) {
  try {
    fs.writeFileSync(appearancePath(), JSON.stringify(appearance, null, 2));
  } catch {
    // Persistir la apariencia es un nice-to-have; si falla no rompemos la app.
  }
}

module.exports = { loadAppearance, saveAppearance, DEFAULT_APPEARANCE, SKINS };
