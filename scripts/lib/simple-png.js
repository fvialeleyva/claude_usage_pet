// Generador de PNG mínimo, sin dependencias (mismo enfoque que
// generate-icon.js). Se usa para marcadores de posición: círculo de color +
// dos ojitos, para que se distinga a simple vista de qué skin es cada uno
// mientras Franco no pisa estos archivos con su propio arte.

const fs = require("fs");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(size, setPixel) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = setPixel(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA

  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function writePlaceholderSkin(filePath, size, [r, g, b]) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - size * 0.03;
  const eyeR = size * 0.045;
  const eyeY = cy - size * 0.06;
  const eyeDx = size * 0.14;

  const png = encodePng(size, (x, y) => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const dist2 = dx * dx + dy * dy;

    if (dist2 > radius * radius) return [0, 0, 0, 0];

    for (const ex of [cx - eyeDx, cx + eyeDx]) {
      const edx = x + 0.5 - ex;
      const edy = y + 0.5 - eyeY;
      if (edx * edx + edy * edy <= eyeR * eyeR) return [20, 20, 20, 255];
    }

    return [r, g, b, 255];
  });

  fs.writeFileSync(filePath, png);
}

module.exports = { writePlaceholderSkin };
