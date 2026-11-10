'use strict';
// 像素立绘：逐像素画出旅客半身像（耳朵、尾巴、角、光环、翅膀……），以及源石探测视图。
// 画布 96x80，人物中轴 x=48。光源在左上方：每个部件自动加右下暗面、左上亮边，描边按部件颜色加深。

const PW = 96, PH = 80;
const OL = [34, 26, 28];
const WHITE = [244, 242, 236];

const SKIN = {
  light: [[240, 208, 182], [214, 172, 146]],
  mid: [[224, 180, 144], [192, 146, 112]],
  tan: [[194, 144, 104], [162, 114, 82]],
  deep: [[146, 100, 74], [116, 78, 58]],
  pale: [[242, 226, 218], [214, 192, 186]],
};
const HAIRS = [[40, 36, 42], [96, 62, 40], [134, 80, 46], [222, 190, 112], [196, 198, 208], [236, 234, 228], [172, 62, 52],
  [208, 122, 62], [62, 72, 112], [222, 152, 172], [72, 142, 140], [122, 120, 126]];
const EYES = [[64, 42, 32], [52, 92, 152], [60, 130, 82], [172, 62, 62], [204, 152, 42], [122, 72, 162]];
const CLOTHES = [[70, 80, 102], [112, 60, 52], [60, 92, 72], [92, 92, 94], [42, 46, 54], [142, 122, 92], [150, 152, 162], [82, 62, 92], [168, 132, 60]];
const HAIR_STYLES = ['short', 'bob', 'long', 'spiky', 'buzz', 'ponytail', 'twin', 'messy', 'short', 'long'];
const TOPS = ['coat', 'hoodie', 'jacket', 'suit', 'uniform'];

const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const mir = (pts) => pts.map(([x, y]) => [PW - x, y]);
// 坐标噪声：同一位置永远同一个值，画面不闪
const nz = (x, y) => (((Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663)) >>> 0) % 1000 / 1000;
const dith = (x, y) => (x + y) % 2 === 0;
const BAYER = [0.1, 0.6, 0.85, 0.35];
// 冷色暗部：比单纯压暗更有体积感
// 同一颜色对象的派生色缓存起来（颜色数组都是共享引用），省掉大量重复计算
const DERIVED = new WeakMap();
function derive(c, key, f) {
  let m = DERIVED.get(c);
  if (!m) DERIVED.set(c, (m = new Map()));
  let r = m.get(key);
  if (!r) m.set(key, (r = f()));
  return r;
}
const dark = (c, k = 0.78) => derive(c, k, () => mix(shade(c, k), [52, 48, 84], 0.12));
const lite = (c, k = 0.22) => derive(c, -k, () => mix(c, [255, 250, 236], k));

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

// 画一个部件：fn 画形状 → 可选 post（自动明暗后再加细节）→ 描边 → 叠到 M 上。返回该部件图层。
function layer(M, fn, ol = 'auto', sh = [0.8, 0.2, 1], post = null) {
  const L = new Pix(M.w, M.h);
  fn(L);
  if (sh) L.autoShade(sh[0], sh[1], sh[2]);
  if (post) post(L);
  if (ol) L.outline(ol);
  M.blit(L);
  return L;
}

// ———————————————————— 方向 C：3/4 侧身 + 戏剧光 ————————————————————
// 人物略微侧身朝左（朝向窗口外的审查员），主光从左上方来（暖），右侧是冷色暗部和蓝色轮廓光。
// 头约占画面高度一半；脸的远侧（左）收窄，近侧（右）露出耳朵和头的侧面。

const FACE = { cx: 45, cy: 41, rx: 14, ry: 13, eyeY: 40, eyeL: [32, 37], eyeR: [43, 51] };

const COOL = [58, 56, 112], RIM = [170, 204, 255], WARM = [255, 242, 214];
const shd = (c, k = 0.72) => derive(c, 'S' + k, () => mix(shade(c, k), COOL, 0.2));
const rimc = (c) => derive(c, 'R', () => mix(c, RIM, 0.42));
const hil = (c, k = 0.3) => derive(c, 'H' + k, () => mix(c, WARM, k));

// 逐行打光：每一行的实心段，靠右 (1-ratio) 部分进暗部；最右 1px 是冷色轮廓光；朝上的亮面边缘提亮
Pix.prototype.lightRows = function (ratio = 0.66, rim = true, top = true, k = 0.72) {
  const src = this.c.slice(), w = this.w;
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= this.h ? null : src[y * w + x]);
  const [bx0, by0, bx1, by1] = this.box(0);
  for (let y = by0; y <= by1; y++) {
    let x = bx0;
    while (x <= bx1) {
      if (!src[y * w + x]) { x++; continue; }
      let xb = x;
      while (xb + 1 <= bx1 && src[y * w + xb + 1]) xb++;
      const n = xb - x + 1;
      for (let i = x; i <= xb; i++) {
        const c = src[y * w + i], t = (i - x) / n;
        let o = c;
        if (t > ratio) o = shd(c, k);
        else if (t > ratio - 0.06 && dith(i, y)) o = shd(c, (k + 1) / 2);
        if (rim && i === xb && n >= 3) o = rimc(o === c ? shd(c, k) : o);
        else if (top && !g(i, y - 1) && t <= ratio) o = hil(c);
        this.c[y * w + i] = o;
      }
      x = xb + 1;
    }
  }
};

