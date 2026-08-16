const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("usagePet", {
  getUsage: () => ipcRenderer.invoke("usage:get"),
  refreshUsage: () => ipcRenderer.invoke("usage:refresh"),
  onUsageUpdated: (callback) => {
    const listener = (_event, usage) => callback(usage);
    ipcRenderer.on("usage:updated", listener);
    return () => ipcRenderer.removeListener("usage:updated", listener);
  },
  // Usados por el panel de detalle para no ocultarse mientras el mouse
  // sigue sobre él (el hover del tray dispara el show/hide en main).
  notifyPanelHoverEnter: () => ipcRenderer.send("panel:hover-enter"),
  notifyPanelHoverLeave: () => ipcRenderer.send("panel:hover-leave"),
  // Usado por la mascota flotante: un click (sin arrastre) abre el panel.
  notifyPetClicked: () => ipcRenderer.send("pet:clicked"),
  notifyHidePet: () => ipcRenderer.send("pet:hide"),
  showContextMenu: () => ipcRenderer.send("pet:context-menu"),
  // Drag manual (-webkit-app-region:drag hace que Chromium no dispare
  // 'click' de forma confiable en Windows). El main process mueve la
  // ventana con setBounds() en vez de setPosition().
  notifyPetDragStart: (pos) => ipcRenderer.send("pet:drag-start", pos),
  notifyPetDragMove: (pos) => ipcRenderer.send("pet:drag-move", pos),
  notifyPetDragEnd: () => ipcRenderer.send("pet:drag-end"),
  // Personalización (Fase 4): capas de accesorios (lentes/gorra/bigote).
  getAppearance: () => ipcRenderer.invoke("appearance:get"),
  setAppearance: (partial) => ipcRenderer.invoke("appearance:set", partial),
  onAppearanceUpdated: (callback) => {
    const listener = (_event, appearance) => callback(appearance);
    ipcRenderer.on("appearance:updated", listener);
    return () => ipcRenderer.removeListener("appearance:updated", listener);
  },
});
