#!/usr/bin/env node

// Zero-dependency PNG icon generator for the Q-App PWA.
// Produces solid-background square icons with a bold "Q" glyph, at any size.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT_DIR = path.resolve("apps/web/public/icons");
const BACKGROUND = [16, 24, 40, 255];   // #101828 — Q-App dark navy
const FOREGROUND = [244, 235, 208, 255]; // #F4EBD0 — warm cream
const MASKABLE_PAD_RATIO = 0.1;         // safe zone padding for maskable icons

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // no filter
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function setPixel(pixels, size, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  pixels[i] = rgba[0];
  pixels[i + 1] = rgba[1];
  pixels[i + 2] = rgba[2];
  pixels[i + 3] = rgba[3];
}

// Anti-aliased-ish filled circle (or ring, if strokeWidth > 0).
function drawRing(pixels, size, cx, cy, outerR, innerR, colour) {
  const r2Outer = outerR * outerR;
  const r2Inner = innerR * innerR;
  for (let y = Math.floor(cy - outerR); y <= Math.ceil(cy + outerR); y += 1) {
    for (let x = Math.floor(cx - outerR); x <= Math.ceil(cx + outerR); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2Outer && d2 >= r2Inner) setPixel(pixels, size, x, y, colour);
    }
  }
}

// Rounded rectangle background (fills entire canvas with rounded corners).
function drawRoundedBackground(pixels, size, radius, colour) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = Math.min(x, size - 1 - x);
      const ny = Math.min(y, size - 1 - y);
      let inside = true;
      if (nx < radius && ny < radius) {
        const dx = radius - nx;
        const dy = radius - ny;
        inside = dx * dx + dy * dy <= radius * radius;
      }
      if (inside) setPixel(pixels, size, x, y, colour);
    }
  }
}

// Thick angled line for the Q tail.
function drawLine(pixels, size, x0, y0, x1, y1, thickness, colour) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  const steps = Math.ceil(length * 2);
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    const r = thickness / 2;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
        const ex = x + 0.5 - cx;
        const ey = y + 0.5 - cy;
        if (ex * ex + ey * ey <= r2) setPixel(pixels, size, x, y, colour);
      }
    }
  }
}

function renderIcon(size, { maskable }) {
  const pixels = Buffer.alloc(size * size * 4, 0);

  const corner = maskable ? 0 : size * 0.22;
  drawRoundedBackground(pixels, size, corner, BACKGROUND);

  const pad = maskable ? size * MASKABLE_PAD_RATIO : 0;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.34 - pad * 0.5;
  const innerR = outerR * 0.66;

  drawRing(pixels, size, cx, cy, outerR, innerR, FOREGROUND);

  const tailStartX = cx + outerR * 0.35;
  const tailStartY = cy + outerR * 0.35;
  const tailEndX = cx + outerR * 0.95;
  const tailEndY = cy + outerR * 0.95;
  drawLine(pixels, size, tailStartX, tailStartY, tailEndX, tailEndY, size * 0.09, FOREGROUND);

  return encodePng(size, size, pixels);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = [
    { file: "icon-192.png", size: 192, maskable: false },
    { file: "icon-512.png", size: 512, maskable: false },
    { file: "icon-maskable-512.png", size: 512, maskable: true },
    { file: "apple-touch-icon.png", size: 180, maskable: false }
  ];

  for (const target of targets) {
    const buffer = renderIcon(target.size, { maskable: target.maskable });
    const outPath = path.join(OUT_DIR, target.file);
    fs.writeFileSync(outPath, buffer);
    console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
  }
}

main();
