// Marcadores de posición para los 3 skins de imagen (Retro Office Assistant,
// Action Man, Coffee Mug). Franco los va a reemplazar con su propio arte —
// mismo nombre de archivo, mismo tamaño ideal (cuadrado, fondo transparente)
// y no hace falta tocar código para que aparezcan.

const path = require("path");
const { writePlaceholderSkin } = require("./lib/simple-png");

const outDir = path.join(__dirname, "..", "assets", "skins");
const SIZE = 300;

writePlaceholderSkin(path.join(outDir, "office.png"), SIZE, [122, 92, 58]); // marrón "oficina"
writePlaceholderSkin(path.join(outDir, "action.png"), SIZE, [58, 58, 58]); // gris oscuro "acción"
writePlaceholderSkin(path.join(outDir, "mug.png"), SIZE, [180, 110, 60]); // marrón café

console.log("Placeholders generados en assets/skins/{office,action,mug}.png");
