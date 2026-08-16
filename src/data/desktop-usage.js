// Segunda fuente de datos, para gente que usa la app de escritorio de
// Claude "normal" (no Claude Code). Esa app guarda su propio historial
// local de uso — sin token, sin OAuth, nunca "vence" como el de
// usage.js — en plan-usage-history.json. Se usa como fallback cuando
// no hay una sesión de Claude Code disponible.
//
// Tan no-documentado como el resto de la app: verificado a mano en una
// sola máquina (ver CLAUDE.md), no hay garantía de que exista en todas
// las versiones/instalaciones. Nunca lanza: siempre { ok, ... }.

const fs = require("fs");
const os = require("os");
const path = require("path");

const HISTORY_PATH = path.join(os.homedir(), "AppData", "Roaming", "Claude", "plan-usage-history.json");

// Verificado empíricamente: la app escribe una muestra nueva cada ~15min
// mientras está activa. 30min de margen antes de considerar el dato viejo.
const STALE_AFTER_MS = 30 * 60 * 1000;

function getDesktopUsage() {
  if (!fs.existsSync(HISTORY_PATH)) {
    return {
      ok: false,
      reason: "no-desktop-history",
      message: "No encontramos el historial de uso de la app de escritorio de Claude en esta compu.",
    };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  } catch (err) {
    return {
      ok: false,
      reason: "unreadable-desktop-history",
      message: `No se pudo leer el historial de la app de Claude (${HISTORY_PATH}): ${err.message}`,
    };
  }

  const samples = data.samples;
  if (!Array.isArray(samples) || samples.length === 0) {
    return {
      ok: false,
      reason: "empty-desktop-history",
      message: "El historial de uso de la app de Claude todavía está vacío.",
    };
  }

  const last = samples[samples.length - 1];
  const ageMs = Date.now() - last.t;
  if (ageMs > STALE_AFTER_MS) {
    return {
      ok: false,
      reason: "stale-desktop-history",
      message: `El último dato de la app de Claude es de hace ${Math.round(ageMs / 60000)} minutos. Abrí la app de Claude para actualizarlo, después volvé a tocar "Reintentar" acá.`,
    };
  }

  return {
    ok: true,
    source: "desktop-history",
    // Esta fuente no trae plan, fecha de reseteo ni créditos gastados —
    // solo los dos porcentajes. El resto queda en null; la UI ya sabe
    // mostrar "—"/"N/D" para esos campos.
    subscriptionType: null,
    fiveHour: {
      usedPct: typeof last.u?.fh === "number" ? last.u.fh : null,
      resetsAt: null,
    },
    weekly: {
      usedPct: typeof last.u?.sd === "number" ? last.u.sd : null,
      resetsAt: null,
    },
    credits: { spentUSD: null, currency: "USD" },
    fetchedAt: new Date(last.t).toISOString(),
  };
}

module.exports = { getDesktopUsage, HISTORY_PATH, STALE_AFTER_MS };
