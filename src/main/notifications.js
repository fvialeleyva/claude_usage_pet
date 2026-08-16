// Notificaciones nativas al cruzar 50% y 90% de cada límite. El estado de
// "ya notificado" se guarda en memoria (no en disco: es normal que se
// reinicie si se cierra la app) y se resetea solo cuando el % vuelve a caer
// por debajo del umbral (ej. al resetear la ventana de 5h o la semanal),
// así el próximo cruce vuelve a avisar en vez de quedar callado para siempre.

const { Notification } = require("electron");

const THRESHOLDS = [50, 90];

const LABELS = {
  fiveHour: "Límite de 5 horas",
  weekly: "Límite semanal",
};

function freshFlags() {
  return Object.fromEntries(THRESHOLDS.map((t) => [t, false]));
}

const notifiedState = {
  fiveHour: freshFlags(),
  weekly: freshFlags(),
};

function notify(key, threshold, pct) {
  if (!Notification.isSupported()) return;
  const severity = threshold >= 90 ? "Crítico" : "Atención";
  new Notification({
    title: `Claude Usage Pet — ${severity}`,
    body: `${LABELS[key]} llegó al ${pct}% (cruzaste el ${threshold}%).`,
  }).show();
}

function checkThreshold(key, pct) {
  if (typeof pct !== "number") return;
  for (const threshold of THRESHOLDS) {
    if (pct >= threshold) {
      if (!notifiedState[key][threshold]) {
        notifiedState[key][threshold] = true;
        notify(key, threshold, pct);
      }
    } else {
      notifiedState[key][threshold] = false;
    }
  }
}

function checkAndNotify(usage) {
  if (!usage.ok) return; // no resetear flags por un fetch fallido, solo no chequear
  checkThreshold("fiveHour", usage.fiveHour.usedPct);
  checkThreshold("weekly", usage.weekly.usedPct);
}

function sendTestNotification() {
  if (!Notification.isSupported()) return;
  new Notification({
    title: "Claude Usage Pet — Notificación de prueba",
    body: "Si ves esto, las notificaciones nativas funcionan bien en este equipo.",
  }).show();
}

module.exports = { checkAndNotify, sendTestNotification };
