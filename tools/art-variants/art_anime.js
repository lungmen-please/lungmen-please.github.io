'use strict';
// 像素立绘（方向 A：明日方舟立绘风动漫半身像）：大头近景、动漫大眼、发束、毛绒兽耳、战术风衣着。
// 画布 96x80，人物中轴 x=48。光源左上；暗部偏冷紫、亮部偏暖。

const PW = 96, PH = 80;
const OL = [36, 26, 40];
const WHITE = [246, 244, 240];

const SKIN = {
  light: [[248, 222, 204], [226, 184, 172]],
  mid: [[240, 200, 170], [212, 162, 140]],
  tan: [[212, 162, 124], [178, 124, 100]],
  deep: [[156, 108, 84], [122, 80, 70]],
  pale: [[250, 236, 232], [220, 198, 208]],
};
const HAIRS = [[46, 44, 62], [92, 60, 52], [146, 88, 60], [236, 204, 134], [204, 208, 222], [242, 238, 234], [176, 54, 66],
  [226, 132, 76], [66, 82, 134], [236, 164, 188], [80, 156, 156], [132, 128, 142]];
const EYES = [[214, 144, 52], [72, 124, 206], [72, 156, 104], [196, 54, 66], [146, 94, 196], [226, 186, 64], [124, 74, 54]];
const CLOTHES = [[40, 42, 52], [64, 66, 78], [200, 202, 208], [54, 64, 96], [86, 94, 72], [114, 46, 56], [154, 136, 104], [88, 106, 134], [42, 84, 90]];
const HAIR_STYLES = ['short', 'bob', 'long', 'spiky', 'buzz', 'ponytail', 'twin', 'messy', 'short', 'long'];
const TOPS = ['coat', 'hoodie', 'jacket', 'suit', 'uniform'];
const ACCENTS = [[236, 186, 72], [226, 84, 64], [86, 200, 196], [244, 244, 240], [150, 210, 90], [236, 120, 170]];

const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const mir = (pts) => pts.map(([x, y]) => [PW - x, y]);
const nz = (x, y) => (((Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663)) >>> 0) % 1000 / 1000;
const dith = (x, y) => (x + y) % 2 === 0;
const DERIVED = new WeakMap();
function derive(c, key, f) {
  let m = DERIVED.get(c);
  if (!m) DERIVED.set(c, (m = new Map()));
  let r = m.get(key);
  if (r === undefined) m.set(key, (r = f()));
  return r;
}
const COOL = [60, 42, 100], WARM = [255, 238, 206];
const dark = (c, k = 0.74) => derive(c, 'd' + k, () => mix(shade(c, k), COOL, 0.2));
const lite = (c, k = 0.25) => derive(c, 'l' + k, () => mix(c, WARM, k));

