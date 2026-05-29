/**
 * Convierte el fondo oscuro neutro de public/firma_transparente.png en transparencia.
 * Ejecutar desde la raíz del proyecto: node scripts/knockout-firma-bg.cjs
 */
const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../public/firma_transparente.png");

(async () => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    console.error("Se esperaba RGBA");
    process.exit(1);
  }
  const buf = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Fondo negro/gris: poca saturación y oscuro. La firma roja tiene saturación alta.
      if (sat < 0.28 && lum < 58) {
        buf[i + 3] = 0;
      }
    }
  }
  await sharp(buf, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(input);
  console.log("OK:", input);
})();