function part(M, fn, opts = {}) {
  const L = new Pix(M.w, M.h);
  fn(L);
  if (opts.light !== false) L.lightRows(opts.ratio ?? 0.66, opts.rim ?? true, opts.top ?? true, opts.k ?? 0.72);
  if (opts.post) opts.post(L);
  if (opts.ol !== false) L.outline(opts.ol || 'auto');
  M.blit(L);
  return L;
}

const qpt = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};
// 一条发束/毛束：沿曲线逐渐变细的尖条
function strand(L, p0, p1, p2, w0, col, w1 = 0.4) {
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, [x, y] = qpt(p0, p1, p2, t), r = w0 * (1 - t) + w1 * t;
    L.ell(x, y, r, r, col);
  }
}
function strokeQ(L, p0, p1, p2, fn, t0 = 0, t1 = 1) {
  for (let i = 0; i <= 30; i++) {
    const t = t0 + (t1 - t0) * i / 30, [x, y] = qpt(p0, p1, p2, t);
    L.tint(x, y, fn);
  }
}

// —— 尾巴：从身后右下方伸出 ——
function furTail(L, p0, p1, p2, rf, cf, tips = true) {
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, [x, y] = qpt(p0, p1, p2, t), r = rf(t);
    L.ell(x, y, r, r, cf(t));
    if (tips && i % 7 === 3 && r > 2.5) { // 毛尖簇
      L.poly([[x + r - 1, y - 1], [x + r + 2, y + 1], [x + r - 1, y + 2]], cf(t));
      L.poly([[x - r + 1, y - 1], [x - r - 2, y - 2], [x - r + 1, y + 2]], cf(t));
    }
  }
}
const TAILS = {
  feline: (L, fc) => { L.curve([74, 80], [100, 70], [86, 34], () => 1.6, () => fc); L.curve([86, 34], [84, 28], [80, 31], () => 1.4, () => fc); },
  lupo: (L, fc) => furTail(L, [72, 80], [100, 74], [86, 38], (t) => 1.8 + 4.6 * Math.sin(Math.PI * Math.min(1, t * 1.08)), (t) => (t > 0.86 ? shade(fc, 0.62) : fc)),
  vulpo: (L, fc) => furTail(L, [70, 80], [104, 78], [84, 26], (t) => 2.5 + 7.5 * Math.sin(Math.PI * t * 0.93), (t) => (t > 0.8 ? WHITE : t > 0.7 ? mix(fc, WHITE, 0.55) : fc)),
  perro: (L, fc) => furTail(L, [74, 80], [88, 74], [91, 58], (t) => 2.6 + 0.8 * Math.sin(Math.PI * t), () => fc),
  zalak: (L, fc) => {
    furTail(L, [70, 80], [108, 72], [84, 28], (t) => 3 + 5.5 * Math.sin(Math.PI * t), () => fc);
    furTail(L, [84, 28], [74, 22], [76, 34], () => 3.4, () => fc, false);
  },
  vouivre: (L, fc, a) => {
    const sc = a.scale || [92, 128, 96];
    L.curve([70, 80], [102, 80], [92, 44], (t) => 6 * (1 - t) + 1.2, () => sc);
  },
};
const TAIL_POST = {
  vouivre: (L, a) => {
    const sc = a.scale || [92, 128, 96];
    for (let i = 1; i < 12; i++) {
      const t = i / 13, [x, y] = qpt([70, 80], [102, 80], [92, 44], t), r = 6 * (1 - t) + 1.2;
      L.poly([[x - r * 0.6, y - r + 1], [x - r * 0.2 - 1, y - r - 2], [x + 0.5, y - r + 1]], shade(sc, 0.62)); // 背刺
      if (i % 2) { L.tint(x, y, (c) => mix(c, WHITE, 0.25)); L.tint(x + 1, y + 1, (c) => shade(c, 0.8)); }
    }
  },
  lupo: (L) => strokeQ(L, [72, 80], [100, 74], [86, 38], (c) => mix(c, WARM, 0.3), 0.15, 0.8),
  vulpo: (L) => strokeQ(L, [70, 80], [104, 78], [84, 26], (c) => mix(c, WARM, 0.3), 0.12, 0.7),
};

