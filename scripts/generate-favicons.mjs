import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SRC_SVG = path.join(PUBLIC_DIR, 'icon.svg');

// Простой ICO-контейнер, оборачивающий PNG-кадры (ICO v3, поддерживается
// всеми современными браузерами и ОС начиная с Windows Vista/IE9).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  pngBuffers.forEach(({ size, buffer }, i) => {
    const entryOffset = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 0);
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2); // color count
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bit count
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
    entries.push(buffer);
  });

  return Buffer.concat([header, ...entries]);
}

async function main() {
  if (!fs.existsSync(SRC_SVG)) {
    throw new Error(`Не найден исходный SVG: ${SRC_SVG}`);
  }

  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map(async (size) => ({
      size,
      buffer: await sharp(SRC_SVG, { density: 384 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    }))
  );

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), buildIco(pngBuffers));

  const appleTouchIcon = await sharp(SRC_SVG, { density: 384 })
    .resize(180, 180, { fit: 'contain', background: { r: 245, g: 240, b: 232, alpha: 1 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), appleTouchIcon);

  console.log('Готово: public/favicon.ico, public/apple-touch-icon.png');
}

main().catch((err) => {
  console.error('Ошибка генерации favicon:', err);
  process.exit(1);
});