class Pix {
  constructor(w = PW, h = PH) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); this.x0 = w; this.y0 = h; this.x1 = -1; this.y1 = -1; }
  set(x, y, col) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.c[y * this.w + x] = col;
    if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y;
  }
  // 包围盒（外扩 pad），限定在画布内
  box(pad = 1) { return [Math.max(0, this.x0 - pad), Math.max(0, this.y0 - pad), Math.min(this.w - 1, this.x1 + pad), Math.min(this.h - 1, this.y1 + pad)]; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x]; }
  // 只在已有像素上改色
  tint(x, y, fn) { const c = this.get(Math.floor(x), Math.floor(y)); if (c) this.set(x, y, fn(c)); }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col); }
  ell(cx, cy, rx, ry, col, clip) {
    if (rx < 0.8 && ry < 0.8) { if (!clip || clip(Math.floor(cx), Math.floor(cy))) this.set(cx, cy, col); return; }
    const fn = typeof col === 'function', w = this.w, c = this.c;
    const ya = Math.max(0, Math.floor(cy - ry)), yb = Math.min(this.h - 1, Math.floor(cy + ry));
    const irx2 = 1 / (rx * rx), iry2 = 1 / (ry * ry);
    for (let y = ya; y <= yb; y++) {
      const dy = y + 0.5 - cy, rem = 1 - dy * dy * iry2;
      if (rem < 0) continue;
      const half = Math.sqrt(rem) * rx;
      const xa = Math.max(0, Math.ceil(cx - half - 0.5)), xb = Math.min(w - 1, Math.floor(cx + half - 0.5));
      if (xa > xb) continue;
      if (xa < this.x0) this.x0 = xa; if (xb > this.x1) this.x1 = xb; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y;
      for (let x = xa; x <= xb; x++) {
        if (clip && !clip(x, y)) continue;
        c[y * w + x] = fn ? col(x, y) : col;
      }
    }
  }
  poly(pts, col) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, typeof col === 'function' ? col(x, y) : col);
      }
    }
  }
  line(x0, y0, x1, y1, col) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + (x1 - x0) * i / n + 0.5, y0 + (y1 - y0) * i / n + 0.5, col);
  }
  tintLine(x0, y0, x1, y1, fn) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.tint(x0 + (x1 - x0) * i / n + 0.5, y0 + (y1 - y0) * i / n + 0.5, fn);
  }
  // 沿二次贝塞尔曲线画一串圆：尾巴、角。cf(t, x, y)
  curve(p0, p1, p2, rf, cf, steps = 90) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
      const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      const r = rf(t);
      const c = cf(t);
      this.ell(x, y, r, r, typeof c === 'function' ? c : c);
    }
  }
  // 自动明暗：右下边缘压暗（depth 像素宽），左上边缘提亮
  autoShade(dk = 0.8, lt = 0.2, depth = 1) {
    const src = this.c.slice(), w = this.w, h = this.h;
    const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? true : src[y * w + x]);
    const [bx0, by0, bx1, by1] = this.box(0);
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const c = src[y * w + x];
        if (!c) continue;
        let sh = false;
        for (let d = 1; d <= depth && !sh; d++) if (!g(x + d, y) || !g(x, y + d) || !g(x + d, y + d)) sh = true;
        if (sh) this.c[y * w + x] = dark(c, dk);
        else if (lt && (!g(x - 1, y) || !g(x, y - 1))) this.c[y * w + x] = lite(c, lt);
      }
    }
  }
  // 描边：col 为 null 时按相邻像素的颜色加深（彩色描边，比纯黑柔和）
  outline(col) {
    const add = [];
    const [bx0, by0, bx1, by1] = this.box(1);
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        if (this.get(x, y)) continue;
        const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1);
        if (n) add.push([x, y, n]);
      }
    }
    for (const [x, y, n] of add) this.set(x, y, col === 'auto' ? mix(shade(n, 0.38), OL, 0.45) : col);
  }
  blit(src) {
    if (src.x1 < 0) return;
    for (let y = src.y0; y <= src.y1; y++) for (let x = src.x0; x <= src.x1; x++) { const c = src.c[y * this.w + x]; if (c) this.set(x, y, c); }
  }
  draw(cv, ox = 0, oy = 0) {
    const ctx = cv.getContext('2d');
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.c[y * this.w + x], X = x + ox, Y = y + oy;
        if (!col || X < 0 || Y < 0 || X >= cv.width || Y >= cv.height) continue;
        const k = (Y * cv.width + X) * 4;
        img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

// 画一个部件：fn 画形状 → 自动明暗 → post 细节 → 描边 → 叠到 M 上
function layer(M, fn, ol = 'auto', sh = [0.78, 0.22, 1], post = null) {
  const L = new Pix(M.w, M.h);
  fn(L);
  if (sh) L.autoShade(sh[0], sh[1], sh[2]);
  if (post) post(L);
  if (ol) L.outline(ol);
  M.blit(L);
  return L;
}

// 脸和眼睛的位置（彩蛋画墨镜、兜帽阴影用）
const FACE = { cx: 48, cy: 36, rx: 13, ry: 15, eyeY: 34, eyeL: [37, 43], eyeR: [52, 58] };

function hashApp(a) {
  const s = `${a.race}|${a.hair}|${a.cloth}|${a.style}|${a.top}|${a.eye}|${a.skin}`;
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 毛边：在形状外缘随机长出 1px 绒毛
function fuzz(L, p = 0.45, seed = 0) {
  const add = [];
  const [x0, y0, x1, y1] = L.box(1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (L.get(x, y)) continue;
      const n = L.get(x - 1, y) || L.get(x + 1, y) || L.get(x, y - 1) || L.get(x, y + 1);
      if (n && nz(x + seed, y * 3 + seed) < p) add.push([x, y, n]);
    }
  }
  for (const [x, y, n] of add) L.set(x, y, n);
}
// 沿曲线画几道毛流（只改已有像素）
function strokes(L, p0, p1, p2, n, off, fn) {
  for (let k = 0; k < n; k++) {
    const o = off[k % off.length];
    for (let i = 4; i < 26; i++) {
      const t = (k * 0.07) + i / 34, u = 1 - t;
      if (t > 0.97) break;
      const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0] + o;
      const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      if ((i + k) % 5 < 3) L.tint(x, y, fn);
    }
  }
}
const qpt = (p0, p1, p2, t) => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; };

// —— 尾巴（身体后面）——
const TAILS = {
  feline: (L, fc) => {
    L.curve([68, 80], [98, 74], [86, 44], (t) => 1.7 - t * 0.3, () => fc);
    L.curve([86, 44], [84, 36], [90, 34], () => 1.4, () => fc);
  },
  lupo: (L, fc) => {
    const p = [[66, 80], [100, 76], [84, 40]];
    L.curve(...p, (t) => 2 + 4.6 * Math.sin(Math.PI * Math.min(1, t * 1.02)), (t) => (t > 0.86 ? dark(fc, 0.7) : fc));
    fuzz(L, 0.55, 3);
  },
  vulpo: (L, fc) => {
    const p = [[62, 80], [104, 78], [80, 28]];
    L.curve(...p, (t) => 3 + 8.2 * Math.sin(Math.PI * t * 0.9), (t) => (t > 0.8 ? WHITE : t > 0.72 ? mix(fc, WHITE, 0.55) : fc));
    fuzz(L, 0.55, 5);
  },
  perro: (L, fc) => { L.curve([70, 80], [88, 78], [89, 62], (t) => 3.2 - t * 1.2, () => fc); fuzz(L, 0.35, 2); },
  zalak: (L, fc) => {
    L.curve([64, 80], [106, 74], [82, 28], (t) => 3 + 5.5 * Math.sin(Math.PI * t), () => fc);
    L.curve([82, 28], [72, 20], [74, 32], () => 3.4, () => fc);
    fuzz(L, 0.55, 7);
  },
  vouivre: (L, fc, a) => {
    const sc = a.scale || [92, 128, 96];
    L.curve([66, 80], [100, 82], [90, 44], (t) => 6.4 * (1 - t) + 1.2, () => sc);
  },
};
const TAIL_POST = {
  lupo: (L, fc) => strokes(L, [66, 80], [100, 76], [84, 40], 3, [-2, 1, 3], (c) => (c === fc ? dark(fc, 0.86) : c)),
  vulpo: (L, fc) => strokes(L, [62, 80], [104, 78], [80, 28], 4, [-3, 0, 3, 5], (c) => (c === fc ? dark(fc, 0.86) : c)),
  zalak: (L, fc) => strokes(L, [64, 80], [106, 74], [82, 28], 3, [-2, 1, 3], (c) => (c === fc ? lite(fc, 0.2) : c)),
  vouivre: (L, fc, a) => {
    const sc = a.scale || [92, 128, 96];
    for (let i = 1; i < 12; i++) {
      const [x, y] = qpt([66, 80], [100, 82], [90, 44], i / 13);
      L.tint(x - 1, y, () => lite(sc, 0.3));
      L.tint(x + 1, y + 1, () => dark(sc, 0.75));
      if (i % 2) { L.set(x - 3, y - 2, dark(sc, 0.6)); }
    }
  },
};