// —— 头上的种族特征。far = 远侧（左，部分被头挡住，先画）；near = 近侧（右，后画）——
const PINK = [236, 168, 164];
function fluffy(L, pts, col) { for (const [x, y] of pts) L.set(x, y, col); }
function earTri(L, o, inner, fc, ic, tip) {
  L.poly(o, fc);
  if (inner) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of inner) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const icd = shade(ic, 0.8);
    L.poly(inner, (x, y) => ((y - y0) / (y1 - y0 + 0.01) > 0.62 && (dith(x, y) || (y - y0) / (y1 - y0) > 0.8) ? icd : ic));
  }
  if (tip) L.poly(tip, shade(fc, 0.6));
}
const TOPF = {
  feline: {
    far: (L, fc) => earTri(L, [[28, 25], [29, 8], [41, 18]], [[30.5, 22], [31, 13], [37.5, 19]], fc, PINK),
    near: (L, fc) => { earTri(L, [[51, 16], [63, 6], [64, 24]], [[54, 17], [61.5, 10], [62, 21]], fc, PINK); fluffy(L, [[56, 19], [57, 20], [58, 18], [55, 18]], WHITE); },
  },
  lupo: {
    far: (L, fc) => { earTri(L, [[24, 28], [21, 12], [21, 2], [30, 7], [42, 16]], [[27, 24], [24.5, 8], [36, 16]], fc, mix(fc, WHITE, 0.42), [[21.5, 6], [21, 2], [26, 4]]); fluffy(L, [[28, 20], [29, 22], [30, 19]], WHITE); },
    near: (L, fc) => { earTri(L, [[49, 15], [60, 6], [69, 0], [70, 16], [68, 28]], [[53, 16], [64, 6], [66, 24]], fc, mix(fc, WHITE, 0.42), [[66.5, 2], [69, 0], [69.5, 6]]); fluffy(L, [[55, 18], [56, 16], [57, 19], [58, 17], [56, 20], [59, 21]], WHITE); },
  },
  vulpo: {
    far: (L, fc) => {
      earTri(L, [[23, 30], [18, 14], [17, 0], [27, 5], [35, 11], [43, 15]], [[26.5, 26], [22, 8], [31, 12], [37, 17]], fc, mix(fc, WHITE, 0.72), [[17.5, 4], [17, 0], [22, 2]]);
      fluffy(L, [[27, 21], [28, 19], [29, 23], [30, 20], [31, 24], [32, 22], [26, 23]], WHITE);
    },
    near: (L, fc) => {
      earTri(L, [[48, 14], [56, 8], [64, 3], [71, 0], [71, 14], [69, 31]], [[52, 16], [60, 9], [67, 5], [66, 27]], fc, mix(fc, WHITE, 0.72), [[68, 2], [71, 0], [71, 7]]);
      for (const [x, y] of [[54, 18], [55, 16], [56, 19], [57, 17], [58, 20], [59, 18], [60, 21], [61, 19], [62, 22], [56, 21], [58, 23], [60, 24], [62, 25], [63, 21], [64, 24]]) L.set(x, y, WHITE);
    },
  },
  cautus: {
    far: (L, fc) => earTri(L, [[33, 20], [28, 6], [29, 0], [33, 0], [37, 8], [39, 18]], [[33.5, 17], [30.5, 6], [31.5, 2], [34, 6], [36.5, 16]], fc, PINK),
    near: (L, fc) => earTri(L, [[51, 18], [52, 6], [55, 0], [60, 0], [62, 5], [58, 18]], [[53, 16], [54, 6], [56.5, 2], [59.5, 4], [56.5, 16]], fc, PINK),
  },
  perro: {
    far: (L, fc) => {
      const c = mix(shade(fc, 0.6), [96, 64, 44], 0.35);
      earTri(L, [[33, 18], [26, 17], [20, 25], [17, 38], [19, 46], [24, 47], [28, 38], [31, 26]], null, c);
      L.line(23, 25, 21, 42, shade(c, 0.75));
    },
    near: (L, fc) => {
      const c = mix(shade(fc, 0.6), [96, 64, 44], 0.35);
      earTri(L, [[56, 17], [64, 16], [71, 23], [75, 37], [73, 47], [68, 47], [66, 36], [61, 26]], null, c);
      L.line(67, 23, 71, 42, shade(c, 0.75));
    },
  },
  ursus: {
    far: (L, fc) => { L.ell(32, 19, 5, 5, fc); L.ell(32.5, 19.5, 2.5, 2.5, shade(fc, 0.62)); },
    near: (L, fc) => { L.ell(59, 17, 6, 6, fc); L.ell(59.5, 17.5, 3, 3, shade(fc, 0.62)); },
  },
  zalak: {
    far: (L, fc) => { earTri(L, [[31, 23], [31, 11], [39, 18]], [[32.5, 20], [32.5, 14], [36.5, 19]], fc, shade(fc, 0.7)); L.rect(30, 6, 1, 5, fc); L.rect(31, 7, 1, 4, shade(fc, 0.7)); },
    near: (L, fc) => { earTri(L, [[53, 17], [60, 7], [63, 21]], [[55.5, 17], [59.5, 10.5], [61, 19]], fc, shade(fc, 0.7)); L.rect(60, 2, 1, 5, fc); L.rect(61, 3, 1, 4, shade(fc, 0.7)); },
  },
  sarkaz: {
    far: (L) => L.curve([38, 21], [33, 2], [47, 0], (t) => 2.6 * (1 - t) + 0.7, (t) => (t < 0.3 ? [92, 74, 86] : [62, 48, 60])),
    near: (L) => L.curve([55, 22], [63, -2], [78, 8], (t) => 3.3 * (1 - t) + 0.8, (t) => (t < 0.3 ? [92, 74, 86] : [62, 48, 60])),
  },
  vouivre: {
    far: (L) => L.curve([38, 20], [38, 10], [41, 1], (t) => 2.3 * (1 - t) + 0.6, (t) => (t > 0.8 ? [150, 132, 104] : [232, 218, 186])),
    near: (L) => L.curve([55, 21], [62, 10], [70, 1], (t) => 3 * (1 - t) + 0.7, (t) => (t > 0.8 ? [150, 132, 104] : [232, 218, 186])),
  },
  liberi: {
    far: (L, fc) => {
      L.poly([[33, 28], [20, 18], [22, 24], [33, 32]], mix(fc, WHITE, 0.3));
      L.poly([[33, 31], [19, 27], [22, 31], [33, 35]], fc);
    },
    near: (L, fc) => {
      L.poly([[58, 27], [76, 15], [74, 22], [59, 32]], mix(fc, WHITE, 0.35));
      L.poly([[59, 31], [78, 25], [75, 31], [59, 36]], fc);
      L.poly([[59, 35], [76, 36], [72, 40], [59, 39]], shade(fc, 0.85));
    },
  },
};
const HORN_POST = {
  sarkaz: (L) => {
    for (const [p0, p1, p2] of [[[55, 22], [63, -2], [78, 8]], [[38, 21], [33, 2], [47, 0]]]) {
      for (let t = 0.15; t < 0.85; t += 0.14) { const [x, y] = qpt(p0, p1, p2, t); L.tint(x, y, (c) => shade(c, 0.7)); L.tint(x + 1, y, (c) => shade(c, 0.7)); }
    }
  },
};
const SIDE = { sankta: 'round', vouivre: 'round', sarkaz: 'pointed' };

