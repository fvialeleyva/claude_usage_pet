// Skin propio del usuario: elige cualquier imagen de su disco (diálogo
// nativo), la normalizamos con nativeImage (sin depender de `sharp` —
// esa es solo devDependency de build, no viaja en el paquete final) y la
// guardamos como PNG en userData. Vive fuera de assets/ (que es de solo
// lectura, empaquetado en el asar) porque esto sí hay que poder
// reescribirlo en cualquier momento.

const fs = require("fs");
const path = require("path");
const { app, dialog, nativeImage } = require("electron");

const MAX_DIMENSION = 512; // de sobra para una ventana de 110x110

function customSkinPath() {
  return path.join(app.getPath("userData"), "custom-skin.png");
}

function hasCustomSkin() {
  return fs.existsSync(customSkinPath());
}

function readCustomSkinDataUrl() {
  try {
    const buffer = fs.readFileSync(customSkinPath());
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

// Devuelve { ok:true, dataUrl } | { ok:false, message } | { ok:true, cancelled:true }
async function pickAndSaveCustomSkin(parentWindow) {
  const result = await dialog.showOpenDialog(parentWindow, {
    title: "Elegí una imagen para tu mascota",
    properties: ["openFile"],
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "bmp", "gif"] }],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { ok: true, cancelled: true };
  }

  const filePath = result.filePaths[0];
  const image = nativeImage.createFromPath(filePath);

  if (image.isEmpty()) {
    return { ok: false, message: "No pudimos leer esa imagen. Probá con otro archivo." };
  }

  const { width, height } = image.getSize();
  let resized = image;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    // Con un solo lado especificado, Electron mantiene la proporción solo
    // sin distorsionar la imagen.
    resized = width >= height ? image.resize({ width: MAX_DIMENSION }) : image.resize({ height: MAX_DIMENSION });
  }

  try {
    fs.writeFileSync(customSkinPath(), resized.toPNG());
  } catch (err) {
    return { ok: false, message: `No pudimos guardar la imagen: ${err.message}` };
  }

  return { ok: true, dataUrl: readCustomSkinDataUrl() };
}

module.exports = { hasCustomSkin, readCustomSkinDataUrl, pickAndSaveCustomSkin };