// —— 头上的种族特征 ——
const PINK = [240, 168, 170];
function earPair(L, outer, inner, fc, ic) {
  L.poly(outer, fc); L.poly(mir(outer), fc);
  if (inner) { L.poly(inner, ic); L.poly(mir(inner), ic); }
}
function tufts(L, pts, col) { for (const [x, y] of pts) { L.set(x, y, col); L.set(PW - 1 - x, y, col); } }
const TOPF = {
  feline: (L, fc) => {
    earPair(L, [[31, 25], [30, 12], [32, 2], [38, 8], [44, 18]], [[33.5, 20], [33, 9], [37, 10.5], [41, 17]], fc, PINK);
    tufts(L, [[34, 19], [35, 18], [35, 17], [36, 19], [37, 18]], WHITE);
  },
  lupo: (L, fc) => {
    earPair(L, [[28, 26], [25, 10], [25, 0], [27, 0], [36, 5], [43, 18]], [[30.5, 21], [28, 8], [34, 9], [40, 17]], fc, mix(fc, [70, 56, 80], 0.45));
    tufts(L, [[32, 19], [33, 18], [33, 17], [34, 19], [35, 18], [32, 16]], lite(fc, 0.6));
    for (let y = 0; y < 5; y++) for (let x = 24; x < 33; x++) { L.tint(x, y, (c) => (c === fc ? dark(fc, 0.6) : c)); L.tint(PW - 1 - x, y, (c) => (c === fc ? dark(fc, 0.6) : c)); }
  },
  vulpo: (L, fc) => {
    const lum = fc[0] * 0.3 + fc[1] * 0.59 + fc[2] * 0.11;
    earPair(L, [[28, 28], [24, 12], [21, 0], [33, 4], [44, 17]], [[30.5, 24], [26.5, 10], [24.5, 4], [32, 7.5], [40, 16]], fc, lum > 180 ? [250, 214, 206] : WHITE);
    for (let y = 0; y < 4; y++) for (let x = 21; x < 30; x++) { L.tint(x, y, () => dark(fc, 0.42)); L.tint(PW - 1 - x, y, () => dark(fc, 0.42)); }
    tufts(L, [[29, 21], [30, 19], [31, 20], [32, 18], [33, 19]], mix(WHITE, fc, 0.25));
  },
  cautus: (L, fc) => {
    L.curve([40, 20], [37, 8], [35, 1], (t) => 3.3 - t * 0.5, () => fc);
    L.curve([56, 20], [61, 8], [68, 4], (t) => 3.3 - t * 0.5, () => fc);
    L.curve([40, 18], [37.4, 8], [35.6, 3], () => 1.2, () => PINK);
    L.curve([56, 18], [60.4, 8.6], [66, 5.5], () => 1.2, () => PINK);
  },
  perro: (L, fc) => {
    const e = [[38, 18], [31, 18], [26, 25], [24, 36], [26, 44], [31, 45], [34, 38], [35, 28]];
    const ec = mix(dark(fc, 0.8), [250, 236, 214], 0.12);
    L.poly(e, ec); L.poly(mir(e), ec);
  },
  ursus: (L, fc) => {
    L.ell(34, 17, 5.8, 5.6, fc); L.ell(62, 17, 5.8, 5.6, fc);
    L.ell(34.4, 17.8, 2.8, 2.6, dark(fc, 0.6)); L.ell(61.6, 17.8, 2.8, 2.6, dark(fc, 0.6));
  },
  zalak: (L, fc) => {
    earPair(L, [[34, 24], [33, 13], [36, 9], [43, 19]], [[35.5, 21], [35, 14], [40, 19]], fc, lite(fc, 0.45));
    L.curve([35, 10], [33, 6], [35, 2], (t) => 1.3 - t, () => dark(fc, 0.7));
    L.curve([61, 10], [63, 6], [61, 2], (t) => 1.3 - t, () => dark(fc, 0.7));
  },
  sarkaz: (L) => {
    const hc = [74, 56, 72];
    for (const [p0, p1, p2] of [[[39, 21], [31, 2], [19, 9]], [[57, 21], [65, 2], [77, 9]]]) {
      L.curve(p0, p1, p2, (t) => 3.3 * (1 - t) + 0.7, (t) => (Math.floor(t * 9) % 2 ? hc : dark(hc, 0.8)));
    }
  },
  vouivre: (L) => {
    const hc = [234, 222, 198];
    L.curve([39, 21], [36, 11], [32, 1], (t) => 2.7 * (1 - t) + 0.6, (t) => (t > 0.72 ? [168, 148, 126] : hc));
    L.curve([57, 21], [60, 11], [64, 1], (t) => 2.7 * (1 - t) + 0.6, (t) => (t > 0.72 ? [168, 148, 126] : hc));
  },
  liberi: (L, fc) => {
    const lt = lite(fc, 0.35), dk = dark(fc, 0.82);
    const F = [[[35, 26], [22, 14], [19, 15], [24, 23], [35, 31]], [[35, 30], [18, 25], [17, 28], [23, 32], [35, 35]]];
    const C = [lt, fc, dk];
    F.forEach((f, i) => { L.poly(f, C[i]); L.poly(mir(f), C[i]); });
  },
};
const EARS_UNDER = ['feline', 'lupo', 'vulpo', 'cautus', 'zalak'];
const TOPF_POST = {
  perro: (L, fc) => { for (const [x0, y0, x1, y1] of [[29, 24, 27, 40], [32, 22, 30, 42]]) { L.tintLine(x0, y0, x1, y1, (c) => dark(c, 0.82)); L.tintLine(PW - 1 - x0, y0, PW - 1 - x1, y1, (c) => dark(c, 0.82)); } },
  liberi: (L, fc) => { for (const [a, b] of [[[34, 29], [22, 17]], [[34, 33], [19, 27]]]) { L.tintLine(a[0], a[1], b[0], b[1], (c) => dark(c, 0.7)); L.tintLine(PW - 1 - a[0], a[1], PW - 1 - b[0], b[1], (c) => dark(c, 0.7)); } },
  sarkaz: (L) => { for (const [x, y] of [[36, 15], [35, 13], [33, 8], [31, 6]]) { L.tint(x, y, (c) => lite(c, 0.4)); L.tint(PW - 1 - x, y, (c) => lite(c, 0.4)); } },
};

