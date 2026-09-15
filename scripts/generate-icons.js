import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Creates a valid PNG file in pure Node.js using built-in zlib
 */
function createPng(width, height, drawPixel) {
  // 1. Uncompressed scanlines (filter byte 0 per line + width * 4 RGBA bytes)
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = lineOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // 2. Compress image data
  const compressed = zlib.deflateSync(rawData);

  // 3. Helper to build PNG chunks with CRC32
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crcVal = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);

    return Buffer.concat([len, body, crcBuf]);
  }

  // CRC32 implementation
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return crc ^ 0xffffffff;
  }

  // Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Draws the WriteTex icon: violet rounded background with a golden/white sparkling star
 */
function drawWriteTexIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;

  // Normalized distance from center
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background circle / rounded squircle
  if (dist > r) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Star shape: 4-pointed star
  // Star equation: (|dx| / sx)^0.6 + (|dy| / sy)^0.6 <= 1
  const starRadius = w * 0.35;
  const ndx = Math.abs(dx) / starRadius;
  const ndy = Math.abs(dy) / starRadius;
  const starDist = Math.pow(ndx, 0.55) + Math.pow(ndy, 0.55);

  if (starDist <= 1.0) {
    // White/gold star with soft center glow
    const glow = Math.max(0, 1 - starDist);
    return [255, 255, 255, 255];
  }

  // Gradient background from violet (#7c5cfc) to purple (#9b82fd)
  const grad = (x + y) / (w + h);
  const red = Math.round(124 + grad * 31);
  const green = Math.round(92 + grad * 38);
  const blue = Math.round(252 + grad * 1);

  return [red, green, blue, 255];
}

const iconsDir = path.resolve(process.cwd(), 'public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const pngBuf = createPng(size, size, drawWriteTexIcon);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated icon: ${filePath} (${size}x${size}, ${pngBuf.length} bytes)`);
}
