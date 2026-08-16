const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, screen } = require("electron");
const path = require("path");
const { getUsage } = require("../data/usage");
const { loadPetState, savePetState } = require("./pet-state");
const { loadAppearance, saveAppearance, SKINS } = require("./pet-appearance");
const { checkAndNotify, sendTestNotification } = require("./notifications");
const { loadSettings, saveSettings } = require("./settings");
const { hasCustomSkin, readCustomSkinDataUrl, pickAndSaveCustomSkin } = require("./custom-skin");

const POLL_INTERVAL_MS = 90 * 1000; // 90s: no abusar del endpoint no documentado
const ERROR_POLL_INTERVAL_MS = 20 * 1000; // reintentar más seguido mientras esté en error
const CRITICAL_THRESHOLD = 90;
const HOVER_HIDE_DELAY_MS = 250;
const ALWAYS_ON_TOP_REASSERT_MS = 3 * 1000; // Windows "olvida" el always-on-top con el tiempo

const PET_SIZE = 110;
const PET_MARGIN = 24;

let tray = null;
let panelWindow = null;
let petWindow = null;
let customizeWindow = null;
let lastUsage = null;
let pollTimer = null;
let alwaysOnTopTimer = null;
let hoverHideTimer = null;
let petState = { x: null, y: null, visible: true };
let petAppearance = { glasses: false, hat: false, mustache: false };
let appSettings = { autostart: false };
let petDragAnchor = null; // { mouseX, mouseY, winX, winY }

const ICON_NORMAL = path.join(__dirname, "..", "..", "assets", "tray-icon.png");
const ICON_WARNING = path.join(__dirname, "..", "..", "assets", "tray-icon-warning.png");
const PRELOAD = path.join(__dirname, "preload.js");

function worstPct(usage) {
  if (!usage.ok) return null;
  const values = [usage.fiveHour.usedPct, usage.weekly.usedPct].filter(
    (v) => typeof v === "number"
  );
  return values.length ? Math.max(...values) : null;
}

function tooltipFor(usage) {
  if (!usage.ok) {
    return `Claude Usage Pet\nNo se pudo leer tu uso: ${usage.message}`;
  }
  const fh = usage.fiveHour.usedPct;
  const wk = usage.weekly.usedPct;
  return `Claude Usage Pet\n5 horas: ${fh ?? "N/D"}%  ·  Semanal: ${wk ?? "N/D"}%`;
}

function updateTray(usage) {
  if (!tray) return;
  tray.setToolTip(tooltipFor(usage));
  const worst = worstPct(usage);
  tray.setImage(worst !== null && worst >= CRITICAL_THRESHOLD ? ICON_WARNING : ICON_NORMAL);
}

async function refreshUsage() {
  const usage = await getUsage();
  lastUsage = usage;
  updateTray(usage);
  checkAndNotify(usage);
  for (const win of [panelWindow, petWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("usage:updated", usage);
    }
  }
  return usage;
}

// Sondeo cada 90s normalmente, pero cada 20s mientras esté en error (token
// vencido, rate limit, red caída) — así se reconecta solo apenas se
// resuelve, en vez de hacer esperar hasta el próximo ciclo de 90s.
function scheduleNextPoll(usage) {
  if (pollTimer) clearTimeout(pollTimer);
  const delay = usage.ok ? POLL_INTERVAL_MS : ERROR_POLL_INTERVAL_MS;
  pollTimer = setTimeout(async () => {
    scheduleNextPoll(await refreshUsage());
  }, delay);
}

// Usado por "Actualizar ahora" del tray, el botón "Reintentar" del panel,
// y el arranque: siempre fuerza un fetch inmediato y reprograma el próximo
// sondeo automático desde ahí (para no terminar sondeando dos veces seguidas).
async function refreshUsageNow() {
  const usage = await refreshUsage();
  scheduleNextPoll(usage);
  return usage;
}

// --- Panel de detalle (Fase 1) ---

