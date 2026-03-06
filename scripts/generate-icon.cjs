// ============================================
// LoreKeeper Icon Generator
// Generates PNG and ICO icons programmatically
// No external dependencies — pure Node.js
// ============================================

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SIZE = 256;

// === CRC32 (needed for PNG chunks) ===
const CRC = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC[i] = c;
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (~c) >>> 0;
}

// === PNG Encoding ===
function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(pixels, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter: none
    pixels.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// === Drawing Engine ===
const px = Buffer.alloc(SIZE * SIZE * 4, 0);

function blend(x, y, r, g, b, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || a <= 0) return;
  const i = (y * SIZE + x) * 4;
  if (a >= 255) { px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = 255; return; }
  const sa = a / 255, da = px[i+3] / 255, oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  px[i]   = (r * sa + px[i]   * da * (1-sa)) / oa + 0.5 | 0;
  px[i+1] = (g * sa + px[i+1] * da * (1-sa)) / oa + 0.5 | 0;
  px[i+2] = (b * sa + px[i+2] * da * (1-sa)) / oa + 0.5 | 0;
  px[i+3] = oa * 255 + 0.5 | 0;
}

// SDF-based rounded rectangle
function rrect(x0, y0, w, h, rad, r, g, b, a = 255) {
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const hw = w / 2, hh = h / 2;
  for (let y = Math.max(0, y0 - 1); y <= Math.min(SIZE - 1, y0 + h); y++) {
    for (let x = Math.max(0, x0 - 1); x <= Math.min(SIZE - 1, x0 + w); x++) {
      const qx = Math.abs(x - cx) - hw + rad;
      const qy = Math.abs(y - cy) - hh + rad;
      const d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rad;
      if (d < -1) blend(x, y, r, g, b, a);
      else if (d < 1) blend(x, y, r, g, b, Math.round(a * Math.max(0, 0.5 - d * 0.5)));
    }
  }
}

function circle(cx, cy, rad, r, g, b, a = 255) {
  for (let y = Math.max(0, (cy - rad - 2) | 0); y <= Math.min(SIZE - 1, (cy + rad + 2) | 0); y++) {
    for (let x = Math.max(0, (cx - rad - 2) | 0); x <= Math.min(SIZE - 1, (cx + rad + 2) | 0); x++) {
      const d = Math.hypot(x - cx, y - cy) - rad;
      if (d < -1) blend(x, y, r, g, b, a);
      else if (d < 1) blend(x, y, r, g, b, Math.round(a * Math.max(0, 0.5 - d * 0.5)));
    }
  }
}