// —— 光环与翅膀 ——
function halo(L) {
  for (let y = 3; y < 16; y++) {
    for (let x = 32; x < 64; x++) {
      const dx = x + 0.5 - 48, dy = y + 0.5 - 9;
      const o = (dx / 12.5) ** 2 + (dy / 3.4) ** 2, i = (dx / 9.6) ** 2 + (dy / 1.7) ** 2;
      if (o <= 1 && i > 1) L.set(x, y, dy < -0.5 ? [255, 238, 150] : dx > 6 ? [226, 168, 60] : [252, 214, 96]);
    }
  }
}
function haloGlow(M) {
  for (let y = 1; y < 18; y++) {
    for (let x = 28; x < 68; x++) {
      if (M.get(x, y)) continue;
      const dx = x + 0.5 - 48, dy = y + 0.5 - 9, o = (dx / 15.5) ** 2 + (dy / 5.6) ** 2, i = (dx / 8.4) ** 2 + (dy / 1.2) ** 2;
      if (o <= 1 && i > 1 && dith(x, y)) M.set(x, y, [120, 104, 70]);
    }
  }
  for (const [x, y] of [[30, 5], [66, 12]]) { M.set(x, y, [255, 246, 196]); M.set(x - 1, y, [236, 200, 110]); M.set(x + 1, y, [236, 200, 110]); M.set(x, y - 1, [236, 200, 110]); M.set(x, y + 1, [236, 200, 110]); }
}
const WING = [[32, 66], [20, 54], [9, 50], [12, 55], [5, 57], [11, 61], [5, 64], [12, 67], [8, 71], [20, 71], [30, 73]];
function drawWings(L) {
  L.poly(WING, WHITE); L.poly(mir(WING), WHITE);
}
function wingPost(L) {
  const lines = [[[30, 67], [10, 53]], [[30, 69], [8, 60]], [[30, 71], [10, 67]]];
  for (const [a, b] of lines) { L.tintLine(a[0], a[1], b[0], b[1], () => [196, 200, 222]); L.tintLine(PW - 1 - a[0], a[1], PW - 1 - b[0], b[1], () => [196, 200, 222]); }
}

// —— 身体与衣服 ——
const BODY = [[10, 80], [14, 71], [22, 64], [34, 59], [43, 57], [53, 57], [62, 59], [74, 64], [82, 71], [86, 80]];
function drawBody(L, a) {
  const c = a.cloth, h = hashApp(a), A = ACCENTS[h % ACCENTS.length];
  const cd = dark(c, 0.7), cl = lite(c, 0.18), black = [34, 34, 44], shirt = [232, 230, 226];
  L.poly(BODY, c);
  // 手臂与身体的分界
  L.line(23, 66, 20, 80, cd); L.line(73, 66, 76, 80, cd);
  switch (a.top) {
    case 'coat': {
      // 高领风衣：竖起的领子、深色内搭、胸前绑带
      L.poly([[42, 57], [54, 57], [52, 80], [44, 80]], black);
      L.line(48, 58, 48, 80, [70, 70, 84]);
      const col = [[35, 60], [37, 50], [44, 53], [45, 62], [41, 70]];
      L.poly(col, cl); L.poly(mir(col), cl);
      L.poly([[38, 52], [44, 54], [44, 58], [39, 57]], A); L.poly(mir([[38, 52], [44, 54], [44, 58], [39, 57]]), dark(A, 0.8));
      L.line(44, 62, 40, 80, cd); L.line(52, 62, 56, 80, cd);
      L.rect(26, 71, 44, 2, [46, 42, 50]); L.rect(46, 70, 4, 4, [196, 190, 176]); L.set(47, 71, [90, 86, 96]);
      if (h % 2) L.poly([[16, 70], [20, 63], [31, 60], [33, 65], [24, 70]], [92, 96, 110]);
      break;
    }
    case 'hoodie': {
      // 兜帽堆在颈后、抽绳、袖子上的强调色条
      L.poly([[30, 62], [36, 54], [48, 57], [60, 54], [66, 62], [56, 63], [48, 61], [40, 63]], cd);
      L.poly([[38, 58], [48, 60], [58, 58], [56, 62], [48, 63], [40, 62]], dark(c, 0.55));
      L.line(44, 62, 43, 72, shirt); L.line(52, 62, 53, 72, shirt);
      L.rect(42, 72, 2, 2, A); L.rect(53, 72, 2, 2, A);
      L.poly([[14, 74], [18, 68], [21, 69], [17, 76]], A);
      break;
    }
    case 'jacket': {
      // 立领拉链夹克、不对称胸片、臂章
      L.poly([[39, 50], [57, 50], [59, 60], [37, 60]], cl);
      L.line(48, 50, 48, 80, cd);
      L.rect(47, 53, 3, 3, A);
      L.poly([[49, 63], [70, 63], [76, 72], [49, 72]], dark(c, 0.82));
      L.line(49, 72, 76, 72, A);
      L.rect(27, 66, 6, 4, A); L.rect(28, 67, 4, 2, dark(A, 0.7));
      break;
    }
    case 'suit': {
      L.poly([[41, 57], [55, 57], [48, 74]], shirt);
      const lap = [[39, 58], [43, 57], [48, 74], [45, 80], [36, 66]];
      L.poly(lap, cd); L.poly(mir(lap), cd);
      L.poly([[47, 60], [49, 60], [50.5, 70], [48, 74], [45.5, 70]], a.tie || [150, 40, 40]);
      L.rect(47, 59, 2, 2, dark(a.tie || [150, 40, 40], 0.7));
      L.rect(60, 66, 5, 2, A);
      break;
    }
    case 'uniform': {
      // 近卫局式制服：立领、金色肩章与纽扣、斜挎绶带
      const gold = [222, 182, 82];
      L.poly([[40, 52], [56, 52], [57, 60], [39, 60]], cd);
      L.rect(41, 55, 3, 2, gold); L.rect(52, 55, 3, 2, gold);
      L.poly([[16, 70], [22, 63], [33, 60], [32, 64], [22, 68]], gold);
      L.poly(mir([[16, 70], [22, 63], [33, 60], [32, 64], [22, 68]]), gold);
      for (let y = 63; y < 80; y += 5) { L.set(44, y, gold); L.set(52, y, gold); }
      L.poly([[30, 62], [36, 61], [66, 80], [58, 80]], A);
      break;
    }
  }
  if (a.badge) {
    L.poly([[61, 65], [65, 69], [61, 73], [57, 69]], [24, 24, 30]);
    L.poly([[61, 67], [63, 69], [61, 71], [59, 69]], WHITE);
  }
}
function bodyPost(L, a) {
  // 褶皱：几道短斜线
  const c = a.cloth;
  for (const [x0, y0, x1, y1] of [[30, 74], [64, 72], [26, 66]].map(([x, y]) => [x, y, x + 3, y + 3])) L.tintLine(x0, y0, x1, y1, (k) => (k === c ? dark(c, 0.82) : k));
}