function halo(L) {
  for (let y = 2; y < 18; y++) {
    for (let x = 26; x < 66; x++) {
      const dx = x + 0.5 - 45, dy = y + 0.5 - 9;
      const o = (dx / 13.5) ** 2 + (dy / 3.6) ** 2, i = (dx / 10) ** 2 + (dy / 1.9) ** 2;
      if (o <= 1 && i > 1) L.set(x, y, dy < -0.5 ? [255, 238, 150] : dx > 6 ? [226, 168, 60] : [252, 212, 92]);
    }
  }
}
function drawWings(L) {
  const W = [244, 244, 250];
  const near = [[70, 64], [82, 44], [92, 40], [89, 48], [95, 49], [89, 55], [93, 58], [84, 62], [78, 68]];
  L.poly(near, W);
  const far = [[24, 64], [14, 50], [6, 50], [10, 56], [5, 59], [12, 62], [16, 67]];
  L.poly(far, mix(W, COOL, 0.15));
}

function hashApp(a) {
  const s = `${a.hair}|${a.cloth}|${a.eye}|${a.style}|${a.top}`;
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// —— 身体：3/4 朝左，近侧（右）肩膀更大、在暗部 ——
const TORSO = [[14, 80], [16, 71], [22, 65], [31, 60], [38, 57], [52, 56], [62, 58], [72, 62], [80, 69], [84, 80]];
const FAR_ARM = [[14, 80], [16, 71], [22, 65], [26, 66], [23, 80]];
const NEAR_ARM = [[67, 61], [72, 62], [80, 69], [84, 80], [71, 80], [69, 70]];
function drawBody(L, a) {
  const c = a.cloth, cd = shade(c, 0.8), cl = mix(c, WHITE, 0.14), shirt = [228, 224, 214];
  const inner = mix(shade(c, 0.42), [30, 30, 38], 0.5);
  const acc = [232, 184, 74], h = hashApp(a);
  const open = a.top === 'coat' || a.top === 'jacket';
  L.poly(TORSO, open ? inner : c);
  if (open) {
    // 左右两片外套 + 中间露出内搭
    L.poly([[14, 80], [16, 71], [22, 65], [31, 60], [38, 57], [41, 62], [38, 80]], c);
    L.poly([[48, 56], [52, 56], [62, 58], [72, 62], [80, 69], [84, 80], [48, 80], [50, 66]], c);
  }
  // 袖子：比身体略暗、分出体块
  L.poly(FAR_ARM, cd); L.poly(NEAR_ARM, cd);
  L.line(26, 66, 23, 80, shade(c, 0.66)); L.line(69, 62, 70, 80, shade(c, 0.66));
  switch (a.top) {
    case 'coat': // 长风衣：翻领、腰带扣
      L.poly([[33, 58], [39, 56], [42, 66], [37, 70]], cl);
      L.poly([[48, 55], [56, 56], [52, 66], [49, 66]], cl);
      L.poly([[41, 59], [48, 59], [45.5, 71], [43.5, 71]], shirt);
      L.rect(30, 75, 9, 2, shade(c, 0.6)); L.rect(51, 75, 18, 2, shade(c, 0.6)); L.rect(33, 74, 3, 4, acc);
      break;
    case 'hoodie':
      L.line(43, 58, 41, 80, cd);
      L.line(39, 60, 38, 70, shirt); L.line(47, 60, 47, 70, shirt);
      L.set(38, 71, acc); L.set(47, 71, acc);
      L.poly([[30, 72], [56, 72], [55, 80], [31, 80]], cd); // 口袋
      L.line(31, 72, 55, 72, shade(c, 0.66));
      break;
    case 'jacket': // 机能夹克：高领内搭、黄色拉链边、胸前绑带
      L.line(41, 60, 38, 80, acc); L.line(49, 60, 50, 80, acc);
      L.poly([[22, 66], [25, 65], [62, 80], [58, 80]], [40, 38, 44]); L.line(23, 66, 60, 80, [70, 68, 76]);
      L.rect(38, 71, 4, 3, [200, 200, 206]); L.set(39, 72, [90, 90, 96]);
      L.rect(17, 70, 6, 5, [216, 214, 206]); L.rect(17, 72, 6, 1, [200, 60, 50]);
      break;
    case 'suit':
      L.poly([[38, 57], [49, 57], [44, 74]], shirt);
      L.poly([[42, 59], [46, 59], [46.5, 70], [44, 74], [41.5, 70]], a.tie || [150, 40, 40]);
      L.poly([[34, 58], [38, 57], [44, 74], [38, 68]], cl);
      L.poly([[49, 57], [55, 57], [51, 66], [44, 74]], cl);
      L.line(38, 57, 44, 74, cd); L.line(49, 57, 44, 74, cd); L.set(31, 70, [230, 230, 230]); L.set(56, 72, cd); L.set(56, 77, cd);
      break;
    case 'uniform': // 近卫局式制服：肩章、双排扣、袖章
      L.rect(18, 65, 10, 2, acc); L.rect(64, 60, 12, 2, acc);
      for (const y of [64, 69, 74, 79]) { L.set(39, y, acc); L.set(49, y, acc); }
      L.line(44, 58, 44, 80, cd);
      L.poly([[71, 70], [80, 68], [83, 74], [73, 76]], [176, 52, 44]);
      L.line(72, 72, 81, 70, [230, 210, 120]);
      break;
  }
  if (h % 4 === 1 && (a.top === 'hoodie' || a.top === 'suit')) { // 偶尔：斜挎包带
    L.poly([[58, 57], [62, 58], [31, 80], [26, 80]], [56, 46, 42]);
    L.rect(40, 71, 3, 3, [190, 190, 196]);
  }
  if (a.badge) { L.rect(25, 66, 8, 8, [32, 32, 38]); L.line(29, 67, 29, 72, WHITE); L.line(26, 69, 31, 69, WHITE); L.set(26, 66, acc); }
}

// —— 脸 ——
const LASH = [40, 28, 36];
function headShape(L, sk) {
  L.ell(46, 31, 15.5, 15.5, sk);
  L.poly([[30.5, 32], [30.5, 40], [32.5, 46], [36.5, 51], [40.5, 54], [44, 53.5], [51, 49.5], [57, 44], [60.5, 38], [61, 31]], sk);
}
function eye(M, x0, w, ec, expr, far) {
  // x0 = 眼睛左端，w = 宽度（远侧窄）
  const y = 38, x1 = x0 + w - 1;
  const ecD = shade(ec, 0.55), ecL = mix(ec, WHITE, 0.35), scl = [246, 242, 240];
  if (expr === 'smile' || expr === 'closed') {
    const up = expr === 'smile';
    for (let i = 0; i < w; i++) {
      const t = (i + 0.5) / w, dy = up ? -Math.round(Math.sin(t * Math.PI) * 1.6) : Math.round(Math.sin(t * Math.PI) * 1.2);
      M.set(x0 + i, y + 3 + dy, LASH);
    }
    M.set(far ? x0 - 1 : x1 + 1, y + 3, LASH);
    return;
  }
  const top = expr === 'angry' ? y + 1 : y;
  // 上睫毛：粗线 + 外眼角翘起
  for (let x = x0; x <= x1; x++) M.set(x, top, LASH);
  for (let x = x0 + 1; x < x1; x++) M.set(x, top - 1, expr === 'angry' ? LASH : (x === x0 + 1 && far ? null : LASH) || LASH);
  if (far) { M.set(x0 - 1, top, LASH); M.set(x0 - 1, top - 1, LASH); } else { M.set(x1 + 1, top - 1, LASH); M.set(x1 + 1, top - 2, LASH); }
  // 眼白 + 虹膜
  const bot = y + 5;
  for (let yy = top + 1; yy <= bot; yy++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1;
      let c = edge ? scl : (yy <= top + 1 ? ecD : yy >= bot - 1 ? ecL : ec);
      if (expr === 'shock') c = edge || x === x0 + 1 || x === x1 - 1 ? scl : (yy === top + 2 || yy === top + 3 ? ecD : scl);
      M.set(x, yy, c);
    }
  }
  if (expr !== 'shock') {
    const px = x0 + Math.floor(w / 2);
    M.set(px, top + 2, shade(ec, 0.35)); if (w > 4) M.set(px - 1, top + 2, shade(ec, 0.35));
    M.set(x0 + 1, top + 1, [255, 255, 255]); if (w > 4) M.set(x0 + 2, top + 1, [255, 255, 255]);
    M.set(x1 - 1, bot - 1, mix(ecL, WHITE, 0.5));
  }
  // 下眼线（淡）
  for (let x = x0 + 1; x < x1; x++) M.tint(x, bot + 1, (c) => shade(c, 0.88));
  if (expr === 'sad') { M.set(x1 - (far ? 0 : 1), bot + 2, [180, 214, 240]); }
}
function drawFace(M, a, sk, expr) {
  eye(M, 33, 4, a.eye, expr, true);
  eye(M, 44, 6, a.eye, expr, false);
  // 鼻子：鼻梁右侧一点阴影 + 鼻尖高光
  M.set(40, 45, sk[1]); M.set(41, 46, sk[1]); M.set(39, 45, hil(sk[0], 0.35));
  // 腮红
  for (const [x, y] of [[34, 47], [35, 47], [47, 47], [48, 47], [49, 47], [36, 48], [48, 48]]) if (dith(x, y) || x === 48) M.tint(x, y, (c) => mix(c, [236, 120, 120], 0.35));
  const lip = [150, 76, 80], dk = [92, 40, 48];
  if (expr === 'smile') { M.set(37, 49, lip); M.rect(38, 50, 5, 1, dk); M.set(43, 49, lip); M.rect(39, 51, 3, 1, [210, 110, 110]); }
  else if (expr === 'sad') { M.set(37, 51, lip); M.rect(38, 50, 4, 1, lip); M.set(42, 51, lip); }
  else if (expr === 'angry') { M.rect(37, 50, 6, 1, dk); M.set(37, 51, lip); M.set(43, 51, lip); }
  else if (expr === 'shock') { M.ell(40, 50.5, 1.6, 2, dk); M.set(40, 51, [180, 90, 96]); }
  else { M.rect(38, 50, 4, 1, lip); M.set(42, 49, sk[1]); }
  if (expr === 'shock' || expr === 'sad') { M.set(58, 33, [190, 226, 250]); M.rect(57, 34, 3, 2, [190, 226, 250]); M.set(57, 34, WHITE); }
}
function drawBrows(M, a, expr) {
  const bc = mix(shade(a.hair, 0.55), LASH, 0.4);
  const far = expr === 'angry' ? [[32, 34], [33, 34], [34, 35], [35, 35], [36, 36]] : expr === 'sad' ? [[32, 36], [33, 35], [34, 35], [35, 34], [36, 34]] : [[32, 35], [33, 34], [34, 34], [35, 34], [36, 35]];
  const near = expr === 'angry' ? [[44, 36], [45, 35], [46, 35], [47, 34], [48, 34], [49, 34], [50, 33]] : expr === 'sad' ? [[44, 34], [45, 34], [46, 35], [47, 35], [48, 35], [49, 36], [50, 36]] : [[44, 35], [45, 34], [46, 34], [47, 34], [48, 34], [49, 34], [50, 35]];
  for (const [x, y] of far.concat(near)) M.set(x, y, bc);
}

