// Fase 0 — Spike: ¿podemos leer nuestro propio % de uso de Claude localmente?
// No hardcodea ningún token. Lee el token OAuth que Claude Code ya guarda
// localmente tras el login (Windows: ~/.claude/.credentials.json).
// Llama al mismo endpoint no documentado que usa `/usage` en Claude Code.

const fs = require("fs");
const os = require("os");
const path = require("path");

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

function loadToken() {
  const credPath = path.join(os.homedir(), ".claude", ".credentials.json");

  if (!fs.existsSync(credPath)) {
    throw new Error(
      `No se encontró ${credPath}. ¿Está Claude Code instalado y con sesión iniciada en esta máquina?`
    );
  }

  const raw = fs.readFileSync(credPath, "utf8");
  const data = JSON.parse(raw);
  const oauth = data.claudeAiOauth;

  if (!oauth || !oauth.accessToken) {
    throw new Error(
      `El archivo ${credPath} existe pero no tiene claudeAiOauth.accessToken. Formato inesperado.`
    );
  }

  const expiresAt = oauth.expiresAt ? new Date(oauth.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new Error(
      `El access token expiró el ${expiresAt.toISOString()}. Correr \`claude\` de nuevo para refrescarlo.`
    );
  }

  return {
    accessToken: oauth.accessToken,
    subscriptionType: oauth.subscriptionType,
    expiresAt,
  };
}

async function fetchUsage(accessToken) {
  const res = await fetch(USAGE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `El endpoint respondió ${res.status} ${res.statusText}. Body: ${text.slice(0, 500)}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `La respuesta no es JSON válido (el formato del endpoint pudo haber cambiado). Body: ${text.slice(0, 500)}`
    );
  }

  return json;
}

function pct(used, limit) {
  if (typeof used !== "number" || typeof limit !== "number" || limit === 0) {
    return "N/D";
  }
  return `${((used / limit) * 100).toFixed(1)}%`;
}

async function main() {
  console.log("--- Claude Usage Pet: Fase 0 spike ---\n");

  let token;
  try {
    token = loadToken();
    console.log(`Token encontrado. Plan: ${token.subscriptionType ?? "desconocido"}`);
    if (token.expiresAt) {
      console.log(`Expira: ${token.expiresAt.toISOString()}`);
    }
  } catch (err) {
    console.error(`[ERROR] No se pudo leer el token local: ${err.message}`);
    process.exit(1);
  }

  console.log(`\nLlamando a ${USAGE_URL} ...\n`);

  let usage;
  try {
    usage = await fetchUsage(token.accessToken);
  } catch (err) {
    console.error(`[ERROR] No se pudo leer el uso: ${err.message}`);
    console.error(
      "\nEsto puede significar que el endpoint no documentado cambió de forma o dejó de existir."
    );
    process.exit(1);
  }

  console.log("Respuesta cruda del endpoint (para inspeccionar el formato real):");
  console.log(JSON.stringify(usage, null, 2));

  console.log("\n--- Lectura estructurada (confirmada contra el JSON real) ---\n");

  const fh = usage.five_hour;
  const wk = usage.seven_day;
  const spend = usage.spend;

  if (fh) {
    console.log(`Límite de 5 horas: ${fh.utilization}% (resetea ${fh.resets_at})`);
  }
  if (wk) {
    console.log(`Límite semanal:    ${wk.utilization}% (resetea ${wk.resets_at})`);
  }
  if (spend && spend.used) {
    const amount = spend.used.amount_minor / Math.pow(10, spend.used.exponent);
    console.log(`Créditos gastados: $${amount.toFixed(2)} ${spend.used.currency}`);
  }
}

main();
