// Data layer: ubica el token OAuth local de Claude Code, llama al endpoint
// de uso, y devuelve un shape simple y estable para el resto de la app.
// Nunca lanza hacia arriba un error sin contexto: siempre { ok, ... }.

const fs = require("fs");
const os = require("os");
const path = require("path");

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const CREDENTIALS_PATH = path.join(os.homedir(), ".claude", ".credentials.json");

function loadToken() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return {
      ok: false,
      reason: "no-credentials-file",
      message:
        "No encontramos una sesión de Claude en esta compu. Abrí Claude Code (la app o la terminal) e iniciá sesión, después volvé a tocar \"Reintentar\" acá.",
    };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  } catch (err) {
    return {
      ok: false,
      reason: "unreadable-credentials-file",
      message: `No se pudo leer el archivo de sesión de Claude Code (${CREDENTIALS_PATH}): ${err.message}`,
    };
  }

  const oauth = data.claudeAiOauth;
  if (!oauth || !oauth.accessToken) {
    return {
      ok: false,
      reason: "missing-token",
      message:
        "Tu sesión de Claude Code parece incompleta. Probá cerrar sesión y volver a iniciarla en Claude Code.",
    };
  }

  if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
    return {
      ok: false,
      reason: "expired-token",
      message:
        "Tu sesión de Claude venció. Abrí Claude Code y mandale un mensaje para renovarla (con tenerlo abierto de fondo no alcanza), después volvé a tocar \"Reintentar\" acá.",
    };
  }

  return {
    ok: true,
    accessToken: oauth.accessToken,
    subscriptionType: oauth.subscriptionType ?? null,
  };
}

async function fetchRawUsage(accessToken) {
  const res = await fetch(USAGE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text);
}

function normalize(raw, subscriptionType) {
  const fh = raw.five_hour ?? {};
  const wk = raw.seven_day ?? {};
  const spendUsed = raw.spend?.used;

  const spentUSD =
    spendUsed && typeof spendUsed.amount_minor === "number"
      ? spendUsed.amount_minor / Math.pow(10, spendUsed.exponent ?? 2)
      : null;

  return {
    ok: true,
    subscriptionType,
    fiveHour: {
      usedPct: typeof fh.utilization === "number" ? fh.utilization : null,
      resetsAt: fh.resets_at ?? null,
    },
    weekly: {
      usedPct: typeof wk.utilization === "number" ? wk.utilization : null,
      resetsAt: wk.resets_at ?? null,
    },
    credits: {
      spentUSD,
      currency: spendUsed?.currency ?? "USD",
    },
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Devuelve siempre un objeto, nunca lanza. En caso de fallo:
 * { ok: false, reason, message }
 */
async function getUsage() {
  const token = loadToken();
  if (!token.ok) {
    return token;
  }

  try {
    const raw = await fetchRawUsage(token.accessToken);
    return normalize(raw, token.subscriptionType);
  } catch (err) {
    return {
      ok: false,
      reason: "fetch-failed",
      message: `No se pudo leer el uso (el endpoint no documentado pudo haber cambiado): ${err.message}`,
    };
  }
}

module.exports = { getUsage, CREDENTIALS_PATH, USAGE_URL };
