#!/usr/bin/env node
// OnQ brand asset generator — zero dependencies.
// Mark: a bold Q whose tail is a queue of dots leaving the ring.
// Rendered 2x supersampled, box-downsampled for smooth edges.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const t = Buffer.from(type, "ascii"), l = Buffer.alloc(4), c = Buffer.alloc(4);
  l.writeUInt32BE(data.length, 0); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, c]);
}
function encodePng(w, h, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---- palette ----
const BLUE_TOP = [107, 144, 181];   // #6B90B5
const BLUE_BOT = [71, 104, 141];    // #47688D
const WHITE = [255, 255, 255];

// OnQ mark: a Q built as a clock — the ring is the Q, the notch at 5 o'clock
// is where the tail leaves, and the hands say "the time you get back".
// Amber hour hand + tail dot tie it to the app's "your turn" accent.
const TAU = Math.PI * 2;
const AMBER = [230, 168, 74];

function capsule(u, v, x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
  let t = L2 ? ((u - x1) * dx + (v - y1) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(u - (x1 + dx * t), v - (y1 + dy * t)) <= r;
}

// Returns null (background) or an [r,g,b] ink colour.
function markInk(u, v) {
  const cx = 0.47, cy = 0.455, ro = 0.325, ri = 0.223;
  const d = Math.hypot(u - cx, v - cy);

  // Tail first: a true Q tail crosses the bowl, so it starts inside the ring
  // and runs out past it. (Detaching it made the mark read as a magnifier.)
  const t1 = 0.150, t2 = 0.430, k = Math.SQRT1_2;
  if (capsule(u, v, cx + t1 * k, cy + t1 * k, cx + t2 * k, cy + t2 * k, 0.050)) return WHITE;
  // Trailing dot: "the queue keeps moving". Clear of the tail so it reads as its own mark.
  if (Math.hypot(u - (cx + 0.552 * k), v - (cy + 0.552 * k)) <= 0.046) return AMBER;

  // Closed ring = unmistakable bowl.
  if (d <= ro && d >= ri) return WHITE;

  // Hands sit at 2 o'clock so they never collide with the tail.
  if (capsule(u, v, cx, cy, cx, cy - 0.148, 0.029)) return WHITE;          // minute
  if (capsule(u, v, cx, cy, cx + 0.082, cy - 0.072, 0.029)) return AMBER;  // hour
  if (d <= 0.034) return WHITE;                                           // pivot cap

  return null;
}

// Render one asset. opts: size, bg: "gradient"|"flat"|null(transparent), markScale, markColor
function render({ size, bg, markScale = 1, markColor = WHITE, flatColor = null }) {
  const S = size * 2; // supersample
  const buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    let bgc = null;
    if (bg === "gradient") bgc = [
      Math.round(BLUE_TOP[0] + (BLUE_BOT[0] - BLUE_TOP[0]) * t),
      Math.round(BLUE_TOP[1] + (BLUE_BOT[1] - BLUE_TOP[1]) * t),
      Math.round(BLUE_TOP[2] + (BLUE_BOT[2] - BLUE_TOP[2]) * t)
    ];
    if (bg === "flat") bgc = flatColor;
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (bgc) { buf[i] = bgc[0]; buf[i + 1] = bgc[1]; buf[i + 2] = bgc[2]; buf[i + 3] = 255; }
      // map into mark space (centered square, optional scale)
      const u = ((x + 0.5) / S - 0.5) / markScale + 0.5;
      const v = ((y + 0.5) / S - 0.5) / markScale + 0.5;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const ink = markInk(u, v);
        if (ink) {
          const c = markColor === WHITE ? ink : markColor; // mono variants force one colour
          buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
        }
      }
    }
  }
  // box downsample 2x
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = (y * size + x) * 4;
    for (let c = 0; c < 4; c++) {
      const a = buf[((2 * y) * S + 2 * x) * 4 + c], b = buf[((2 * y) * S + 2 * x + 1) * 4 + c],
            d = buf[((2 * y + 1) * S + 2 * x) * 4 + c], e = buf[((2 * y + 1) * S + 2 * x + 1) * 4 + c];
      out[o + c] = Math.round((a + b + d + e) / 4);
    }
  }
  return encodePng(size, size, out);
}

const jobs = [
  // native app
  ["apps/mobile/assets/icon.png",                    { size: 1024, bg: "gradient", markScale: 0.86 }],
  ["apps/mobile/assets/adaptive-icon.png",           { size: 1024, bg: null, markScale: 0.58 }],
  ["apps/mobile/assets/android-icon-foreground.png", { size: 1024, bg: null, markScale: 0.58 }],
  ["apps/mobile/assets/android-icon-monochrome.png", { size: 1024, bg: null, markScale: 0.58, markColor: [255, 255, 255] }],
  ["apps/mobile/assets/android-icon-background.png", { size: 1024, bg: "gradient" }],
  ["apps/mobile/assets/splash-icon.png",             { size: 1200, bg: null, markScale: 0.60 }],
  ["apps/mobile/assets/favicon.png",                 { size: 196,  bg: "gradient", markScale: 0.86 }],
  // web PWA
  ["apps/web/public/icons/icon-192.png",             { size: 192,  bg: "gradient", markScale: 0.86 }],
  ["apps/web/public/icons/icon-512.png",             { size: 512,  bg: "gradient", markScale: 0.86 }],
  ["apps/web/public/icons/icon-maskable-512.png",    { size: 512,  bg: "gradient", markScale: 0.55 }],
  ["apps/web/public/icons/apple-touch-icon.png",     { size: 180,  bg: "gradient", markScale: 0.86 }]
];

for (const [rel, opts] of jobs) {
  const p = path.resolve(rel);
  fs.writeFileSync(p, render(opts));
  console.log("wrote", rel, `${opts.size}px`);
}
