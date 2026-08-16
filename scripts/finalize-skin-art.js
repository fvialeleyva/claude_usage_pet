// Segunda pasada de arte: Franco pasó las imágenes por Canva. Algunas
// salieron con canal alfa real (ya quedan tal cual, solo recortar/centrar);
// otras salieron como PNG con fondo blanco sólido (Canva no completó la
// exportación transparente) y hay que sacárselo con flood-fill desde el
// borde — mucho más simple que el cuadriculado original porque acá es un
// solo color uniforme, no dos alternados.

const sharp = require("sharp");
const path = require("path");

const SRC_DIR = "C:/Users/f_via/Documents/FV/Job Search 2026/Claude Usage Pet";
const OUT_DIR = path.join(__dirname, "..", "assets", "skins");
const OUT_SIZE = 320;
const PADDING_FRAC = 0.06;

function removeWhiteBackground(raw, width, height, channels, threshold = 18) {
  const isWhite = (r, g, b) => 255 - r < threshold && 255 - g < threshold && 255 - b < threshold;

  const visited = new Uint8Array(width * height);
  const bg = new Uint8Array(width * height);
  const stack = [];
  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * channels;
    if (!isWhite(raw[i], raw[i + 1], raw[i + 2])) return;
    visited[idx] = 1;
    bg[idx] = 1;
    stack.push([x, y]);
  };
  for (let x = 0; x < width; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }
  while (stack.length) {
    const [x, y] = stack.pop();
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  const out = Buffer.alloc(width * height * 4);
  for (let idx = 0; idx < width * height; idx++) {
    const i = idx * channels;
    const o = idx * 4;
    out[o] = raw[i];
    out[o + 1] = raw[i + 1];
    out[o + 2] = raw[i + 2];
    out[o + 3] = bg[idx] ? 0 : 255;
  }
  return out;
}

async function finalize(inputBuf, outPath) {
  const trimmedBuf = await sharp(inputBuf).trim({ threshold: 10 }).png().toBuffer();
  const meta = await sharp(trimmedBuf).metadata();
  const contentSize = Math.max(meta.width, meta.height);
  const canvasSize = Math.round(contentSize * (1 + PADDING_FRAC * 2));
  const left = Math.round((canvasSize - meta.width) / 2);
  const top = Math.round((canvasSize - meta.height) / 2);

  const composited = await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmedBuf, left, top }])
    .png()
    .toBuffer();

  await sharp(composited).resize(OUT_SIZE, OUT_SIZE).png().toFile(outPath);
  console.log(`  -> ${path.basename(outPath)}`);
}

async function processWhiteBg(srcFile, outName) {
  const srcPath = path.join(SRC_DIR, srcFile);
  const { data, info } = await sharp(srcPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const rgba = removeWhiteBackground(data, info.width, info.height, info.channels);
  const rgbaBuf = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  await finalize(rgbaBuf, path.join(OUT_DIR, outName));
}

async function main() {
  console.log("Amigos retro (fondo blanco -> flood-fill):");
  await processWhiteBg("Floppy-o.png", "floppy-o.png");
  await processWhiteBg("Monitor Max.png", "monitor-max.png");
  await processWhiteBg("Forbino Max.png", "forbino-max.png");
  await processWhiteBg("Calc-a-tron.png", "calc-a-tron.png");

  console.log("Action (ya tiene alfa real, solo recortar el cuadrante):");
  const actionSheet = path.join(SRC_DIR, "JCVD no back.png");
  const actionMeta = await sharp(actionSheet).metadata();
  const half = Math.floor(actionMeta.width / 2);
  const cropped = await sharp(actionSheet).extract({ left: 0, top: 0, width: half, height: half }).png().toBuffer();
  await finalize(cropped, path.join(OUT_DIR, "action.png"));

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
