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

// The mark in unit space: returns 1 if (u,v) is inside ink.
// Ring centre slightly up-left; three queue dots trail to bottom-right.
function markCoverage(u, v) {
  const cx = 0.44, cy = 0.42, rOut = 0.30, rIn = 0.185;
  const dx = u - cx, dy = v - cy, d = Math.hypot(dx, dy);
  if (d <= rOut && d >= rIn) {
    // notch: open the ring where the tail leaves (45°), between the ring and dot 1
    const ang = Math.atan2(dy, dx); // -PI..PI, 45° = PI/4
    if (Math.abs(ang - Math.PI / 4) < 0.16) return 0;
    return 1;
  }
  const dots = [
    [0.700, 0.680, 0.082],
    [0.812, 0.792, 0.062],
    [0.902, 0.882, 0.047]
  ];
  for (const [x, y, r] of dots) if (Math.hypot(u - x, v - y) <= r) return 1;
  return 0;
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
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && markCoverage(u, v)) {
        buf[i] = markColor[0]; buf[i + 1] = markColor[1]; buf[i + 2] = markColor[2]; buf[i + 3] = 255;
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
  ["apps/mobile/assets/android-icon-monochrome.png", { size: 1024, bg: null, markScale: 0.58 }],
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