// —— 头发 ——
// 刘海发束：[根部 x, 根部 y, 尖端 x, 尖端 y, 粗细]；尖端整体偏左（朝脸的方向飘）
const BANGS = {
  a: [[33, 22, 29, 38, 3.2], [38, 21, 34, 37, 3.4], [43, 20, 40, 36, 3.4], [48, 20, 45, 38, 3.2], [53, 21, 51, 36, 3.2], [57, 23, 56, 34, 2.8]],
  b: [[34, 22, 31, 36, 3.4], [40, 20, 36, 38, 3.6], [46, 20, 43, 35, 3.2], [51, 21, 50, 38, 3.2], [56, 23, 56, 33, 2.8]],
  c: [[33, 22, 30, 33, 3], [37, 20, 33, 39, 3.2], [42, 20, 41, 33, 3], [47, 20, 44, 37, 3.4], [52, 21, 52, 34, 3], [57, 23, 57, 35, 2.6]],
};
function lock(L, x0, y0, x1, y1, w, col, bend = -3) {
  strand(L, [x0, y0], [(x0 + x1) / 2 + bend * 0.3, (y0 + y1) / 2], [x1, y1], w, col, 0.35);
}
function drawHairFront(L, a, hood) {
  const hc = a.hair, st = a.style;
  if (st === 'buzz') {
    L.ell(46, 30, 16, 15.2, hc, (x, y) => y <= 27 || (x > 54 && y <= 37) || (x < 33 && y <= 31));
    for (let x = 33; x < 55; x++) if (dith(x, 28)) L.set(x, 28, hc);
    return;
  }
  // 头顶发团
  L.ell(46, 29.5, 16.6, 15.2, hc, (x, y) => y <= 27 || (x > 54 && y <= 36) || (x < 33 && y <= 32));
  const set = st === 'messy' || st === 'spiky' ? BANGS.c : st === 'bob' || st === 'twin' ? BANGS.b : BANGS.a;
  for (const [x0, y0, x1, y1, w] of set) lock(L, x0, y0, x1, y1, w + 0.6, hc);
  if (!hood) {
    // 远侧鬓发（贴着左脸）与近侧鬓发（耳前）
    const lenF = st === 'long' || st === 'twin' ? 62 : st === 'bob' ? 53 : st === 'buzz' ? 34 : 46;
    const lenN = st === 'long' || st === 'twin' ? 60 : st === 'bob' ? 52 : 44;
    strand(L, [31, 26], [28, (26 + lenF) / 2], [30, lenF], 3, hc, 0.6);
    strand(L, [55, 27], [58, (27 + lenN) / 2], [56, lenN], 3, hc, 0.6);
    if (st === 'bob' || st === 'long' || st === 'twin') strand(L, [59, 28], [62, 40], [60, lenN - 2], 3, hc, 0.6);
  }
  if (st === 'spiky') {
    lock(L, 40, 22, 33, 10, 3, hc, 2); lock(L, 47, 20, 46, 8, 3, hc, 2); lock(L, 54, 22, 60, 10, 3, hc, 2); lock(L, 58, 26, 66, 18, 2.6, hc, 2);
  }
  if (st === 'messy') { L.curve([47, 16], [44, 6], [50, 7], () => 0.7, () => hc); lock(L, 56, 24, 63, 18, 2.4, hc, 1); }
}
// 发丝暗线 + 天使环高光
function hairDetail(L, a) {
  const hc = a.hair, st = a.style;
  const set = st === 'messy' || st === 'spiky' ? BANGS.c : st === 'bob' || st === 'twin' ? BANGS.b : BANGS.a;
  set.forEach(([x0, y0, x1, y1], i) => { if (i % 2) strokeQ(L, [x0 + 1, y0 + 4], [(x0 + x1) / 2 + 0.5, (y0 + y1) / 2 + 1], [x1 + 0.5, y1 - 2], (c) => shade(c, 0.82), 0.1, 0.75); });
  if (st === 'buzz') return;
  for (let x = 32; x <= 54; x++) {
    const y = Math.round(21 + ((x - 42) / 11) ** 2 * 3.2);
    if (nz(x, 3) > 0.78) continue;
    L.tint(x, y, (c) => mix(c, WARM, 0.45));
    if (x > 34 && x < 48 && nz(x, 7) > 0.4) L.tint(x, y + 1, (c) => mix(c, WARM, 0.25));
  }
}
function drawBackHair(L, a) {
  const hd = shade(a.hair, 0.82), st = a.style;
  if (st === 'long') {
    L.ell(47, 34, 18.5, 19, hd);
    L.poly([[29, 38], [64, 36], [70, 64], [64, 72], [56, 66], [50, 74], [42, 66], [33, 72], [26, 60]], hd);
  } else if (st === 'bob') {
    L.ell(47, 34, 18, 19.5, hd);
    L.poly([[29, 40], [64, 38], [66, 52], [60, 56], [54, 52], [36, 54], [30, 56], [27, 50]], hd);
  } else if (st === 'ponytail') {
    L.ell(47, 32, 17, 17, hd);
    strand(L, [60, 22], [80, 30], [74, 64], 5, hd, 1);
  } else if (st === 'twin') {
    L.ell(47, 33, 17.5, 18, hd);
    strand(L, [30, 30], [20, 44], [24, 66], 4.6, hd, 1.2);
    strand(L, [62, 28], [74, 42], [70, 66], 4.8, hd, 1.2);
  } else if (st !== 'buzz') {
    L.ell(47, 32, 16.8, 16.5, hd);
    L.poly([[56, 40], [64, 38], [66, 48], [61, 46], [60, 50]], hd); // 后颈的发梢
  }
}
function drawHairTies(M, a) {
  const tie = [204, 60, 64];
  if (a.style === 'ponytail') { M.rect(61, 23, 3, 3, tie); M.set(61, 23, mix(tie, WHITE, 0.4)); }
  if (a.style === 'twin') { M.rect(29, 30, 3, 3, tie); M.rect(61, 29, 3, 3, tie); }
}