// —— 脸 ——
const LASH = [42, 28, 44];
const EYE_T = {
  open: ['...LLL.', '.LLLLLL', 'LDHHDDL', '.DHDDDW', '.DDIIDW', '.IIBBIW', '..IBBI.', '..llll.'],
  angry: ['LLL....', '.LLLLLL', '..LHDDL', '.DHDDDW', '.DDIIDW', '.IIBBIW', '..IBBI.', '..llll.'],
  sad: ['....LLL', '.LLLLL.', 'LDHHDDL', '.DHDDDW', '.DDIIDW', '.IIBBIW', '..IBBI.', '..llll.'],
  shock: ['...LLL.', '.LLLLLL', 'LWWWWWL', '.WWDDWW', '.WDHDWW', '.WWDDWW', '..WWWW.', '..llll.'],
  smile: ['.......', '.......', '...LLL.', '.LL...L', 'L......', '.......', '.......', '.......'],
  closed: ['.......', '.......', '.......', '.......', 'LLLLLLL', '.l...l.', '.......', '.......'],
};
function drawEye(M, right, ec, expr, sk) {
  const t = EYE_T[expr] || EYE_T.open;
  const D = mix(shade(ec, 0.4), LASH, 0.35), B = lite(ec, 0.55), l = mix(sk[0], LASH, 0.35);
  const cols = { L: LASH, D, I: ec, B, H: [255, 255, 255], W: [252, 250, 246], l };
  for (let r = 0; r < t.length; r++) {
    for (let c = 0; c < 7; c++) {
      const ch = t[r][c];
      if (ch === '.') continue;
      M.set(right ? 58 - c : 37 + c, 30 + r, cols[ch]);
    }
  }
}
function drawFace(M, a, sk, expr) {
  drawEye(M, false, a.eye, expr, sk);
  drawEye(M, true, a.eye, expr, sk);
  // 腮红
  const blush = mix(sk[0], [240, 120, 132], 0.24);
  M.rect(37, 39, 4, 1, blush); M.rect(55, 39, 4, 1, blush);
  M.set(49, 42, sk[1]);
  const lip = [168, 84, 92], dk = [104, 46, 60];
  if (expr === 'smile') { M.set(45, 44, lip); M.rect(46, 45, 4, 1, dk); M.set(50, 44, lip); M.rect(47, 46, 2, 1, [232, 130, 136]); }
  else if (expr === 'sad') { M.set(46, 46, lip); M.rect(47, 45, 2, 1, lip); M.set(49, 46, lip); }
  else if (expr === 'angry') { M.rect(46, 45, 4, 1, dk); M.set(45, 46, lip); M.set(50, 46, lip); }
  else if (expr === 'shock') { M.rect(47, 44, 2, 1, lip); M.set(46, 45, lip); M.set(49, 45, lip); M.rect(47, 45, 2, 1, dk); M.rect(47, 46, 2, 1, lip); }
  else { M.rect(47, 45, 2, 1, lip); }
  if (expr === 'shock' || expr === 'sad') { M.set(61, 26, [190, 230, 250]); M.rect(60, 27, 3, 2, [150, 206, 240]); M.set(61, 29, [120, 180, 226]); }
  if (a.glasses) {
    const g = [52, 48, 62], gl = [210, 230, 246];
    for (const x0 of [35, 51]) { M.rect(x0, 29, 10, 1, g); M.rect(x0, 38, 10, 1, g); M.rect(x0, 29, 1, 10, g); M.rect(x0 + 9, 29, 1, 10, g); M.set(x0 + 7, 31, gl); M.set(x0 + 8, 30, gl); }
    M.rect(45, 32, 6, 1, g);
  }
}
function drawBrows(M, a, expr) {
  const bc = dark(a.hair, 0.55);
  const L = expr === 'angry' ? [[37, 25], [38, 25], [39, 26], [40, 26], [41, 27], [42, 27]]
    : expr === 'sad' ? [[37, 27], [38, 27], [39, 26], [40, 26], [41, 25], [42, 25]]
      : expr === 'shock' ? [[37, 25], [38, 24], [39, 24], [40, 24], [41, 24], [42, 25]]
        : [[37, 26], [38, 25], [39, 25], [40, 25], [41, 25], [42, 26]];
  for (const [x, y] of L) { M.set(x, y, bc); M.set(PW - 1 - x, y, bc); }
}