function rect(x0, y0, w, h, r, g, b, a = 255) {
  for (let y = Math.max(0, y0); y < Math.min(SIZE, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(SIZE, x0 + w); x++)
      blend(x, y, r, g, b, a);
}

// ===================================
// DRAW LOREKEEPER ICON
// ===================================

// 1. Background — dark navy with subtle border
rrect(0, 0, 256, 256, 48, 35, 32, 58);      // border color
rrect(2, 2, 252, 252, 46, 20, 18, 42);      // fill #14122a

// 2. Subtle top ambient light
for (let y = 2; y < 80; y++) {
  const alpha = Math.round(18 * (1 - y / 80));
  for (let x = 50; x < 206; x++) blend(x, y, 70, 60, 110, alpha);
}

// 3. Glow behind book (accent violet)
circle(128, 148, 58, 100, 55, 220, 20);
circle(128, 148, 40, 110, 60, 235, 12);

// 4. Book shadow
rrect(63, 115, 130, 78, 6, 0, 0, 0, 35);

// 5. Left page
rrect(67, 108, 57, 74, 3, 242, 238, 228);
// 6. Right page
rrect(132, 108, 57, 74, 3, 247, 243, 234);

// 7. Page inner shadows (near spine — 3D depth)
for (let y = 109; y < 181; y++) {
  blend(123, y, 200, 195, 180, 40);
  blend(122, y, 215, 210, 195, 20);
  blend(133, y, 200, 195, 180, 40);
  blend(134, y, 215, 210, 195, 20);
}

// 8. Page outer highlights
for (let y = 112; y < 178; y++) {
  blend(68, y, 255, 255, 255, 25);
  blend(188, y, 255, 255, 255, 25);
}

// 9. Spine (accent color — violet #7c3aed)
rect(124, 103, 8, 82, 124, 58, 237);
// spine highlights
for (let y = 105; y < 183; y++) {
  blend(124, y, 155, 90, 255, 40);
  blend(131, y, 90, 40, 200, 30);
}

// 10. Text lines on left page
const lw = [40, 44, 36, 42, 34, 38];
for (let i = 0; i < 6; i++) {
  rect(76, 121 + i * 10, lw[i], 2, 215, 210, 198, 90);
}
// Text lines on right page
for (let i = 0; i < 6; i++) {
  rect(141, 121 + i * 10, lw[5 - i], 2, 215, 210, 198, 90);
}

// 11. Bookmark ribbon (accent red)
rect(160, 108, 5, 40, 220, 60, 70);
// ribbon tail
for (let i = 0; i < 8; i++) {
  blend(160, 148 + i, 220, 60, 70, Math.round(255 * (1 - i / 8)));
  blend(161, 148 + i, 220, 60, 70, Math.round(255 * (1 - i / 8)));
  blend(162, 148 + i, 200, 50, 60, Math.round(255 * (1 - i / 8)));
  blend(163, 148 + i, 200, 50, 60, Math.round(255 * (1 - i / 8)));
  blend(164, 148 + i, 180, 40, 50, Math.round(200 * (1 - i / 8)));
}

// 12. Sparkle / star above book (the "lore" magic)
const sx = 128, sy = 58;

// Soft outer glow
circle(sx, sy, 12, 140, 120, 255, 30);
circle(sx, sy, 7, 170, 150, 255, 70);

// 4-pointed star rays
for (let i = 1; i < 24; i++) {
  const alpha = Math.round(200 * (1 - i / 24));
  const w = Math.max(0, Math.round(2.5 * (1 - i / 24)));
  for (let d = -w; d <= w; d++) {
    const wa = Math.round(alpha * (1 - Math.abs(d) / (w + 1)));
    blend(sx + d, sy - i, 210, 195, 255, wa);  // up
    blend(sx + d, sy + i, 210, 195, 255, wa);  // down
    blend(sx - i, sy + d, 210, 195, 255, wa);  // left
    blend(sx + i, sy + d, 210, 195, 255, wa);  // right
  }
}

// Diagonal rays (shorter)
for (let i = 1; i < 14; i++) {
  const alpha = Math.round(130 * (1 - i / 14));
  blend(sx - i, sy - i, 200, 185, 255, alpha);
  blend(sx + i, sy - i, 200, 185, 255, alpha);
  blend(sx - i, sy + i, 200, 185, 255, alpha);
  blend(sx + i, sy + i, 200, 185, 255, alpha);
}

// Bright center
circle(sx, sy, 4, 220, 210, 255, 200);
circle(sx, sy, 2, 255, 250, 255, 255);

// 13. Small decorative sparkle dots
circle(85, 92, 2, 170, 150, 255, 60);
circle(171, 92, 2, 170, 150, 255, 60);
circle(72, 198, 1.5, 150, 130, 255, 35);
circle(184, 198, 1.5, 150, 130, 255, 35);

// ===================================
// OUTPUT FILES
// ===================================

const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(buildDir, { recursive: true });

const png = encodePng(px, SIZE, SIZE);

// Save PNG
fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png);

// Create ICO (wraps PNG in ICO container for Windows)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);   // reserved
icoHeader.writeUInt16LE(1, 2);   // type = icon
icoHeader.writeUInt16LE(1, 4);   // count = 1

const icoDir = Buffer.alloc(16);
icoDir[0] = 0;                   // width 256 (0 = 256)
icoDir[1] = 0;                   // height 256
icoDir[2] = 0;                   // colors
icoDir[3] = 0;                   // reserved
icoDir.writeUInt16LE(1, 4);      // color planes
icoDir.writeUInt16LE(32, 6);     // bits per pixel
icoDir.writeUInt32LE(png.length, 8);  // image data size
icoDir.writeUInt32LE(22, 12);    // offset (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, icoDir, png]);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

console.log('✅ LoreKeeper icons generated:');
console.log(`   build/icon.png  (${png.length} bytes)`);
console.log(`   build/icon.ico  (${ico.length} bytes)`);
console.log(`   public/icon.png (${png.length} bytes)`);