// —— 帽子 ——
function drawHat(L, a) {
  const c = a.hatColor, cd = shade(c, 0.76), cl = mix(c, WHITE, 0.2);
  if (a.hat === 'cap') {
    L.ell(46, 28, 17.6, 13.5, c, (x, y) => y <= 27);
    L.poly([[22, 27], [44, 23], [52, 27], [30, 31], [21, 30]], cd); // 帽檐朝左
    L.rect(31, 18, 7, 5, cl); L.rect(33, 20, 3, 1, [200, 60, 50]);
    L.set(46, 14, cd);
  } else if (a.hat === 'beanie') {
    L.ell(46, 28, 18, 15, c, (x, y) => y <= 26);
    L.rect(28, 24, 37, 6, cd);
    for (let x = 29; x < 64; x += 2) L.line(x, 24, x, 29, shade(c, 0.66));
    L.ell(48, 11, 3.5, 3.5, (x, y) => (dith(x, y) ? cl : c));
  } else if (a.hat === 'hood') {
    // 兜帽：一圈包住脸的帽沿
    L.ell(46, 33, 21, 21, c, (x, y) => y < 54 && ((x + 0.5 - 45) / 14.2) ** 2 + ((y + 0.5 - 39) / 15) ** 2 > 1);
    for (let x = 28; x < 64; x++) for (let y = 14; y < 54; y++) {
      const d = ((x + 0.5 - 45) / 14.2) ** 2 + ((y + 0.5 - 39) / 15) ** 2;
      if (d > 1 && d < 1.22 && L.get(x, y)) L.set(x, y, cl);
    }
  }
}