// —— 头发 ——
// 刘海发束：[根x, 根y, 梢x, 梢y, 宽]
const BANGS = {
  a: [[33, 23, 32, 34, 3], [37, 20, 36, 33, 3.6], [41, 19, 41, 35, 3.8], [46, 19, 44, 31, 3.4], [50, 19, 52, 34, 3.6], [55, 20, 57, 33, 3.6], [60, 22, 63, 32, 3.2]],
  b: [[33, 23, 31, 33, 3], [38, 20, 35, 32, 3.6], [43, 19, 39, 34, 3.8], [48, 19, 45, 32, 3.6], [53, 19, 52, 35, 3.8], [58, 21, 59, 33, 3.6], [62, 23, 64, 30, 3]],
  c: [[33, 23, 34, 33, 3], [37, 20, 38, 34, 3.6], [42, 19, 44, 33, 3.6], [47, 19, 50, 35, 3.8], [52, 19, 56, 33, 3.6], [57, 20, 61, 32, 3.4], [61, 23, 64, 29, 3]],
};
const SIDELOCK = { short: 42, spiky: 40, messy: 44, bob: 50, long: 60, ponytail: 46, twin: 48, buzz: 36 };
function strand(L, x0, y0, x1, y1, w, col, bend = 0) {
  L.curve([x0, y0], [(x0 + x1) / 2 + bend, (y0 + y1) / 2], [x1, y1], (t) => w * (1 - t) + 0.35, () => col, 40);
}
function drawBackHair(L, a) {
  const c = a.hair, st = a.style;
  L.ell(48, 29, 17.6, 15.6, c);
  L.ell(48, 34, 16.4, 12, c);
  const hang = (y1, w) => {
    for (const [x0, x1, dy] of [[32, 30, 0], [36, 34, 2], [64, 66, 0], [60, 62, 2]]) strand(L, x0, 28, x1, y1 + dy, w, c);
  };
  if (st === 'long') hang(72, 7);
  if (st === 'bob') hang(51, 6.4);
  if (st === 'twin' || st === 'ponytail' || st === 'short' || st === 'spiky' || st === 'messy') hang(42, 4.2);
  if (st === 'ponytail') { L.curve([60, 20], [86, 28], [76, 66], (t) => 5.2 * (1 - t) + 1.2, () => c); }
  if (st === 'twin') { L.curve([33, 22], [14, 36], [20, 70], (t) => 5 * (1 - t) + 1.4, () => c); L.curve([63, 22], [82, 36], [76, 70], (t) => 5 * (1 - t) + 1.4, () => c); }
}
function drawHair(L, a, hood, hatted) {
  const c = a.hair, st = a.style, h = hashApp(a), sep = dark(c, 0.68);
  if (!hood) {
    L.ell(48, 28, 17, 14.5, c, (x, y) => y <= 25);
    const crown = (EARS_UNDER.includes(a.race) || a.race === 'ursus' || a.race === 'liberi' || a.race === 'sankta') ? [[44, 16, 42, 11, 2.6], [52, 16, 54, 11, 2.6]]
      : [[36, 20, 31, 13, 3.2], [42, 16, 39, 9, 3], [55, 16, 58, 10, 3], [60, 20, 65, 14, 3.2], [48, 15, 47, 11, 2.6]];
    if (!hatted) for (const [x0, y0, x1, y1, w] of crown) strand(L, x0, y0, x1, y1, w, c);
  }
  // 侧发（在刘海下层）
  const sl = SIDELOCK[st] || 42;
  if (!hood) {
    strand(L, 33, 22, 32, sl, 3.8, sep, -1); strand(L, 32, 22, 31, sl - 1, 3.4, c, -1);
    strand(L, 63, 22, 64, sl, 3.8, sep, 1); strand(L, 64, 22, 65, sl - 1, 3.4, c, 1);
    if (st === 'long' || st === 'bob') { strand(L, 35, 26, 34, sl - 4, 3, c); strand(L, 61, 26, 62, sl - 4, 3, c); }
  }
  const set0 = BANGS[['a', 'b', 'c'][h % 3]];
  const set = st === 'buzz' ? set0.map(([x0, y0, x1, y1, w]) => [x0, y0, (x0 + x1) / 2, y1 - 6, w * 0.9]) : set0;
  for (const [x0, y0, x1, y1, w] of set) strand(L, x0 + 1, y0, x1 + 1, y1, w, sep);
  for (const [x0, y0, x1, y1, w] of set) strand(L, x0, y0, x1, y1, w, c);
  if ((st === 'spiky' || st === 'messy') && !hatted && a.race !== 'liberi') {
    for (const [x0, y0, x1, y1] of [[38, 20, 30, 12], [44, 17, 40, 8], [52, 17, 56, 8], [58, 20, 66, 13]]) strand(L, x0, y0, x1, y1, 3.4, c);
  }
  // 呆毛
  if (!hatted && (st === 'messy' || h % 4 === 0)) L.curve([50, 15], [52, 7], [57, 6], (t) => 1.1 - t * 0.6, () => c, 30);
}
function hairPost(L, a, hood) {
  const c = a.hair, hl = lite(c, 0.45), hl2 = lite(c, 0.25);
  // 天使环高光
  // 天使环：沿头顶弧线的断续高光，左亮右暗
  for (let x = 34; x < 60; x++) {
    const y = Math.round(27 - 8.5 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 46) / 14) ** 2)));
    const seg = Math.floor((x - 34) / 3);
    if (seg % 3 === 2) continue;
    const col = x < 50 ? hl : hl2;
    if (L.get(x, y) === c) L.set(x, y, col);
    if (x < 46 && seg % 3 === 0 && L.get(x, y + 1) === c) L.set(x, y + 1, hl2);
  }
  if (hood) return;
}
function drawHairTies(L, a, A) {
  if (a.style === 'ponytail') L.rect(61, 20, 3, 3, A);
  if (a.style === 'twin') { L.rect(31, 22, 3, 3, A); L.rect(62, 22, 3, 3, A); }
}