function createPanelWindow() {
  const win = new BrowserWindow({
    width: 320,
    height: 360,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  win.on("blur", () => {
    if (!win.webContents.isDevToolsOpened()) {
      win.hide();
    }
  });

  return win;
}

function positionWindowNear(win, anchorBounds) {
  const { width, height } = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: anchorBounds.x, y: anchorBounds.y });
  const workArea = display.workArea;

  let x = Math.round(anchorBounds.x + anchorBounds.width / 2 - width / 2);
  let y = Math.round(anchorBounds.y + anchorBounds.height);

  // Si el ancla está en la mitad inferior de la pantalla (tray o mascota
  // cerca del taskbar), el panel abre hacia arriba en vez de tapar el borde.
  if (anchorBounds.y > workArea.y + workArea.height / 2) {
    y = Math.round(anchorBounds.y - height);
  }

  x = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - width);
  y = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - height);

  win.setBounds({ x, y, width, height });
}

function showPanel(anchorBounds, { focus }) {
  if (!panelWindow || panelWindow.isDestroyed()) {
    panelWindow = createPanelWindow();
  }
  cancelHoverHide();
  positionWindowNear(panelWindow, anchorBounds);
  panelWindow.show();
  if (focus) panelWindow.focus();
  if (lastUsage) {
    panelWindow.webContents.send("usage:updated", lastUsage);
  }
}

function togglePanel(anchorBounds) {
  if (panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible()) {
    panelWindow.hide();
    return;
  }
  showPanel(anchorBounds, { focus: true });
}

function scheduleHoverHide() {
  cancelHoverHide();
  hoverHideTimer = setTimeout(() => {
    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.hide();
    }
  }, HOVER_HIDE_DELAY_MS);
}

function cancelHoverHide() {
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
    hoverHideTimer = null;
  }
}

// --- Mascota flotante (Fase 2) ---

function defaultPetPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - PET_SIZE - PET_MARGIN,
    y: workArea.y + workArea.height - PET_SIZE - PET_MARGIN,
  };
}

function clampToNearestDisplay(pos) {
  const { workArea } = screen.getDisplayNearestPoint(pos);
  return {
    x: Math.min(Math.max(pos.x, workArea.x), workArea.x + workArea.width - PET_SIZE),
    y: Math.min(Math.max(pos.y, workArea.y), workArea.y + workArea.height - PET_SIZE),
  };
}

function createPetWindow() {
  const saved =
    typeof petState.x === "number" && typeof petState.y === "number"
      ? { x: petState.x, y: petState.y }
      : null;
  // clampToNearestDisplay también cubre el caso de una posición guardada
  // de un monitor externo que ya no está conectado.
  const pos = clampToNearestDisplay(saved ?? defaultPetPosition());

  const win = new BrowserWindow({
    width: PET_SIZE,
    height: PET_SIZE,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    // Sin esto, Windows le agrega el estilo WS_THICKFRAME a la ventana sin
    // marco (es el default de Electron incluso con resizable:false), y ese
    // estilo trae animaciones/redimensionado de DWM que probablemente son
    // la causa real de que la ventana se infle al reposicionarla seguido.
    thickFrame: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer-pet", "index.html"));

  // 'screen-saver' es el nivel de always-on-top más alto que expone
  // Electron — sin esto, Windows suele "olvidar" el estado siempre-encima
  // apenas se activa otra ventana (alt-tab, cambiar de app), y una ventana
  // frameless/transparent como esta queda tapada en vez de flotando.
  win.setAlwaysOnTop(true, "screen-saver");

  // En Windows, crear una ventana transparente ya posicionada con show:true
  // a veces pinta completamente invisible (bug de compositing conocido de
  // Electron/Chromium). Posicionar recién en 'ready-to-show' lo evita.
  win.once("ready-to-show", () => {
    win.setPosition(pos.x, pos.y);
    if (petState.visible) win.show();
  });

  // Bug conocido de Electron/Windows: setPosition() repetido en una ventana
  // transparent:true infla su tamaño real con cada llamada (no solo el rect
  // exterior — el área de contenido también crece), y el efecto puede
  // manifestarse un instante después de que setPosition() ya retornó. El
  // evento 'resize' es la señal directa de "el tamaño cambió de verdad",
  // así que corregimos ahí en vez de intentar adivinar el timing.
  win.on("resize", () => {
    const bounds = win.getBounds();
    if (bounds.width !== PET_SIZE || bounds.height !== PET_SIZE) {
      win.setSize(PET_SIZE, PET_SIZE);
    }
  });

  win.on("moved", () => {
    const bounds = win.getBounds();
    petState = { ...petState, x: bounds.x, y: bounds.y };
    savePetState(petState);
  });

  return win;
}

// El bug de inflado no es solo del drag: CUALQUIER llamada nativa repetida
// sobre esta ventana (setPosition, pero también setAlwaysOnTop) dispara el
// mismo problema en Windows. Por eso esto es una función compartida que se
// llama después de cada una de esas operaciones, no solo durante el drag.
function enforcePetSize() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  if (bounds.width !== PET_SIZE || bounds.height !== PET_SIZE) {
    petWindow.setSize(PET_SIZE, PET_SIZE);
  }
}

function setPetVisible(visible) {
  if (!petWindow || petWindow.isDestroyed()) return;
  petState = { ...petState, visible };
  savePetState(petState);
  if (visible) {
    petWindow.show();
    petWindow.setAlwaysOnTop(true, "screen-saver");
    enforcePetSize();
  } else {
    petWindow.hide();
  }
  tray.setContextMenu(buildContextMenu());
}

// --- Personalización (Fase 4) ---

function broadcastAppearance() {
  for (const win of [petWindow, customizeWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("appearance:updated", petAppearance);
    }
  }
}

function createCustomizeWindow() {
  const win = new BrowserWindow({
    width: 240,
    height: 760,
    show: false,
    frame: true,
    resizable: false,
    fullscreenable: false,
    title: "Personalizar mascota",
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer-customize", "index.html"));
  win.on("closed", () => {
    customizeWindow = null;
  });

  return win;
}

function openCustomizeWindow() {
  if (!customizeWindow || customizeWindow.isDestroyed()) {
    customizeWindow = createCustomizeWindow();
  }
  customizeWindow.show();
  customizeWindow.focus();
}

// --- Preferencias de la app (Fase 5) ---

// En dev (`npm start`) no tocamos el registro de Windows: registrar
// electron.exe como ítem de inicio sería un efecto secundario raro para
// Franco cada vez que prueba la app. El toggle igual persiste la
// preferencia, así que una vez empaquetada la app respeta lo elegido
// (ver la llamada a app.setLoginItemSettings en whenReady más abajo).
function applyAutostart(enabled) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled });
}

