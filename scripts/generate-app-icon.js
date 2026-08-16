// Genera assets/icon.ico (multi-resolución) a partir de assets/app-icon.svg,
// el mismo diseño de Smiley dibujado a mano en renderer-pet/index.html pero
// con el color de severidad fijado en el naranja "normal" para el ícono de
// la app/instalador. Re-correr si se ajusta el diseño del ícono.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico").default;

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const svgPath = path.join(__dirname, "..", "assets", "app-icon.svg");
const icoPath = path.join(__dirname, "..", "assets", "icon.ico");

async function main() {
  const svg = fs.readFileSync(svgPath);
  const pngBuffers = await Promise.all(
    SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer())
  );
  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(icoPath, ico);
  console.log(`Generado ${icoPath} (${SIZES.join(", ")}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