// —— 帽子 ——
function drawHat(L, a, A) {
  const c = a.hatColor || [60, 60, 70], cd = dark(c, 0.72);
  if (a.hat === 'cap') {
    L.ell(48, 27, 17.8, 13.5, c, (x, y) => y <= 24);
    L.poly([[29, 24], [67, 24], [71, 28], [25, 28]], cd);
    L.rect(44, 16, 8, 5, A); L.rect(45, 17, 6, 3, dark(A, 0.75));
  } else if (a.hat === 'beanie') {
    L.ell(48, 26, 18.4, 15.5, c, (x, y) => y <= 26);
    L.rect(30, 22, 36, 6, cd);
    for (let x = 31; x < 66; x += 2) L.line(x, 22, x, 27, dark(c, 0.6));
    L.ell(48, 9, 3.6, 3.4, lite(c, 0.25));
  } else if (a.hat === 'hood') {
    const open = (x, y) => ((x + 0.5 - 48) / 13.8) ** 2 + ((y + 0.5 - 37) / 16.5) ** 2 <= 1 || (y > 44 && Math.abs(x + 0.5 - 48) < 11);
    L.ell(48, 33, 21.5, 23, c, (x, y) => y <= 58 && !open(x, y));
    L.poly([[40, 12], [48, 6], [56, 12]], c);
    for (let y = 14; y < 58; y++) for (let x = 26; x < 70; x++) if (L.get(x, y) && (open(x - 1, y) || open(x + 1, y) || open(x, y + 1))) L.set(x, y, cd);
    L.line(40, 54, 38, 64, [226, 222, 214]); L.line(56, 54, 58, 64, [226, 222, 214]);
    L.rect(37, 64, 2, 2, A); L.rect(57, 64, 2, 2, A);
  }
}
function hoodBack(L, a) { L.ell(48, 33, 22, 23.5, dark(a.hatColor || [60, 60, 70], 0.7)); }

// —— 主函数 ——
function drawPerson(a, o = {}) {
  const M = new Pix();
  const R = a.race, expr = o.expr || 'neutral';
  const hat = a.hat && !o.hatOff ? a.hat : null;
  const sk = SKIN[a.skin] || SKIN.light;
  const fc = a.feat || a.hair;
  const A = ACCENTS[hashApp(a) % ACCENTS.length];

  if (TAILS[R]) layer(M, (L) => TAILS[R](L, fc, a), 'auto', [0.74, 0.24, 1], TAIL_POST[R] ? (L) => TAIL_POST[R](L, fc, a) : null);
  if (R === 'sankta') layer(M, drawWings, 'auto', [0.86, 0, 1], wingPost);
  if (hat === 'hood') layer(M, (L) => hoodBack(L, a), 'auto', null);
  else layer(M, (L) => drawBackHair(L, a), 'auto', [0.72, 0.18, 1]);
  layer(M, (L) => { L.rect(44, 44, 8, 16, sk[0]); }, 'auto', null, (L) => { for (let y = 44; y < 52; y++) for (let x = 44; x < 52; x++) L.set(x, y, sk[1]); L.rect(50, 52, 2, 8, sk[1]); });
  layer(M, (L) => drawBody(L, a), 'auto', [0.74, 0.2, 1], (L) => bodyPost(L, a));
  if (hat !== 'hood') {
    if (R === 'sarkaz') layer(M, (L) => { const e = [[36, 33], [23, 27], [27, 31], [36, 40]]; L.poly(e, sk[0]); L.poly(mir(e), sk[0]); }, 'auto', [0.86, 0.15, 1]);
    else if (R === 'sankta' || R === 'vouivre') layer(M, (L) => { L.ell(34.4, 37, 2.4, 3.4, sk[0]); L.ell(61.6, 37, 2.4, 3.4, sk[0]); }, 'auto', [0.86, 0, 1]);
  }
  layer(M, (L) => {
    L.ell(48, 35, 13.2, 14, sk[0]);
    L.poly([[35.4, 38], [37.6, 45], [42.6, 49.6], [48, 51.2], [53.4, 49.6], [58.4, 45], [60.6, 38]], sk[0]);
  }, 'auto', null, (L) => {
    for (let y = 20; y < 52; y++) {
      for (let x = 34; x < 63; x++) {
        const k = L.get(x, y);
        if (!k) continue;
        const e = ((x + 0.5 - 48) / 13.2) ** 2 + ((y + 0.5 - 35) / 14) ** 2;
        if (y <= 28 || (x >= 50 && e > 0.8) || (y >= 48 && x >= 49)) L.set(x, y, sk[1]);
      }
    }
  });
  drawFace(M, a, sk, expr);
  const early = !hat && TOPF[R] && EARS_UNDER.includes(R);
  if (early) layer(M, (L) => TOPF[R](L, fc), 'auto', [0.74, 0.22, 1], TOPF_POST[R] ? (L) => TOPF_POST[R](L, fc) : null);
  layer(M, (L) => drawHair(L, a, hat === 'hood', !!hat), 'auto', [0.74, 0.16, 1], (L) => hairPost(L, a, hat === 'hood'));
  drawBrows(M, a, expr);
  if (!hat && !early && TOPF[R]) layer(M, (L) => TOPF[R](L, fc), 'auto', [0.74, 0.22, 1], TOPF_POST[R] ? (L) => TOPF_POST[R](L, fc) : null);
  layer(M, (L) => drawHairTies(L, a, A), 'auto', null);
  if (a.acc === 'catband') {
    layer(M, (L) => {
      const k = [28, 26, 34];
      L.ell(48, 30, 17.6, 13.4, k, (x, y) => y <= 25 && ((x + 0.5 - 48) / 17.6) ** 2 + ((y + 0.5 - 30) / 13.4) ** 2 >= 0.8);
      earPair(L, [[34, 22], [35, 10], [43, 18]], [[36, 19], [36.5, 14], [40.5, 18]], k, [230, 120, 150]);
    }, 'auto', null, (L) => { L.set(36, 13, [200, 200, 220]); L.set(59, 13, [200, 200, 220]); L.set(40, 18, [150, 150, 170]); });
  }
  if (hat) layer(M, (L) => drawHat(L, a, A), 'auto', [0.74, 0.2, 1]);
  if (a.acc === 'scarf') {
    layer(M, (L) => {
      L.poly([[36, 50], [60, 50], [62, 58], [34, 58]], WHITE);
      L.poly([[51, 56], [58, 56], [59, 74], [52, 74]], WHITE);
    }, 'auto', [0.86, 0.1, 1], (L) => {
      L.tintLine(38, 53, 58, 53, () => [214, 212, 220]); L.tintLine(54, 60, 55, 72, () => [214, 212, 220]);
      for (let x = 52; x < 59; x += 2) L.set(x, 75, [226, 224, 230]);
    });
  }
  if (R === 'sankta') { layer(M, halo, 'auto', null); haloGlow(M); }
  return M;
}

