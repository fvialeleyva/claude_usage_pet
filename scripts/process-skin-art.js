// Prepara el arte de Franco (JPGs de Gemini con el cuadriculado de
// "transparencia" pintado como píxeles reales, no como canal alfa) para
// usar como skins: recorta cada personaje de la grilla 2x2, le quita el
// fondo a cuadros con flood-fill (solo el fondo CONECTADO al borde — así
// no le come blancos/grises que sean parte del dibujo mismo), recorta al
// contenido, y lo centra en un lienzo cuadrado con margen.
//
// Uso: node scripts/process-skin-art.js

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC_DIR = "C:/Users/f_via/Documents/FV/Job Search 2026/Claude Usage Pet";
const OUT_DIR = path.join(__dirname, "..", "assets", "skins");
const OUT_SIZE = 320;
const PADDING_FRAC = 0.06; // margen alrededor del contenido recortado

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Quita el cuadriculado: junta los colores de fondo de referencia mirando
// una franja del borde, y hace flood-fill desde el borde solo a través de
// píxeles parecidos a esos colores.
function removeCheckerboardBackground(raw, width, height, channels) {
  const THRESHOLD = 42;
  const BORDER_DEPTH = 8;

  // Colores de referencia: muestrear una franja de varios píxeles de
  // profundidad en todo el borde (no solo el filo), y quedarnos con los
  // colores más frecuentes — el cuadriculado alterna 2 tonos de gris/blanco
  // pero con algo de ruido/antialiasing entre celdas.
  const freq = new Map();
  const sample = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * channels;
    const key = `${raw[i]},${raw[i + 1]},${raw[i + 2]}`;
    freq.set(key, (freq.get(key) || 0) + 1);
  };
  for (let d = 0; d < BORDER_DEPTH; d++) {
    for (let x = 0; x < width; x += 2) {
      sample(x, d);
      sample(x, height - 1 - d);
    }
    for (let y = 0; y < height; y += 2) {
      sample(d, y);
      sample(width - 1 - d, y);
    }
  }
  const refColors = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => key.split(",").map(Number));

  const isBgColor = (r, g, b) => refColors.some(([rr, gg, bb]) => colorDist(r, g, b, rr, gg, bb) < THRESHOLD);

  const visited = new Uint8Array(width * height);
  const bg = new Uint8Array(width * height);
  const stack = [];

  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * channels;
    if (!isBgColor(raw[i], raw[i + 1], raw[i + 2])) return;
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

async function extractCharacter(srcPath, cropBox, outPath) {
  const cropped = sharp(srcPath).extract(cropBox);
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });
  const rgba = removeCheckerboardBackground(data, info.width, info.height, info.channels);

  let img = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });

  // Recortar al bounding box del contenido no transparente (sharp.trim()
  // detecta el borde por color; con canal alfa de por medio usa alfa=0).
  img = img.trim({ threshold: 10 });

  const trimmedBuf = await img.png().toBuffer();
  const trimmedMeta = await sharp(trimmedBuf).metadata();

  const contentSize = Math.max(trimmedMeta.width, trimmedMeta.height);
  const canvasSize = Math.round(contentSize * (1 + PADDING_FRAC * 2));
  const left = Math.round((canvasSize - trimmedMeta.width) / 2);
  const top = Math.round((canvasSize - trimmedMeta.height) / 2);

  // Nota: componer sobre un buffer intermedio (no encadenar create().composite().resize()
  // directo) porque esa cadena le erraba al chequeo de dimensiones de sharp acá.
  const composited = await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmedBuf, left, top }])
    .png()
    .toBuffer();

  await sharp(composited).resize(OUT_SIZE, OUT_SIZE).png().toFile(outPath);

  console.log(`  -> ${path.basename(outPath)} (${canvasSize}x${canvasSize} -> ${OUT_SIZE}x${OUT_SIZE})`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const officeSheet = path.join(SRC_DIR, "Gemini_Generated_Image_q8gbpxq8gbpxq8gb.jpg");
  const actionSheet = path.join(SRC_DIR, "Gemini_Generated_Image_x6nbf0x6nbf0x6nb.jpg");
  const mugSource = path.join(SRC_DIR, "Gemini_Generated_Image_dok3xudok3xudok3.jpg");

  // Cuadrantes de 1024x1024, recortando el 78% superior de cada celda de
  // 512px para dejar afuera el texto del nombre debajo de cada personaje.
  const CELL = 512;
  const CROP_H = Math.round(CELL * 0.78);
  const quadrant = (col, row) => ({ left: col * CELL, top: row * CELL, width: CELL, height: CROP_H });

  console.log("Recortando personajes 'retro office'...");
  await extractCharacter(officeSheet, quadrant(0, 0), path.join(OUT_DIR, "floppy-o.png"));
  await extractCharacter(officeSheet, quadrant(1, 0), path.join(OUT_DIR, "monitor-max.png"));
  await extractCharacter(officeSheet, quadrant(0, 1), path.join(OUT_DIR, "forbino-max.png"));
  await extractCharacter(officeSheet, quadrant(1, 1), path.join(OUT_DIR, "calc-a-tron.png"));

  console.log("Recortando Action Man...");
  // Inset extra en top/left para esquivar el marco azul de este sheet.
  await extractCharacter(
    actionSheet,
    { left: 28, top: 28, width: CELL - 28, height: CELL - 28 },
    path.join(OUT_DIR, "action.png")
  );

  console.log("Procesando la taza de café...");
  const mugMeta = await sharp(mugSource).metadata();
  await extractCharacter(
    mugSource,
    { left: 0, top: 0, width: mugMeta.width, height: mugMeta.height },
    path.join(OUT_DIR, "mug.png")
  );

  console.log("Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
