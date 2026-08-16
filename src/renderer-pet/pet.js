const mouth = document.getElementById("pet-mouth"); // solo existe en el skin Smiley
const hideBtn = document.getElementById("hide-btn");
const root = document.getElementById("pet-root");
const statusBadge = document.getElementById("status-badge");

const SEVERITIES = ["normal", "warning", "critical", "error"];
const SKIN_IDS = [
  "skin-smiley",
  "skin-floppy-o",
  "skin-monitor-max",
  "skin-forbino-max",
  "skin-calc-a-tron",
  "skin-action",
  "skin-mug",
  "skin-custom",
];

const MOUTHS = {
  normal: "M 38 64 Q 50 72 62 64", // sonrisa
  warning: "M 38 66 Q 50 66 62 66", // línea neutra
  critical: "M 38 68 Q 50 60 62 68", // preocupado
  error: "M 40 66 L 60 66", // sin datos
};

function severityFor(usage) {
  if (!usage.ok) return "error";
  const values = [usage.fiveHour.usedPct, usage.weekly.usedPct].filter(
    (v) => typeof v === "number"
  );
  if (!values.length) return "error";
  const worst = Math.max(...values);
  if (worst >= 90) return "critical";
  if (worst >= 50) return "warning";
  return "normal";
}

function render(usage) {
  const severity = severityFor(usage);

  // El color/anillo de cada skin se resuelve solo vía CSS
  // (var(--severity-color) definida en #pet-root), acá solo hace falta
  // prender la clase correcta.
  for (const s of SEVERITIES) root.classList.toggle(`severity-${s}`, s === severity);

  // La expresión de la boca solo existe como tal en el skin Smiley; los
  // skins de imagen muestran el estado únicamente con el anillo de color.
  if (mouth) mouth.setAttribute("d", MOUTHS[severity]);

  const parts = [];
  if (usage.ok) {
    if (typeof usage.fiveHour.usedPct === "number") parts.push(`5h: ${usage.fiveHour.usedPct}%`);
    if (typeof usage.weekly.usedPct === "number") parts.push(`Semanal: ${usage.weekly.usedPct}%`);
  } else {
    parts.push("Sin datos de uso");
  }
  root.title = `Claude Usage Pet\n${parts.join(" · ")}`;
}

window.usagePet.onUsageUpdated(render);
window.usagePet.getUsage().then(render);

function applyAppearance(appearance) {
  for (const skinId of SKIN_IDS) {
    document.getElementById(skinId).classList.toggle("active", skinId === `skin-${appearance.skin}`);
  }
  for (const key of ["hat", "glasses", "mustache"]) {
    const el = document.getElementById(`acc-${key}`);
    el.classList.toggle("visible", Boolean(appearance[key]));
  }
  // Smiley ya muestra el estado recoloreando su propio cuerpo; el punto
  // solo hace falta con los skins de imagen.
  statusBadge.classList.toggle("visible", appearance.skin !== "smiley");
}

window.usagePet.onAppearanceUpdated(applyAppearance);
window.usagePet.getAppearance().then(applyAppearance);

// Skin propio: la imagen viaja como data URL (no como ruta de archivo) para
// no tener que tocar la Content-Security-Policy de esta ventana.
const customSkinImg = document.getElementById("custom-skin-img");
window.usagePet.onCustomSkinUpdated((dataUrl) => {
  customSkinImg.src = dataUrl ?? "";
});
window.usagePet.getCustomSkin().then(({ dataUrl }) => {
  if (dataUrl) customSkinImg.src = dataUrl;
});

// stopPropagation en 'click' no alcanza: 'pointerdown'/'pointerup' del botón
// burbujean a `root` ANTES de que 'click' se dispare, así que sin esto cada
// click en la X también arrancaba/terminaba un drag y abría el panel.
hideBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
hideBtn.addEventListener("pointerup", (e) => e.stopPropagation());
hideBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  window.usagePet.notifyHidePet();
});

// Click derecho sobre la mascota abre el mismo menú que el ícono del tray
// (Actualizar, Mostrar/Ocultar, Personalizar, Notificación de prueba, Salir).
root.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  window.usagePet.showContextMenu();
});

// Drag manual: el main process mueve la ventana en base a coordenadas de
// pantalla. Usamos Pointer Events + setPointerCapture porque la ventana es
// chica (110x110): con mousemove normal, apenas el cursor sale de esos
// límites durante un arrastre rápido, el renderer deja de recibir eventos
// y el drag queda "colgado". Pointer capture sigue entregando eventos al
// elemento aunque el cursor ya esté fuera de la ventana.
let dragging = false;
let moved = false;

root.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  dragging = true;
  moved = false;
  root.setPointerCapture(e.pointerId);
  window.usagePet.notifyPetDragStart({ screenX: e.screenX, screenY: e.screenY });
});

// Un mouse/trackpad real dispara pointermove muchas más veces por segundo
// que lo que probamos en desarrollo. Frenar a como mucho una llamada por
// frame (~60/seg) evita saturar main con setBounds().
let pendingMove = null;
let moveRafScheduled = false;

function flushPendingMove() {
  moveRafScheduled = false;
  if (pendingMove) {
    window.usagePet.notifyPetDragMove(pendingMove);
    pendingMove = null;
  }
}

root.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  moved = true;
  pendingMove = { screenX: e.screenX, screenY: e.screenY };
  if (!moveRafScheduled) {
    moveRafScheduled = true;
    requestAnimationFrame(flushPendingMove);
  }
});

root.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  dragging = false;
  root.releasePointerCapture(e.pointerId);
  if (pendingMove) flushPendingMove(); // no dejar la última posición sin aplicar
  window.usagePet.notifyPetDragEnd();
  if (!moved) {
    window.usagePet.notifyPetClicked();
  }
});