// 源石探测视图：人变成青色剪影，身上的源石和可疑物品发光
const SCAN_BOX = {
  contraband: [16, 63, 19, 16], reunion: [54, 62, 15, 13], coins: [70, 71, 9, 8], phone: [37, 66, 7, 11], keys: [71, 62, 8, 8],
};
const CRYSTAL_SPOTS = [[47, 55], [40, 62], [58, 63], [30, 70], [66, 73], [50, 71], [24, 76], [74, 68]];

function drawScan(person, t) {
  const S = new Pix();
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (!person.get(x, y)) continue;
      const edge = !person.get(x - 1, y) || !person.get(x + 1, y) || !person.get(x, y - 1) || !person.get(x, y + 1);
      S.set(x, y, edge ? [110, 220, 214] : y % 3 === 0 ? [36, 96, 102] : ((x + y) % 4 === 0 ? [40, 104, 110] : [28, 78, 86]));
    }
  }
  const glow = (x, y, r) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r || !dith(x + i, y + j)) continue;
      const c = S.get(x + i, y + j);
      if (c) S.set(x + i, y + j, mix(c, [255, 160, 70], 0.4));
    }
  };
  const gem = (x, y, s = 1) => {
    glow(x, y, 5);
    S.poly([[x, y - 3 * s], [x + 2.2 * s, y], [x, y + 3 * s], [x - 2.2 * s, y]], [255, 168, 60]);
    S.poly([[x, y - 3 * s], [x + 2.2 * s, y], [x, y]], [255, 206, 120]);
    S.set(x, y, [255, 240, 200]);
  };
  for (const [x, y] of t.crystals) gem(x, y, 1.1);
  for (const it of t.items) {
    const [x, y, w, h] = SCAN_BOX[it];
    if (it === 'contraband') {
      S.rect(x, y, w, h, [24, 60, 66]);
      S.rect(x, y, w, 1, [140, 230, 230]); S.rect(x, y + h - 1, w, 1, [140, 230, 230]);
      S.rect(x, y, 1, h, [140, 230, 230]); S.rect(x + w - 1, y, 1, h, [140, 230, 230]);
      S.rect(x + 7, y - 2, 6, 2, [140, 230, 230]);
      gem(x + 5, y + 6); gem(x + 11, y + 9); gem(x + 15, y + 5); gem(x + 8, y + 11, 0.8);
    } else if (it === 'reunion') {
      S.ell(x + 7.5, y + 6.5, 7, 6, [236, 236, 236]);
      S.ell(x + 7.5, y + 6.5, 7, 6, [200, 200, 204], (px, py) => px > x + 10);
      S.rect(x + 3, y + 5, 3, 2, [30, 30, 30]); S.rect(x + 9, y + 5, 3, 2, [30, 30, 30]);
      S.rect(x + 5, y + 9, 5, 1, [180, 60, 50]);
      S.line(x + 2, y + 3, x + 5, y + 4, [180, 60, 50]);
    } else if (it === 'coins') {
      S.ell(x + 3, y + 3, 2.5, 2.5, [170, 230, 230]); S.ell(x + 6, y + 5, 2.5, 2.5, [150, 210, 210]);
      S.set(x + 6, y + 5, [90, 160, 160]);
    } else if (it === 'phone') {
      S.rect(x, y, w, h, [150, 220, 220]); S.rect(x + 1, y + 1, w - 2, h - 3, [60, 120, 130]);
      S.set(x + 3, y + h - 1, [60, 120, 130]);
    } else if (it === 'keys') {
      S.ell(x + 2, y + 2, 2, 2, [170, 230, 230]); S.set(x + 2, y + 2, [28, 78, 86]);
      S.rect(x + 3, y + 3, 5, 1, [170, 230, 230]); S.rect(x + 6, y + 4, 1, 2, [170, 230, 230]);
    }
  }
  return S;
}