function setAutostart(enabled) {
  appSettings = { ...appSettings, autostart: enabled };
  saveSettings(appSettings);
  applyAutostart(enabled);
  tray.setContextMenu(buildContextMenu());
}

// --- Tray ---

function buildContextMenu() {
  return Menu.buildFromTemplate([
    { label: "Actualizar ahora", click: () => refreshUsageNow() },
    { type: "separator" },
    {
      label: "Mostrar mascota",
      type: "checkbox",
      checked: petState.visible,
      click: (menuItem) => setPetVisible(menuItem.checked),
    },
    { label: "Personalizar mascota…", click: () => openCustomizeWindow() },
    { label: "Notificación de prueba", click: () => sendTestNotification() },
    { type: "separator" },
    {
      label: "Iniciar con Windows",
      type: "checkbox",
      checked: appSettings.autostart,
      click: (menuItem) => setAutostart(menuItem.checked),
    },
    { label: "Salir", click: () => app.quit() },
  ]);
}

// Sin esto, Windows agrupa las notificaciones bajo "Electron" en vez de
// "Claude Usage Pet" en el Centro de notificaciones.
app.setAppUserModelId("com.claudeusagepet.app");

// Sin esto, correr `npm start` dos veces (o dejar una instancia vieja de
// una sesión de desarrollo anterior) deja dos tray icons y dos mascotas
// superpuestas en la misma posición, y cada una hace su propio polling
// cada 90s — el doble de requests hace que el endpoint devuelva 429.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;

  petState = loadPetState();
  petAppearance = loadAppearance();
  appSettings = loadSettings();
  // Reaplicar en cada arranque (no solo cuando el usuario togglea) para que
  // una reinstalación o un login-item borrado a mano por Windows se
  // autocorrija contra la preferencia guardada.
  applyAutostart(appSettings.autostart);

  const icon = nativeImage.createFromPath(ICON_NORMAL);
  tray = new Tray(icon);
  tray.setToolTip("Claude Usage Pet");
  tray.setContextMenu(buildContextMenu());

  tray.on("click", () => togglePanel(tray.getBounds()));
  // Hover además de click. Si el sistema/plataforma no dispara estos
  // eventos, el click de arriba sigue funcionando igual.
  tray.on("mouse-enter", () => showPanel(tray.getBounds(), { focus: false }));
  tray.on("mouse-leave", () => scheduleHoverHide());

  petWindow = createPetWindow();

  ipcMain.handle("usage:get", async () => lastUsage ?? (await refreshUsageNow()));
  ipcMain.handle("usage:refresh", async () => refreshUsageNow());
  ipcMain.on("panel:hover-enter", () => cancelHoverHide());
  ipcMain.on("panel:hover-leave", () => scheduleHoverHide());
  ipcMain.on("pet:clicked", () => togglePanel(petWindow.getBounds()));
  ipcMain.on("pet:hide", () => setPetVisible(false));
  ipcMain.on("pet:context-menu", () => buildContextMenu().popup({ window: petWindow }));

  ipcMain.handle("appearance:get", () => petAppearance);
  ipcMain.handle("appearance:set", (_event, partial) => {
    if (partial.skin && !SKINS.includes(partial.skin)) {
      delete partial.skin;
    }
    // No dejar elegir "custom" si todavía no hay ninguna imagen guardada
    // (la UI ya deshabilita ese radio en ese caso, esto es el respaldo).
    if (partial.skin === "custom" && !hasCustomSkin()) {
      delete partial.skin;
    }
    petAppearance = { ...petAppearance, ...partial };
    saveAppearance(petAppearance);
    broadcastAppearance();
    return petAppearance;
  });

  ipcMain.handle("customSkin:get", () => ({
    exists: hasCustomSkin(),
    dataUrl: readCustomSkinDataUrl(),
  }));
  ipcMain.handle("customSkin:choose", async (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await pickAndSaveCustomSkin(parentWindow);
    if (result.ok && !result.cancelled) {
      petAppearance = { ...petAppearance, skin: "custom" };
      saveAppearance(petAppearance);
      broadcastAppearance();
      for (const win of [petWindow, customizeWindow]) {
        if (win && !win.isDestroyed()) {
          win.webContents.send("customSkin:updated", result.dataUrl);
        }
      }
    }
    return result;
  });

  ipcMain.on("pet:drag-start", (_event, { screenX, screenY }) => {
    const bounds = petWindow.getBounds();
    petDragAnchor = { mouseX: screenX, mouseY: screenY, winX: bounds.x, winY: bounds.y };
  });
  ipcMain.on("pet:drag-move", (_event, { screenX, screenY }) => {
    if (!petDragAnchor) return;
    const x = Math.round(petDragAnchor.winX + (screenX - petDragAnchor.mouseX));
    const y = Math.round(petDragAnchor.winY + (screenY - petDragAnchor.mouseY));
    const { workArea } = screen.getDisplayNearestPoint({ x: screenX, y: screenY });
    const clampedX = Math.min(Math.max(x, workArea.x), workArea.x + workArea.width - PET_SIZE);
    const clampedY = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - PET_SIZE);
    // setBounds() con el tamaño explícito en cada llamada, no setPosition():
    // la teoría es que setPosition() en Windows puede dejar el tamaño
    // "flotando" (heredado de un estado interno previo) y ahí es donde
    // entra el inflado; declarar el tamaño correcto en cada llamada no le
    // da margen a que se pierda.
    petWindow.setBounds({ x: clampedX, y: clampedY, width: PET_SIZE, height: PET_SIZE });
  });
  ipcMain.on("pet:drag-end", () => {
    petDragAnchor = null;
    enforcePetSize();
    const bounds = petWindow.getBounds();
    petState = { ...petState, x: bounds.x, y: bounds.y };
    savePetState(petState);
  });

  const initialUsage = await refreshUsage();
  scheduleNextPoll(initialUsage);

  alwaysOnTopTimer = setInterval(() => {
    if (petWindow && !petWindow.isDestroyed() && petWindow.isVisible()) {
      petWindow.setAlwaysOnTop(true, "screen-saver");
      enforcePetSize();
    }
  }, ALWAYS_ON_TOP_REASSERT_MS);
});

app.on("window-all-closed", () => {
  // Es una app de bandeja: no llamar a app.quit() acá alcanza para que siga viva.
});

app.on("before-quit", () => {
  if (pollTimer) clearTimeout(pollTimer);
  if (alwaysOnTopTimer) clearInterval(alwaysOnTopTimer);
  cancelHoverHide();
});