function drawPerson(a, o = {}) {
  const M = new Pix();
  const sk = SKIN[a.skin] || SKIN.light, fc = a.feat || a.hair;
  const hat = a.hat && !o.hatOff ? a.hat : null;
  const R = a.race, expr = o.expr || 'neutral';
  const tf = TOPF[R];

  if (TAILS[R]) part(M, (L) => TAILS[R](L, fc, a), { ratio: 0.55, post: TAIL_POST[R] ? (L) => TAIL_POST[R](L, a) : null });
  if (R === 'sankta') part(M, drawWings, { ratio: 0.7 });
  if (hat === 'hood') part(M, (L) => { L.ell(47, 38, 22, 24, shade(a.hatColor, 0.7)); L.poly([[22, 50], [72, 50], [76, 66], [18, 66]], shade(a.hatColor, 0.7)); }, { ratio: 0.6 });
  else if (a.style !== 'buzz') part(M, (L) => drawBackHair(L, a), { ratio: 0.6 });
  // 远侧的耳朵 / 角：被头挡住一部分
  if (!hat && tf && tf.far && R !== 'liberi' && R !== 'perro') part(M, (L) => tf.far(L, fc), { ratio: 0.7, post: HORN_POST[R] });
  if (R === 'sarkaz' && hat !== 'hood') part(M, (L) => L.poly([[33, 37], [24, 30], [32, 44]], sk[0]), { ratio: 0.8 });

  part(M, (L) => drawBody(L, a), { ratio: 0.6 });
  if (a.top === 'hoodie' && hat !== 'hood') part(M, (L) => { L.poly([[28, 60], [34, 53], [58, 52], [66, 59], [52, 62], [38, 62]], shade(a.cloth, 0.86)); }, { ratio: 0.62 });
  part(M, (L) => L.poly([[39, 48], [52, 46], [53, 59], [46, 61], [39, 58]], sk[0]), {
    ratio: 0.55,
    post: (L) => { for (let y = 46; y < 54; y++) for (let x = 38; x < 54; x++) L.tint(x, y, (c) => shd(c, 0.78)); },
  });
  if (a.top === 'jacket' || a.top === 'uniform') part(M, (L) => L.poly([[37, 54], [53, 53], [55, 60], [38, 61]], a.top === 'uniform' ? shade(a.cloth, 0.78) : mix(a.cloth, WHITE, 0.16)), { ratio: 0.6 });
  if (a.top === 'coat') part(M, (L) => { L.poly([[34, 50], [39, 53], [40, 60], [33, 61]], mix(a.cloth, WHITE, 0.16)); L.poly([[52, 50], [56, 52], [57, 60], [51, 60]], mix(a.cloth, WHITE, 0.16)); }, { ratio: 0.55 });
  // 近侧的人类耳朵
  if (SIDE[R] && hat !== 'hood') {
    part(M, (L) => {
      if (SIDE[R] === 'pointed') L.poly([[57, 36], [70, 28], [64, 38], [58, 46]], sk[0]);
      else { L.ell(60, 41, 2.8, 4.3, sk[0]); L.set(60, 41, sk[1]); L.set(60, 42, sk[1]); }
    }, { ratio: 0.5 });
  }
  // 头
  part(M, (L) => headShape(L, sk[0]), { ratio: 0.72, k: 0.78, top: false });
  // 下巴下的阴影线条在描边里已有；脸的远侧加一点亮边
  for (let y = 33; y < 47; y++) M.tint(31, y, (c) => (c === sk[0] ? hil(c, 0.2) : c));
  drawFace(M, a, sk, expr);
  // 前发
  const hairL = part(M, (L) => drawHairFront(L, a, hat === 'hood'), { ratio: 0.68, post: (L) => hairDetail(L, a) });
  // 头发在额头投下的阴影
  for (let x = 30; x < 62; x++) {
    for (let y = 22; y < 50; y++) {
      if (hairL.get(x, y) && !hairL.get(x, y + 1)) {
        for (const d of [1, 2]) M.tint(x, y + d, (c) => (c === sk[0] || c === hil(sk[0]) ? shd(sk[0], 0.84) : c));
        break;
      }
    }
  }
  if (!['angry', 'sad'].includes(expr) || true) drawBrows(M, a, expr);
  drawHairTies(M, a);
  if (!hat && tf) {
    if (R === 'liberi' || R === 'perro') { part(M, (L) => tf.far(L, fc), { ratio: 0.7 }); part(M, (L) => tf.near(L, fc), { ratio: 0.6 }); }
    else if (tf.near) part(M, (L) => tf.near(L, fc), { ratio: 0.62, post: HORN_POST[R] });
  }
  if (a.acc === 'catband' && !hat) {
    part(M, (L) => {
      const k = [224, 112, 156], kin = [255, 214, 230];
      L.curve([29, 30], [42, 6], [61, 24], () => 1, () => k);
      L.poly([[31, 21], [32, 10], [40, 17]], k); L.poly([[51, 16], [60, 7], [61, 21]], k);
      L.poly([[33, 19], [33.5, 13], [37.5, 17]], kin); L.poly([[54, 17], [58.5, 11], [59, 19]], kin);
    }, { ratio: 0.75, post: (L) => { L.set(33, 12, WHITE); L.set(58, 9, WHITE); L.set(42, 15, WHITE); L.set(43, 15, WHITE); } });
  }
  if (hat) part(M, (L) => drawHat(L, a), { ratio: 0.66 });
  if (hat === 'hood') for (let y = 24; y < 33; y++) for (let x = 30; x < 62; x++) if (((x + 0.5 - 45) / 14.2) ** 2 + ((y + 0.5 - 39) / 15) ** 2 <= 1 && (y < 30 || dith(x, y))) M.tint(x, y, (c) => shd(c, 0.7));
  if (a.glasses) {
    const g = [44, 40, 50];
    for (let x = 43; x <= 52; x++) { M.set(x, 37, g); M.set(x, 45, g); }
    for (let y = 37; y <= 45; y++) { M.set(43, y, g); M.set(52, y, g); }
    for (let x = 32; x <= 38; x++) { M.set(x, 37, g); M.set(x, 45, g); }
    for (let y = 37; y <= 45; y++) M.set(38, y, g);
    M.rect(39, 40, 4, 1, g); M.line(52, 39, 58, 39, g);
    M.set(45, 39, [230, 240, 255]); M.set(46, 38, [230, 240, 255]);
  }
  if (a.acc === 'scarf') {
    part(M, (L) => {
      L.poly([[33, 53], [55, 51], [58, 60], [48, 63], [34, 62]], WHITE);
      L.poly([[38, 60], [45, 61], [42, 78], [35, 77]], WHITE);
      L.line(36, 66, 43, 67, [210, 210, 214]); L.line(37, 71, 43, 72, [210, 210, 214]);
      L.line(40, 55, 54, 54, [214, 214, 220]);
    }, { ratio: 0.6 });
  }
  if (R === 'sankta') {
    part(M, halo, { light: false, ol: [190, 140, 50] });
    M.set(26, 6, [255, 244, 180]); M.set(25, 7, [255, 244, 180]); M.set(27, 7, [255, 244, 180]); M.set(26, 8, [255, 244, 180]);
    M.set(64, 4, [255, 244, 180]);
  }
  return M;
}

// —— 源石探测视图 ——
const SCAN_BOX = {
  contraband: [14, 64, 18, 14], phone: [34, 68, 7, 11], reunion: [44, 63, 14, 12], keys: [60, 68, 8, 7], coins: [70, 70, 8, 8],
};
const CRYSTAL_SPOTS = [[44, 57], [30, 66], [62, 62], [22, 74], [56, 74], [40, 72], [74, 72], [48, 60]];
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
