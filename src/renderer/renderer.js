const els = {
  planBadge: document.getElementById("plan-badge"),
  errorBox: document.getElementById("error-box"),
  errorMessage: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
  fiveHourPct: document.getElementById("five-hour-pct"),
  fiveHourBar: document.getElementById("five-hour-bar"),
  fiveHourResets: document.getElementById("five-hour-resets"),
  weeklyPct: document.getElementById("weekly-pct"),
  weeklyBar: document.getElementById("weekly-bar"),
  weeklyResets: document.getElementById("weekly-resets"),
  creditsSpent: document.getElementById("credits-spent"),
  fetchedAt: document.getElementById("fetched-at"),
};

function formatResetsAt(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return `Resetea ${date.toLocaleString("es-AR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function barClassFor(pct) {
  if (pct === null) return "";
  if (pct >= 90) return "critical";
  if (pct >= 50) return "warning";
  return "";
}

function setBar(barEl, pctEl, resetsEl, metric) {
  const pct = metric.usedPct;
  pctEl.textContent = pct === null ? "N/D" : `${pct}%`;
  barEl.style.width = `${pct ?? 0}%`;
  barEl.className = `bar__fill ${barClassFor(pct)}`.trim();
  resetsEl.textContent = formatResetsAt(metric.resetsAt);
}

function render(usage) {
  els.retryBtn.disabled = false;
  els.retryBtn.textContent = "Reintentar";

  if (!usage.ok) {
    els.errorBox.hidden = false;
    els.errorMessage.textContent = usage.message;
    return;
  }

  els.errorBox.hidden = true;
  els.planBadge.textContent = usage.subscriptionType ?? "—";

  setBar(els.fiveHourBar, els.fiveHourPct, els.fiveHourResets, usage.fiveHour);
  setBar(els.weeklyBar, els.weeklyPct, els.weeklyResets, usage.weekly);

  els.creditsSpent.textContent =
    usage.credits.spentUSD === null
      ? "N/D"
      : `$${usage.credits.spentUSD.toFixed(2)} ${usage.credits.currency}`;

  const fetched = new Date(usage.fetchedAt);
  els.fetchedAt.textContent = `Actualizado ${fetched.toLocaleTimeString("es-AR")}`;
}

// Fallback solo para inspeccionar visualmente el panel abriendo este HTML
// directo en un navegador (sin Electron). En la app real window.usagePet
// siempre existe (lo inyecta preload.js) y esta rama nunca corre.
const api =
  window.usagePet ??
  {
    onUsageUpdated: () => {},
    getUsage: () =>
      Promise.resolve({
        ok: true,
        subscriptionType: "pro",
        fiveHour: { usedPct: 35, resetsAt: new Date(Date.now() + 3600e3).toISOString() },
        weekly: { usedPct: 62, resetsAt: new Date(Date.now() + 5 * 86400e3).toISOString() },
        credits: { spentUSD: 11.52, currency: "USD" },
        fetchedAt: new Date().toISOString(),
      }),
    refreshUsage: () => Promise.resolve({ ok: false, message: "(fallback de navegador)" }),
    notifyPanelHoverEnter: () => {},
    notifyPanelHoverLeave: () => {},
  };

api.onUsageUpdated(render);
api.getUsage().then(render);

els.retryBtn.addEventListener("click", () => {
  els.retryBtn.disabled = true;
  els.retryBtn.textContent = "Reintentando…";
  api.refreshUsage().then(render);
});

// Si el panel se abrió por hover del tray, no se cierra mientras el mouse
// siga adentro (main.js arma un timer de cierre en cuanto sale del tray).
document.addEventListener("mouseenter", () => api.notifyPanelHoverEnter());
document.addEventListener("mouseleave", () => api.notifyPanelHoverLeave());
