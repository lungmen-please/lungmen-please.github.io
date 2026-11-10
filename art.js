'use strict';
// 像素立绘（明日方舟干员档案风）：动漫比例的半身像——尖下巴、细脖子、露出肩膀；锐利的杏仁眼和粗上睫毛；
// 分层尖发梢的刘海和侧发；深色机能风外套 + 一种亮色点缀（拉链、织带、搭扣、臂章、ID 牌）。
// 画布 96x80，人物中轴 x=48（像素 47/48 之间，镜像 x → 95-x）。光源左上：硬边二到三阶赛璐璐明暗，外轮廓用部件自身的深色。

const PW = 96, PH = 80;
const OL = [34, 26, 40];
const WHITE = [248, 246, 242];

const SKIN = {
  light: [[252, 228, 210], [230, 184, 172]],
  mid: [[240, 204, 170], [212, 160, 136]],
  tan: [[214, 162, 122], [178, 122, 98]],
  deep: [[156, 108, 82], [120, 78, 70]],
  pale: [[242, 228, 226], [208, 184, 198]],
};
const HAIRS = [[54, 48, 70], [122, 80, 58], [170, 98, 60], [242, 208, 124], [208, 212, 226], [244, 242, 238], [206, 76, 72],
  [234, 142, 74], [76, 94, 156], [242, 162, 186], [86, 170, 166], [142, 138, 152]];
const EYES = [[150, 86, 54], [66, 124, 206], [72, 164, 104], [206, 72, 84], [234, 172, 52], [154, 92, 206]];
// 机能风底色：黑、炭灰、藏青、橄榄、白、灰、酒红、卡其、灰青
const CLOTHES = [[60, 68, 94], [56, 54, 66], [74, 86, 120], [88, 98, 78], [214, 212, 208], [112, 114, 126], [128, 66, 68], [168, 148, 116], [62, 96, 104], [98, 74, 108]];
const HAIR_STYLES = ['short', 'bob', 'long', 'spiky', 'buzz', 'ponytail', 'twin', 'messy', 'short', 'long'];
const TOPS = ['coat', 'hoodie', 'jacket', 'suit', 'uniform'];
// 每套衣服只用一种亮色点缀
const ACCENTS = [[238, 142, 74], [104, 196, 212], [236, 200, 92], [216, 88, 92], [156, 200, 104], [224, 124, 170]];

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const shade = (c, k) => c.map((v) => clamp(v * k));
const mix = (a, b, k) => a.map((v, i) => clamp(v + (b[i] - v) * k));
const mir = (pts) => pts.map(([x, y]) => [PW - x, y]);
const lum = (c) => c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;
const COOL = [64, 48, 112], WARM = [255, 242, 214];
const CC = new Map();
function memo(c, key, f) {
  const k = c[0] * 65536 + c[1] * 256 + c[2] + key;
  let r = CC.get(k);
  if (!r) { r = f(); CC.set(k, r); }
  return r;
}
// 色相偏移的暗色 / 亮色
const dk = (c, n = 1) => memo(c, n === 1 ? 0.1 : n === 2 ? 0.2 : 0.3, () => mix(shade(c, n === 1 ? 0.8 : n === 2 ? 0.62 : 0.44), COOL, n === 1 ? 0.12 : 0.2));
const lt = (c, n = 1) => memo(c, n === 1 ? 0.4 : 0.5, () => mix(c, WARM, n === 1 ? 0.24 : 0.5));
const hash = (a) => {
  let h = 7;
  for (const c of [a.hair, a.cloth, a.eye]) if (c) for (const v of c) h = (h * 31 + v) >>> 0;
  return h;
};

class Pix {
  constructor(w = PW, h = PH) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); this.x0 = w; this.y0 = h; this.x1 = -1; this.y1 = -1; }
  set(x, y, col) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
    this.c[y * this.w + x] = col;
    if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y;
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x]; }
  box(p = 1) { return [Math.max(0, this.x0 - p), Math.max(0, this.y0 - p), Math.min(this.w - 1, this.x1 + p), Math.min(this.h - 1, this.y1 + p)]; }
  tint(x, y, f) { const c = this.get(Math.floor(x), Math.floor(y)); if (c) this.set(x, y, f(c)); }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, typeof col === 'function' ? col(x + i, y + j) : col); }
  // 填充任意形状：inside(x+0.5, y+0.5) 为真即填
  fill(x0, y0, x1, y1, inside, col) {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.w - 1, Math.ceil(x1)); x++) {
        if (inside(x + 0.5, y + 0.5)) this.set(x, y, typeof col === 'function' ? col(x, y) : col);
      }
    }
  }
  ell(cx, cy, rx, ry, col, clip) {
    if (rx < 0.8 && ry < 0.8) { if (!clip || clip(Math.floor(cx), Math.floor(cy))) this.set(cx, cy, typeof col === 'function' ? col(Math.floor(cx), Math.floor(cy)) : col); return; }
    this.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!clip || clip(Math.floor(x), Math.floor(y))), col);
  }
  // 旋转椭圆
  ellR(cx, cy, rx, ry, ang, col) {
    const c = Math.cos(ang), s = Math.sin(ang), r = Math.max(rx, ry) + 1;
    this.fill(cx - r, cy - r, cx + r, cy + r, (x, y) => {
      const dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
      return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
    }, col);
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
  // 沿二次贝塞尔曲线画一串圆：尾巴、角
  curve(p0, p1, p2, rf, cf, steps = 70) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
      const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      this.ell(x, y, rf(t), rf(t), cf(t));
    }
  }
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
    for (const [x, y, n] of add) this.set(x, y, col === 'auto' || !col ? mix(shade(n, 0.32), OL, 0.55) : col);
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

// 硬边赛璐璐明暗：右下边缘一到两格压暗（冷色），左上边缘一格提亮（暖色），不抖点
function volShade(L, depth = 2, hl = true) {
  const src = L.c.slice(), w = L.w;
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= L.h ? null : src[y * w + x]);
  const [x0, y0, x1, y1] = L.box(0);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = src[y * w + x];
      if (!c) continue;
      if (!g(x + 1, y + 1) || !g(x + 1, y) || !g(x, y + 1)) L.c[y * w + x] = dk(c, 1);
      else if (depth > 1 && (!g(x + 2, y) || !g(x + 2, y + 1))) L.c[y * w + x] = dk(c, 1);
      else if (hl && (!g(x - 1, y - 1) || !g(x - 1, y) || !g(x, y - 1))) L.c[y * w + x] = lt(c, 1);
    }
  }
}

// 画一个部件：形状 → 明暗 → 细节 → 叠到 M 上。部件压在其它部件上的边缘画成自身暗色（内部线条），
// 落在空白处的边缘留给最后统一描边。
function layer(M, fn, o = {}) {
  const L = new Pix(M.w, M.h);
  fn(L);
  if (o.shade !== false) volShade(L, o.depth || 2, o.hl !== false);
  if (o.post) o.post(L);
  if (L.x1 < 0) return L;
  const w = L.w;
  for (let y = L.y0; y <= L.y1; y++) {
    for (let x = L.x0; x <= L.x1; x++) {
      const c = L.c[y * w + x];
      if (!c) continue;
      let col = c;
      if (o.line !== false) {
        const edge = !L.get(x - 1, y) || !L.get(x + 1, y) || !L.get(x, y - 1) || !L.get(x, y + 1);
        const under = M.get(x, y);
        if (edge && under) col = o.lineCol || mix(dk(c, 3), under, 0.18);
      }
      M.set(x, y, col);
    }
  }
  return L;
}

const bez = (P, t) => {
  const u = 1 - t;
  return [u * u * P[0][0] + 2 * u * t * P[1][0] + t * t * P[2][0], u * u * P[0][1] + 2 * u * t * P[1][1] + t * t * P[2][1],
    2 * u * (P[1][0] - P[0][0]) + 2 * t * (P[2][0] - P[1][0]), 2 * u * (P[1][1] - P[0][1]) + 2 * t * (P[2][1] - P[1][1])];
};
// —— 毛茸茸的曲线：边缘冒出尖尖的毛簇 ——
function furCurve(L, p0, p1, p2, rf, cf, tuft = 1) {
  L.curve(p0, p1, p2, rf, cf);
  if (!tuft) return;
  for (let i = 4; i < 64; i += 5) {
    const [x, y, dx, dy] = bez([p0, p1, p2], i / 64), t = i / 64;
    const n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, r = rf(t) + 0.9;
    for (const s of [1, -1]) {
      if (((i / 5) + (s > 0 ? 0 : 1)) % 2) continue;
      const bx = x + nx * (r - 1.2) * s, by = y + ny * (r - 1.2) * s;
      L.poly([[bx - dx / n * 1.6, by - dy / n * 1.6], [bx + dx / n * 1.6, by + dy / n * 1.6], [bx + nx * 2.4 * s + dx / n * 2.6, by + ny * 2.4 * s + dy / n * 2.6]], cf(t));
    }
  }
}

// —— 脸：窄脸、尖下巴 ——
const FACE = { cx: 48, cy: 38, rx: 12, ry: 14, eyeY: 35, eyeL: [38, 43], eyeR: [52, 57] };
const JAW = [[38, 12.2], [41, 12.0], [44, 11.0], [46.5, 9.0], [49, 6.0], [51, 3.0], [52, 1.2]];
function faceW(y) {
  if (y < 38) { const d = (38 - y) / 15; return d >= 1 ? 0 : 12.2 * Math.sqrt(1 - d ** 3); }
  for (let i = 1; i < JAW.length; i++) {
    if (y <= JAW[i][0]) { const [ya, wa] = JAW[i - 1], [yb, wb] = JAW[i]; return wa + (wb - wa) * (y - ya) / (yb - ya); }
  }
  return 0;
}
const inFace = (x, y) => Math.abs(x - 48) <= faceW(y);

// 眼睛模板（左眼，第 0 列在 eyeL[0]-1，是外眼角上挑的睫毛尾）；右眼水平镜像。
// K 上睫毛 D 虹膜暗（上半） M 虹膜 L 虹膜亮（下半） P 瞳孔 H 高光 W 眼白 l 下睫毛
const EYE_T = {
  neutral: ['.KKKKK.', 'KKKKKKK', '.WHDPDW', '.WHMPMW', '.WMMPMW', '..LLLM.', '...ll..'],
  sad: ['....KK.', '.KKKKKK', 'KKHDPDW', '.WHMPMW', '.WMMPMW', '..LLLM.', '...ll..'],
  angry: ['KK.....', 'KKKKK..', '.WHKKKK', '.WHMPMW', '.WMMPMW', '..LLLM.', '.......'],
  shock: ['..KKKK.', '.KWWWWK', '.WWDDWW', '.WWHPWW', '.WWMMWW', '.lWWWWl', '..llll.'],
  // 平静表情的另外两种眼型：吊眼角、垂眼角（按外观哈希分配，同一个人永远是同一种）
  sharp: ['.......', 'KK.....', '.KKKKKK', '.WHDPDW', '.WMMPMW', '..LLLM.', '.......'],
  droopy: ['..KKKK.', '.KKKKKK', 'KKHDPDW', 'KWHMPMW', '.WMMPMW', '..LLLM.', '...ll..'],
  smile: ['.......', '.......', '..KKK..', '.K...K.', 'K.....K', '.......', '.......'],
  closed: ['.......', '.......', '.......', '.......', 'KKKKKKK', '.l.l.l.', '.......'],
};
function drawEyes(M, a, sk, expr) {
  const e = a.eye || EYES[1];
  const K = mix([34, 22, 38], dk(a.hair, 3), 0.25);
  const pal = {
    K, D: mix(shade(e, 0.42), [24, 16, 44], 0.35), M: e, L: mix(lt(e, 1), WHITE, 0.25), P: mix(shade(e, 0.2), [14, 8, 24], 0.6),
    H: [255, 255, 255], W: [240, 240, 248], l: mix(sk[1], K, 0.4),
  };
  const shape = a.eyeShape || ['neutral', 'sharp', 'droopy'][(hash(a) >>> 3) % 3];
  const t = expr === 'neutral' || !EYE_T[expr] ? EYE_T[shape] || EYE_T.neutral : EYE_T[expr];
  for (const side of [0, 1]) {
    for (let r = 0; r < t.length; r++) {
      for (let i = 0; i < 7; i++) {
        const ch = t[r][i];
        if (ch === '.') continue;
        const x = side ? 95 - (FACE.eyeL[0] - 1 + i) : FACE.eyeL[0] - 1 + i;
        M.set(x, FACE.eyeY - 1 + r, pal[ch]);
      }
    }
  }
}

function drawBrows(M, a, expr) {
  // 表情眉画在头发上面，用接近睫毛的深色才看得清
  const strong = expr === 'sad' || expr === 'angry' || expr === 'shock';
  const c = strong ? mix([30, 20, 34], a.hair, 0.15) : mix(dk(a.hair, 3), [40, 28, 44], 0.3);
  const B = { angry: [[36, 30], [37, 30], [38, 31], [39, 31], [40, 32], [41, 32], [42, 33]], sad: [[37, 33], [38, 32], [39, 32], [40, 31], [41, 31], [42, 30]],
    shock: [[37, 30], [38, 29], [39, 29], [40, 29], [41, 29], [42, 30]] }[expr] || [[37, 32], [38, 31], [39, 31], [40, 31], [41, 31], [42, 32]];
  for (const [x, y] of B) {
    M.set(x, y, c); M.set(95 - x, y, c);
    if (strong && x > 38 && x < 42) { M.set(x, y + 1, c); M.set(95 - x, y + 1, c); }
  }
}

function drawMouth(M, sk, expr) {
  const ln = mix([110, 50, 64], sk[1], 0.2), dkm = [128, 44, 60], tg = [226, 120, 128];
  const P = (x, y, c) => M.set(x, y, c);
  if (expr === 'smile') {
    P(45, 46, ln); P(50, 46, ln); P(46, 47, ln); P(47, 47, dkm); P(48, 47, dkm); P(49, 47, ln); P(47, 48, mix(tg, sk[1], 0.3)); P(48, 48, mix(tg, sk[1], 0.3));
  } else if (expr === 'sad') {
    P(46, 48, ln); P(47, 47, ln); P(48, 47, ln); P(49, 48, ln);
  } else if (expr === 'angry') {
    P(45, 48, ln); P(46, 47, ln); P(47, 47, ln); P(48, 47, ln); P(49, 47, ln); P(50, 48, ln);
  } else if (expr === 'shock') {
    P(47, 46, ln); P(48, 46, ln); P(47, 47, dkm); P(48, 47, dkm); P(47, 48, ln); P(48, 48, ln);
  } else if (expr === 'closed') {
    P(47, 47, mix(ln, sk[0], 0.3)); P(48, 47, mix(ln, sk[0], 0.3));
  } else {
    P(46, 47, mix(ln, sk[0], 0.6)); P(47, 47, ln); P(48, 47, mix(ln, sk[0], 0.25));
  }
}

function drawCheeks(M, sk, expr) {
  const k = expr === 'smile' || expr === 'shock' || expr === 'angry' ? 0.4 : 0.2;
  const b = mix(sk[0], [255, 110, 136], k);
  for (const x of [39, 40, 41, 54, 55, 56]) M.set(x, 42, b);
  if (k > 0.3) for (const x of [40, 55]) M.set(x, 43, mix(b, sk[0], 0.4));
}

// —— 头发 ——
// 前发（刘海+两侧发束）下缘折线，从左到右；会和 y=17 的上缘围成多边形
const BANGS = {
  short: [[33, 26], [32.2, 38], [33.4, 47.5], [35.4, 40], [36.6, 33], [38.4, 30], [40, 35.6], [42.2, 29.5], [44.6, 37], [46.4, 31],
    [48.6, 39], [50.2, 31], [52.4, 35.5], [55.2, 29.5], [57, 34.6], [58.8, 32], [60.2, 40], [62.4, 47.5], [63.6, 38], [63.2, 26]],
  bob: [[32.5, 26], [31.6, 46], [32.4, 52.5], [34.4, 51], [35.6, 44], [36.2, 34], [38.2, 31], [39.8, 35.8], [42.4, 31], [44.8, 36.4],
    [47.2, 31.5], [48.8, 37], [50.8, 31.5], [53.4, 36], [55.6, 31], [57.6, 35], [59.6, 33], [60.4, 44], [61.6, 51], [63.6, 52.5], [64.4, 46], [63.5, 26]],
  long: [[32.5, 26], [31.4, 44], [32.6, 56], [34.8, 49], [35.8, 40], [36.6, 32], [39, 36], [41.6, 29], [44, 37.4], [46, 30], [47.8, 39],
    [50, 30.5], [52.4, 36.4], [55, 29.5], [57.6, 35], [59.4, 33], [60.2, 41], [61.4, 49], [63.4, 56], [64.6, 44], [63.5, 26]],
  spiky: [[33, 26], [31, 36], [32.6, 44], [35, 38.6], [36, 32], [38.4, 29], [39.8, 36], [42.6, 28], [44.4, 36.6], [47, 28.6], [48.6, 38.6],
    [51, 29], [53, 36], [55.6, 28.6], [57.4, 35], [59.4, 31.5], [61.2, 38.6], [63.6, 44], [65, 36], [63, 26]],
  messy: [[33, 26], [31.4, 39], [33.2, 46], [35.4, 39.4], [36.4, 31.5], [38.6, 34.6], [40.4, 29.5], [42.6, 36.6], [44.6, 30], [46.4, 38],
    [48.4, 30.6], [50.6, 37.2], [52.4, 30], [54.8, 36], [56.6, 30.4], [58.4, 35], [59.6, 33], [61, 41], [63, 46.5], [64.6, 39], [63, 26]],
  ponytail: [[33, 26], [32.4, 40], [33.6, 48.5], [35.6, 41], [36.4, 32], [39, 30], [40.6, 35.4], [43.4, 29.6], [45.6, 36.8], [47.6, 30],
    [50.4, 37.6], [52, 30.4], [54.6, 35.6], [57, 29.6], [58.8, 34], [60.4, 41], [62.4, 48.5], [63.6, 40], [63, 26]],
  twin: [[32.5, 26], [31.8, 42], [33, 50], [35.2, 43], [36.2, 33], [38.2, 31], [40, 36], [42.4, 31], [44.6, 36.6], [47, 31], [48.6, 37.6],
    [51, 31.2], [53, 36], [55.6, 31], [57.6, 35.2], [59.6, 33], [60.6, 43], [62.8, 50], [64.2, 42], [63.5, 26]],
};
const BANG_TIPS = {};
for (const k in BANGS) {
  const p = BANGS[k];
  BANG_TIPS[k] = p.filter((q, i) => i > 0 && i < p.length - 1 && q[1] > p[i - 1][1] && q[1] > p[i + 1][1] && q[0] > 35 && q[0] < 61);
}

function drawBackHair(L, a) {
  const c = a.hair, st = a.style;
  if (st === 'buzz') return;
  L.ell(48, 29, 16.5, 16, c, st === 'short' || st === 'spiky' || st === 'messy' || st === 'ponytail' ? (x, y) => y <= 34 : null);
  if (st === 'short' || st === 'ponytail') {
    L.poly([[32, 30], [31, 44], [33.5, 49], [36, 46], [60, 46], [62.5, 49], [65, 44], [64, 30]], c);
  } else if (st === 'long') {
    L.poly([[32.5, 30], [29, 50], [27, 66], [26.4, 80], [32, 76], [36, 80], [40, 74], [56, 74], [60, 80], [64, 76], [69.6, 80], [69, 66], [67, 50], [63.5, 30]], c);
  } else if (st === 'bob') {
    L.poly([[32, 30], [30, 46], [31, 54], [35, 52], [40, 55], [56, 55], [61, 52], [65, 54], [66, 46], [64, 30]], c);
  }
  if (st === 'ponytail') {
    L.curve([60, 18], [78, 18], [77, 52], (t) => 4.4 - 2.6 * t + 2 * Math.sin(Math.PI * t), () => c);
    L.poly([[74.4, 50], [76.4, 60], [79.2, 52]], c);
  } else if (st === 'twin') {
    for (const s of [-1, 1]) {
      L.curve([48 + s * 14, 24], [48 + s * 27, 34], [48 + s * 25, 66], (t) => 4.6 - 2.6 * t + 1.2 * Math.sin(Math.PI * t), () => c);
      L.poly([[48 + s * 23.4, 64], [48 + s * 24.6, 74], [48 + s * 27, 64]], c);
    }
  } else if (st === 'messy' || st === 'spiky') {
    L.poly([[33, 28], [26, 38], [31.5, 39], [27, 48], [34, 45], [35, 50], [40, 46], [56, 46], [61, 50], [62, 45], [69, 48], [64.5, 39], [70, 38], [63, 28]], c);
  }
}

function drawFrontHair(L, a, hood, bare) {
  const c = a.hair, st = a.style;
  if (st === 'buzz') {
    L.ell(48, 29, 15.2, 14.4, c, (x, y) => y <= 24 || (y <= 33 && (x < 35 || x > 60)));
    L.poly([[33.6, 22], [33.6, 30], [35.2, 34], [36.4, 26.4], [38.2, 24.6], [40, 27.4], [42.2, 24.6], [44.4, 28], [46.6, 24.8], [48.8, 28.2],
      [50.8, 24.6], [53, 27.4], [55.2, 24.6], [57.6, 26.8], [59.6, 25.6], [60.8, 34], [62.4, 30], [62.4, 22]], c);
    return;
  }
  L.ell(48, 29, 15.6, 15, c, (x, y) => y <= 29);
  // 两侧翘起的发梢
  let p = BANGS[st] || BANGS.short;
  if (hood) p = p.map(([x, y]) => [x < 36 ? Math.max(x, 34.2) : x > 60 ? Math.min(x, 61.8) : x, x < 36 || x > 60 ? Math.min(y, 46) : y]);
  L.poly([[p[0][0], 17], ...p, [p[p.length - 1][0], 17]], (x, y) => (y >= 27 || ((x + 0.5 - 48) / 16.4) ** 2 + ((y + 0.5 - 29.5) / 15.4) ** 2 <= 1 ? c : null));
  // 头顶翘起的几撮头发：打破圆滚滚的头盔轮廓（戴帽子时不画）
  if (bare && st !== 'spiky') {
    const v = hash(a) % 3;
    if (v === 0) { L.poly([[42, 15.4], [45.4, 11.4], [49, 14.4]], c); L.poly([[50, 14.4], [54.6, 12.4], [55, 16]], c); }
    else if (v === 1) { L.poly([[39, 16.4], [41.4, 12.6], [46, 14.6]], c); L.poly([[47, 14.2], [51.6, 11.6], [53, 14.8]], c); }
    else { L.poly([[44, 14.8], [49, 11.2], [52, 14.4]], c); L.poly([[55, 15.6], [59.4, 14.6], [58.4, 18.4]], c); }
  }
  if (st === 'spiky') {
    L.poly([[36, 19], [31, 9], [41, 15]], c); L.poly([[43, 15], [47, 5], [51, 15]], c); L.poly([[55, 15], [64, 8], [60, 20]], c);
  }
}

// 头发细节：天使环（沿发流方向的一串短亮笔）、发束分界暗线、刘海下缘阴影
function hairPost(L, a) {
  const c = a.hair, hi = lt(c, 2), hm = lt(c, 1), sd = dk(c, 2), s1 = dk(c, 1);
  const st = a.style;
  if (st !== 'buzz') {
    // 天使环：一条连续的亮带，下缘锯齿，每隔几格断开一次
    for (let x = 36; x <= 60; x++) {
      const k = (x - 47.5) / 12.5;
      const y = Math.round(29.5 - 9.5 * Math.sqrt(Math.max(0, 1 - k * k)));
      const seg = (x - 36) % 6;
      if (seg === 5) continue;
      const len = [2, 3, 4, 3, 2][seg];
      for (let j = 0; j < len; j++) if (L.get(x, y + j)) L.set(x, y + j, j < len - 1 && j < 2 ? hi : hm);
    }
    // 垂下来的侧发整体压暗一阶：脸两侧有前后层次
    for (let y = 41; y <= L.y1; y++) for (let x = L.x0; x <= L.x1; x++) {
      const col = L.get(x, y);
      if (col === c) L.set(x, y, s1); else if (col === hm) L.set(x, y, c);
    }
    // 发束分界：从刘海的凹处往头顶方向画暗线
    const p = BANGS[st];
    if (p) {
      // 其中一条分界一直画到头顶，当作发缝（偏左或偏右）
      const valleys = [];
      for (let i = 1; i < p.length - 1; i++) if (p[i][1] < p[i - 1][1] && p[i][1] < p[i + 1][1] && p[i][0] > 39 && p[i][0] < 57) valleys.push(i);
      const partI = valleys.length ? valleys[hash(a) % valleys.length] : -1;
      for (let i = 1; i < p.length - 1; i++) {
        const [x, y] = p[i];
        if (!(y < p[i - 1][1] && y < p[i + 1][1]) || x < 35 || x > 61) continue;
        const part = i === partI;
        for (let k = 0; k < (part ? 20 : 6); k++) {
          const px = Math.round(x + (48 - x) * k * 0.06), py = Math.floor(y) - k;
          if (py < 16) break;
          if (L.get(px, py) && L.get(px, py) !== hi) L.set(px, py, k < 3 ? sd : s1);
        }
      }
      // 每个发尖的右半边压暗：一簇一簇的体积
      for (const [x, y] of BANG_TIPS[st] || []) {
        for (let k = 1; k < 6; k++) {
          const px = Math.round(x), py = Math.floor(y) - k;
          if (L.get(px, py)) L.set(px, py, s1);
          if (k < 3 && L.get(px + 1, py)) L.set(px + 1, py, s1);
        }
      }
    }
  }
}

// —— 种族特征 ——
const PINK = [240, 164, 176];
function earPair(L, outer, inner, fc, ic) {
  L.poly(outer, fc); L.poly(mir(outer), fc);
  if (inner) { L.poly(inner, ic); L.poly(mir(inner), ic); }
}
// 耳朵里的白色绒毛簇
function tuft(L, pts, col) { for (const [x, y] of pts) { L.set(x, y, col); L.set(95 - x, y, col); } }
const TOPF = {
  feline: (L, fc) => {
    earPair(L, [[34.6, 22], [33.4, 9], [34.6, 4.6], [36.4, 5], [46, 16.5]], [[36.4, 19], [35.8, 10], [37, 8.4], [42.6, 16.4]], fc, mix(dk(fc, 2), PINK, 0.45));
    tuft(L, [[37, 18], [38, 17], [37, 16], [38, 15], [39, 17], [38, 13]], mix(fc, WHITE, 0.7));
  },
  lupo: (L, fc) => {
    earPair(L, [[33.4, 23], [31.6, 8], [32.4, 1], [34.4, 1], [45.6, 16]], [[35.6, 20], [34.4, 9], [35, 5], [42, 16.4]], fc, dk(fc, 2));
    tuft(L, [[36, 19], [37, 18], [36, 17], [37, 16], [36, 15], [38, 17], [37, 14], [36, 13]], mix(fc, WHITE, 0.75));
    for (let y = 0; y < 6; y++) for (let x = 30; x < 37; x++) { if (L.get(x, y)) { L.set(x, y, dk(fc, 2)); L.set(95 - x, y, dk(fc, 2)); } }
  },
  vulpo: (L, fc) => {
    earPair(L, [[31.6, 24], [28, 9], [28, 1], [31, 0], [46.4, 15]], [[33.6, 21], [30.6, 10], [31, 4.5], [42.6, 15.6]], fc, [252, 244, 232]);
    const tip = [62, 46, 56];
    for (let y = 0; y < 8; y++) for (let x = 26; x < 36; x++) {
      const c = L.get(x, y);
      if (c && (c === fc || y < 5)) { L.set(x, y, tip); L.set(95 - x, y, tip); }
    }
  },
  cautus: (L, fc) => {
    L.ellR(40, 8, 3.6, 10.4, -0.24, fc); L.ellR(40.3, 9, 1.6, 7.6, -0.24, PINK);
    L.ellR(57, 9.5, 3.6, 9.6, 0.5, fc); L.ellR(56.8, 10.2, 1.6, 7, 0.5, PINK);
  },
  perro: (L, fc) => {
    const c = dk(fc, 1);
    for (const s of [0, 1]) {
      const f = (x) => (s ? 96 - x : x);
      L.poly([[f(40), 15.4], [f(34), 15], [f(27.6), 19], [f(24.6), 27], [f(24.4), 35], [f(26.4), 39.6], [f(29.4), 38.6], [f(31.4), 31], [f(34), 23], [f(39), 19.4]], c);
    }
  },
  ursus: (L, fc) => {
    for (const x of [35.5, 60.5]) { L.ell(x, 17, 5, 4.8, fc); L.ell(x + (x < 48 ? 0.3 : -0.3), 17.6, 2.4, 2.3, mix(dk(fc, 2), PINK, 0.2)); }
  },
  zalak: (L, fc) => {
    earPair(L, [[35, 21], [33.8, 12], [35, 9.2], [37.4, 9.2], [43.6, 16.4]], [[36.4, 18.6], [35.8, 12.6], [37.2, 11.2], [41, 16.4]], fc, mix(dk(fc, 2), PINK, 0.3));
    tuft(L, [[35, 9], [36, 8]], dk(fc, 2));
  },
  sarkaz: (L) => {
    const hc = [76, 58, 84], band = [118, 96, 124];
    for (const s of [0, 1]) {
      const f = (x) => (s ? 96 - x : x);
      L.curve([f(40), 18.6], [f(33), 0], [f(21), 7], (t) => 2.7 * (1 - t) + 0.9, (t) => (Math.floor(t * 12) % 3 === 0 && t < 0.8 ? band : hc));
      L.curve([f(21), 7], [f(18), 10], [f(20.5), 13.5], () => 0.9, () => hc, 12);
    }
  },
  vouivre: (L) => {
    const hc = [236, 226, 204], tip = [190, 168, 138];
    for (const s of [0, 1]) {
      const f = (x) => (s ? 96 - x : x);
      L.curve([f(41), 20], [f(38), 10], [f(31.5), 1.5], (t) => 2.6 * (1 - t) + 0.6, (t) => (t > 0.72 ? tip : hc));
      L.poly([[f(39), 13], [f(35), 12], [f(38.4), 10]], hc);
    }
  },
  liberi: (L, fc) => {
    const a = lt(fc, 1), b = fc, c = dk(fc, 1);
    for (const s of [-1, 1]) {
      const f = (x) => 48 + s * (x - 48);
      L.ellR(f(27), 20, 7.6, 2.4, s * 0.62, a);
      L.ellR(f(25.4), 25.5, 8.4, 2.6, s * 0.3, b);
      L.ellR(f(27), 31, 7, 2.2, s * 0.02, c);
    }
  },
};
function topPost(L, R, fc) {
  if (R === 'liberi') {
    for (const s of [0, 1]) {
      const f = (x) => (s ? 96 - x : x);
      L.line(f(33), 24, f(22), 16, lt(fc, 2)); L.line(f(33), 27, f(18), 23, lt(fc, 1)); L.line(f(33), 31, f(21), 31, fc);
    }
  }
  if (R === 'sarkaz' || R === 'vouivre') {
    // 角的高光：上边一条亮线
    const src = L.c.slice();
    for (let y = L.y0 + 1; y <= L.y1; y++) for (let x = L.x0; x <= L.x1; x++) {
      const c = src[y * L.w + x];
      if (c && !src[(y - 1) * L.w + x]) L.set(x, y, lt(c, 2));
    }
  }
}

const TAILS = {
  feline: (L, fc) => { L.curve([72, 80], [96, 78], [88, 46], () => 1.8, () => fc); L.curve([88, 46], [85, 38], [92, 37], () => 1.8, () => fc, 20); },
  lupo: (L, fc) => furCurve(L, [72, 80], [96, 74], [88, 42], (t) => 5.8 * (1 - t ** 3) + 1, (t) => (t > 0.86 ? dk(fc, 1) : fc)),
  vulpo: (L, fc) => furCurve(L, [68, 80], [104, 80], [86, 30], (t) => 3 + 8 * Math.sin(Math.PI * t * 0.9), (t) => (t > 0.8 ? WHITE : t > 0.74 ? mix(fc, WHITE, 0.55) : fc)),
  perro: (L, fc) => furCurve(L, [74, 79], [92, 78], [88, 58], (t) => 3 + 1.8 * Math.sin(Math.PI * t), () => fc),
  zalak: (L, fc) => {
    furCurve(L, [70, 80], [106, 74], [84, 32], (t) => 3 + 5.6 * Math.sin(Math.PI * t), () => fc);
    furCurve(L, [84, 32], [74, 24], [76, 36], () => 3.4, () => fc);
  },
  vouivre: (L, fc, a) => L.curve([70, 80], [100, 80], [90, 44], (t) => 6 * (1 - t) + 1.2, () => a.scale || [92, 128, 96]),
};
const TAIL_P = { lupo: [[72, 80], [96, 74], [88, 42]], vulpo: [[68, 80], [104, 80], [86, 30]], zalak: [[70, 80], [106, 74], [84, 32]], perro: [[74, 79], [92, 78], [88, 58]] };
function tailPost(L, R, a) {
  const P = TAIL_P[R];
  if (P) {
    // 毛流：沿尾巴方向的亮/暗短线
    for (let i = 6; i < 58; i += 4) {
      const [x, y, dx, dy] = bez(P, i / 64);
      const n = Math.hypot(dx, dy) || 1, tx = dx / n, ty = dy / n, nx = -ty, ny = tx;
      const off = (i % 8 === 6 ? -1.6 : 1.4) * (1 + (i % 3) * 0.6);
      for (let k = 0; k < 3; k++) L.tint(x + nx * off + tx * k, y + ny * off + ty * k, (c) => (off < 0 ? lt(c, 1) : dk(c, 1)));
    }
  }
  if (R !== 'vouivre') return;
  const sc = a.scale || [92, 128, 96];
  const Q = [[70, 80], [100, 80], [90, 44]];
  for (let i = 1; i < 12; i++) {
    const [x, y] = bez(Q, i / 13);
    const r = 6 * (1 - i / 13) + 1.2;
    L.set(x - 1, y, lt(sc, 1)); L.set(x, y + 1, dk(sc, 1));
    if (i % 2) { L.set(x + r * 0.7 + 1, y - r * 0.5, dk(sc, 2)); L.set(x + r * 0.7 + 1, y - r * 0.5 - 1, dk(sc, 2)); }
  }
}

// —— 身体：露出肩膀的半身像，机能风服装 ——
const BODY_L = [[20, 80], [20.4, 73], [22, 67.6], [25.6, 63.6], [31.4, 60.4], [38, 57.8], [42, 56.4]];
const BODY = [...BODY_L, ...BODY_L.map(([x, y]) => [PW - x, y]).reverse()];
function palette(a) {
  const c = a.cloth || CLOTHES[0], h = hash(a);
  let acc = a.accent || ACCENTS[h % ACCENTS.length];
  if (!a.accent && Math.abs(lum(acc) - lum(c)) < 40) acc = ACCENTS[(h + 2) % ACCENTS.length];
  const strap = lum(c) < 70 ? [96, 94, 104] : [40, 38, 46];
  const inner = lum(c) < 70 ? [214, 212, 210] : [40, 40, 48];
  if (!a.accent) acc = mix(acc, c, 0.12);
  return { c, acc, strap, inner, metal: [196, 198, 208] };
}
function drawBody(L, a, P) {
  const { c, inner } = P;
  L.poly(BODY, c);
  switch (a.top) {
    case 'coat':
      L.poly([[43, 56], [53, 56], [55, 80], [41, 80]], inner);
      L.rect(44, 51, 8, 6, inner);
      break;
    case 'suit':
      L.poly([[42, 56], [54, 56], [48, 71]], [238, 236, 232]);
      break;
    case 'hoodie':
      L.poly([[44, 56], [52, 56], [48, 62]], inner);
      break;
  }
  if (a.x && a.x.fill) a.x.fill(L, P);
}
function bodyPost(L, a, P) {
  const { c, acc, strap, metal } = P, cd = dk(c, 1), cd2 = dk(c, 2), gold = [230, 186, 84];
  // 右侧手臂整体在暗面
  for (let y = 62; y < 80; y++) for (let x = 66; x < 82; x++) {
    const ax = 66 + (y - 64) * 0.06;
    const col = L.get(x, y);
    if (col && x > ax && (col === c || col === lt(c, 1))) L.set(x, y, cd);
  }
  L.line(29, 65, 28, 80, cd2); L.line(66, 65, 67, 80, cd2);
  switch (a.top) {
    case 'coat': {
      // 敞开的大衣：前襟亮色滚边、斜挎的皮带和搭扣
      L.line(43, 57, 41, 80, cd2); L.line(52, 57, 54, 80, cd2);
      L.line(42, 58, 40, 80, acc); L.line(53, 58, 55, 80, acc);
      for (let i = 0; i < 4; i++) L.line(29 + i, 60, 60 + i, 80, i === 0 || i === 3 ? dk(strap, 1) : strap);
      L.rect(44, 69, 3, 3, metal); L.set(45, 70, dk(metal, 2));
      // ID 牌
      L.line(47, 57, 47, 61, metal); L.rect(46, 62, 3, 4, [232, 232, 236]); L.set(47, 63, acc); L.set(47, 64, [80, 80, 90]);
      break;
    }
    case 'hoodie': {
      L.line(48, 62, 48, 80, metal); L.rect(48, 63, 1, 2, lt(metal, 2));
      L.line(44, 57, 43, 66, [232, 230, 226]); L.line(51, 57, 52, 66, [232, 230, 226]);
      L.rect(43, 67, 1, 2, acc); L.rect(52, 67, 1, 2, acc);
      // 袖子上的两道亮色条纹、袋口
      for (const y of [71, 74]) { L.line(21, y + 1, 27, y, acc); L.line(68, y, 74, y + 1, dk(acc, 1)); }
      L.line(34, 76, 46, 76, cd2); L.line(50, 76, 62, 76, cd2);
      L.rect(57, 63, 4, 2, acc); L.set(60, 64, lt(acc, 2));
      break;
    }
    case 'jacket': {
      L.line(48, 57, 48, 80, metal); L.rect(48, 59, 1, 2, lt(metal, 2));
      // 胸前挂具：两条肩带 + 一条胸带 + 搭扣
      for (const [x0, x1] of [[34, 36], [61, 59]]) { L.line(x0, 58, x1, 80, strap); L.line(x0 + 1, 58, x1 + 1, 80, dk(strap, 1)); }
      L.line(35, 68, 61, 68, strap); L.line(35, 69, 61, 69, dk(strap, 1));
      L.rect(45, 67, 6, 4, metal); L.rect(46, 68, 4, 2, dk(metal, 2)); L.set(46, 67, lt(metal, 2));
      L.rect(33, 71, 3, 4, [232, 232, 236]); L.set(34, 72, acc); L.set(34, 70, metal);
      L.rect(68, 67, 5, 4, acc); L.line(69, 68, 71, 68, lt(acc, 2)); L.set(68, 70, dk(acc, 2));
      break;
    }
    case 'suit': {
      const lap = [[41, 56], [44.5, 57], [48, 71], [46.5, 73], [38.5, 62], [40.5, 59]];
      for (const p of [lap, mir(lap)]) L.poly(p, cd);
      L.line(44, 57, 47.5, 71, cd2); L.line(51, 57, 48, 71, cd2);
      const t = a.tie || [150, 40, 40];
      L.rect(47, 57, 2, 2, dk(t, 1)); L.poly([[46.6, 59], [49.4, 59], [49.8, 67], [48, 69.4], [46.2, 67]], t); L.set(47, 60, lt(t, 1));
      L.set(41, 62, acc); L.set(41, 63, dk(acc, 1));
      L.rect(57, 63, 3, 1, [236, 236, 240]);
      L.set(48, 75, cd2); L.set(48, 78, cd2);
      break;
    }
    case 'uniform': {
      L.line(48, 57, 48, 80, cd2);
      for (const y of [61, 66, 71, 76]) { L.set(44, y, gold); L.set(51, y, gold); }
      for (const s of [0, 1]) {
        const f = (x) => (s ? 95 - x : x);
        for (let x = 23; x <= 33; x++) { const y = Math.round(63 - (x - 23) * 0.3); L.set(f(x), y, gold); L.set(f(x), y + 1, dk(gold, 1)); }
      }
      // 斜挎武装带、臂章
      for (let i = 0; i < 2; i++) L.line(65 + i, 59, 38 + i, 80, i ? dk(strap, 1) : strap);
      for (let y = 69; y < 73; y++) L.line(68 + (y - 64) * 0.06, y, 74, y, y === 69 ? lt(acc, 1) : acc);
      L.set(71, 70, WHITE); L.set(70, 71, WHITE); L.set(72, 71, WHITE);
      break;
    }
  }
  if (a.x && a.x.body) a.x.body(L, P);
  if (a.badge) {
    // 罗德岛徽章
    const bx = 60, by = 70;
    L.poly([[bx, by - 4], [bx + 4, by], [bx, by + 4], [bx - 4, by]], [30, 32, 40]);
    L.set(bx, by - 2, WHITE); L.set(bx - 1, by - 1, WHITE); L.set(bx + 1, by - 1, WHITE); L.set(bx, by, [120, 220, 236]); L.set(bx, by + 1, WHITE);
    L.set(bx - 2, by, [150, 150, 160]); L.set(bx + 2, by, [150, 150, 160]);
  }
}
// 衣领：画在脖子之上
function drawCollar(L, a, P) {
  const { c } = P;
  switch (a.top) {
    case 'coat': {
      const col = [[33, 58.5], [37.6, 48], [42.6, 50.6], [44, 57], [42, 60]];
      L.poly(col, c); L.poly(mir(col), c);
      break;
    }
    case 'jacket':
      L.poly([[38.5, 58], [40, 49.4], [44, 51.2], [48, 51.8], [52, 51.2], [56, 49.4], [57.5, 58]], c);
      break;
    case 'uniform':
      L.poly([[41.5, 57.4], [42, 51.6], [48, 52.6], [54, 51.6], [54.5, 57.4]], dk(c, 1));
      break;
    case 'hoodie':
      L.poly([[38, 58], [41, 53], [44, 56], [48, 62], [52, 56], [55, 53], [58, 58], [48, 64]], dk(c, 1));
      break;
    case 'suit':
      L.poly([[43, 57.5], [44, 52], [48, 55], [52, 52], [53, 57.5], [48, 60]], [240, 238, 234]);
      break;
  }
  if (a.x && a.x.collar) a.x.collar(L, P);
}
function collarPost(L, a, P) {
  const { acc } = P;
  if (a.top === 'coat') {
    L.line(38, 49, 42, 51, acc); L.line(57, 49, 53, 51, acc);
  } else if (a.top === 'jacket') {
    for (let x = 40; x <= 55; x++) { for (let y = 48; y < 54; y++) if (L.get(x, y)) { L.set(x, y, acc); break; } }
    L.line(48, 52, 48, 57, [196, 198, 208]);
  } else if (a.top === 'uniform') {
    for (let x = 42; x <= 54; x++) { for (let y = 50; y < 54; y++) if (L.get(x, y)) { L.set(x, y, acc); break; } }
  }
  if (a.x && a.x.collarPost) a.x.collarPost(L, P);
}

function drawHat(L, a) {
  const c = a.hatColor || [110, 60, 52], cd = dk(c, 1);
  if (a.hat === 'cap') {
    L.ell(48, 27.6, 16.4, 14, c, (x, y) => y <= 24);
    L.ell(48, 25, 14, 4.2, cd, (x, y) => y >= 24);
  } else if (a.hat === 'beanie') {
    L.ell(48, 28, 16.6, 15, c, (x, y) => y <= 21);
    L.rect(31, 20, 34, 6, cd);
    L.ell(31.5, 23, 1.2, 2.8, cd); L.ell(64.5, 23, 1.2, 2.8, cd);
  } else if (a.hat === 'hood') {
    L.fill(26, 10, 70, 60, (x, y) => {
      const o = ((x - 48) / 19.5) ** 2 + ((y - 32) / 20) ** 2 <= 1;
      const i = ((x - 48) / 14.2) ** 2 + ((y - 37) / 15.6) ** 2 <= 1;
      return o && (!i || y < 22) && y < 55;
    }, c);
  }
}
function hatPost(L, a, acc) {
  const c = a.hatColor || [110, 60, 52];
  if (a.hat === 'cap') {
    L.line(48, 14, 48, 24, dk(c, 1)); L.line(47, 14, 40, 24, dk(c, 1)); L.line(48, 14, 55, 24, dk(c, 1));
    L.rect(44, 18, 3, 3, acc); L.set(44, 18, lt(acc, 2));
    for (let x = 35; x <= 60; x++) L.set(x, 24, lt(c, 1));
    L.ell(48, 28.4, 11, 0.9, dk(c, 2));
    L.set(48, 13, dk(c, 2));
  } else if (a.hat === 'beanie') {
    for (let x = 32; x < 65; x += 2) for (let y = 21; y < 25; y++) L.set(x, y, dk(c, 2));
    L.rect(57, 21, 4, 3, acc); L.set(57, 21, lt(acc, 2));
  } else if (a.hat === 'hood') {
    L.line(41, 52, 40, 62, [230, 230, 236]); L.line(54, 52, 55, 62, [230, 230, 236]);
    L.rect(40, 63, 1, 2, acc); L.rect(55, 63, 1, 2, acc);
    // 兜帽边缘的亮色滚边
    for (let y = 22; y < 55; y++) for (let x = 30; x < 66; x++) {
      if (!L.get(x, y)) continue;
      const i = ((x + 0.5 - 48) / 15.2) ** 2 + ((y + 0.5 - 37) / 16.6) ** 2 <= 1;
      if (i) L.set(x, y, dk(c, 2));
    }
  }
}

function drawGlasses(M) {
  const f = [56, 44, 64], g = [214, 228, 244];
  for (const s of [0, 1]) {
    const F = (x) => (s ? 95 - x : x);
    for (let x = 36; x <= 44; x++) { M.set(F(x), 34, f); M.set(F(x), 41, f); }
    for (let y = 35; y <= 40; y++) { M.set(F(36), y, f); M.set(F(44), y, f); }
    M.set(F(38), 39, g); M.set(F(37), 40, g);
    M.line(F(35), 36, F(33), 36, f);
  }
  M.line(45, 36, 50, 36, f);
}

function halo(L) {
  L.fill(34, 2, 62, 12, (x, y) => {
    const o = ((x - 48) / 11.5) ** 2 + ((y - 7) / 3.4) ** 2, i = ((x - 48) / 8.8) ** 2 + ((y - 7) / 1.7) ** 2;
    return o <= 1 && i > 1;
  }, (x, y) => (y < 6 ? [255, 238, 150] : y > 7 ? [228, 168, 64] : [252, 214, 100]));
}

const WING = (L) => {
  for (const s of [-1, 1]) {
    const f = (x) => 48 + s * (48 - x);
    L.ellR(f(20), 50, 9.5, 3.6, s * -0.6, [232, 238, 248]);
    L.ellR(f(18), 55, 9, 3.2, s * -0.3, WHITE);
    L.ellR(f(19), 59.5, 8, 2.8, s * -0.05, [232, 238, 248]);
  }
};

// 画一个人。o: {hatOff, expr}
// a.x 是可选的自定义图层（彩蛋角色用）：tail / wing / back / backPost / fill / body / collar / collarPost /
// face / front / hair / top / halo / over，分别替换或追加对应部件，画在同一套明暗和描边流程里。
function drawPerson(a, o = {}) {
  const M = new Pix();
  a = a.hair ? a : Object.assign({}, a, { hair: HAIRS[0] });
  const sk = SKIN[a.skin] || SKIN.light;
  const fc = a.feat || a.hair;
  const hat = a.hat && !o.hatOff ? a.hat : null;
  const R = a.race, expr = o.expr || 'neutral';
  const skd = mix(sk[1], [196, 110, 150], 0.12);
  const P = palette(a);
  const X = a.x || {};

  if (X.tail) layer(M, (L) => X.tail(L, fc, a), { post: X.tailPost });
  else if (TAILS[R]) layer(M, (L) => TAILS[R](L, fc, a), { post: (L) => tailPost(L, R, a) });
  if (X.wing) layer(M, X.wing, { shade: false });
  else if (R === 'sankta') layer(M, WING);
  if (hat === 'hood') layer(M, (L) => L.ell(48, 34, 21, 22, dk(a.hatColor || [110, 60, 52], 1)), { hl: false });
  else layer(M, (L) => { drawBackHair(L, a); if (X.back) X.back(L); }, { hl: false, post: (L) => { for (let i = 0; i < L.c.length; i++) if (L.c[i]) L.c[i] = dk(L.c[i], 1); if (X.backPost) X.backPost(L); } });
  if (a.top === 'hoodie' && hat !== 'hood') layer(M, (L) => L.ell(48, 55.5, 14.5, 5.5, dk(P.c, 1), (x, y) => y < 58), { hl: false });
  // 脖子
  layer(M, (L) => L.rect(44, 44, 8, 15, skd), {
    shade: false, line: false,
    post: (L) => { for (let y = 44; y < 59; y++) for (let x = 44; x < 52; x++) if (!inFace(x + 0.5, y + 0.5) && inFace(x + 0.5, y - 1.5)) L.set(x, y, dk(skd, 1)); },
  });
  layer(M, (L) => drawBody(L, a, P), { post: (L) => bodyPost(L, a, P) });
  if (hat !== 'hood' || a.top !== 'hoodie') layer(M, (L) => drawCollar(L, a, P), { post: (L) => collarPost(L, a, P) });
  if (hat === 'hood') layer(M, (L) => L.ell(48, 56, 13, 4, dk(a.hatColor || [110, 60, 52], 1), (x, y) => y < 59));
  if (a.acc === 'scarf') {
    const W2 = [236, 234, 230], st = mix(P.acc, W2, 0.2);
    layer(M, (L) => { L.ell(48, 54.5, 13, 4.6, W2); L.poly([[37, 56], [44, 57], [43.6, 73], [36.4, 73]], W2); }, {
      post: (L) => {
        L.line(40, 53, 44, 58, [204, 204, 214]); L.line(52, 52, 56, 57, [204, 204, 214]);
        L.line(37, 66, 43, 66, st); L.line(37, 68, 43, 68, st);
        for (let x = 37; x < 44; x += 2) L.set(x, 74, [214, 214, 222]);
      },
    });
  }
  // 脸
  const face = layer(M, (L) => L.fill(33, 21, 63, 53, inFace, sk[0]), {
    shade: false,
    post: (L) => {
      for (let y = 21; y < 54; y++) for (let x = 33; x < 64; x++) {
        if (!L.get(x, y)) continue;
        if (x > 48 && !inFace(x + 2.5, y + 0.5)) L.set(x, y, skd);
        else if (y > 44 && !inFace(x + 0.5, y + 1.5) && x >= 48) L.set(x, y, skd);
      }
    },
  });
  // 人类 / 萨卡兹的耳朵（在侧发后面）
  if (hat !== 'hood' && (R === 'sankta' || R === 'vouivre' || a.humanEars)) {
    layer(M, (L) => { L.ell(35, 38, 2.2, 3.4, sk[0]); L.ell(61, 38, 2.2, 3.4, sk[0]); }, { post: (L) => { L.set(35, 38, skd); L.set(35, 39, skd); L.set(60, 38, skd); L.set(60, 39, skd); } });
  }
  if (hat !== 'hood' && R === 'sarkaz') {
    const p = [[37, 35], [24.5, 28], [27, 32.5], [36.6, 42]];
    layer(M, (L) => { L.poly(p, sk[0]); L.poly(mir(p), sk[0]); }, { post: (L) => { L.line(34, 36, 28, 31.5, skd); L.line(61, 36, 67, 31.5, skd); } });
  }
  drawCheeks(M, sk, expr);
  drawEyes(M, a, sk, expr);
  M.set(48, 43, mix(sk[0], skd, 0.45)); M.set(48, 44, skd);
  drawMouth(M, sk, expr);
  if (!['sad', 'angry', 'shock'].includes(expr)) drawBrows(M, a, expr);
  if (X.face) X.face(M, sk, expr);
  // 前发
  const hair = layer(M, (L) => { drawFrontHair(L, a, hat === 'hood', !hat); if (X.front) X.front(L, hat); }, { post: (L) => { hairPost(L, a); if (X.hair) X.hair(L, hat); } });
  // 刘海在脸上的投影
  for (let y = 22; y < 50; y++) for (let x = 33; x < 63; x++) {
    if (face.get(x, y) && !hair.get(x, y) && (hair.get(x, y - 1) || hair.get(x - 1, y - 1) || (hair.get(x, y - 2) && y < 36))) {
      const m = M.get(x, y);
      if (m === sk[0]) M.set(x, y, skd); else if (m === skd) M.set(x, y, dk(skd, 1));
    }
  }
  if (['sad', 'angry', 'shock'].includes(expr) || a.style === 'buzz') drawBrows(M, a, expr);
  if (!hat && a.ahoge !== false && (a.style === 'messy' || a.style === 'spiky' || (a.style === 'short' && hash(a) % 3 === 0))) {
    layer(M, (L) => L.curve([49, 15], [50, 6], [56, 6], (t) => 1.2 - 0.5 * t, () => a.hair, 24), { hl: false });
  }
  if (a.style === 'ponytail' || a.style === 'twin') {
    const tie = a.hairTie || P.acc;
    if (a.style === 'ponytail') { M.rect(63, 18, 2, 4, tie); M.set(63, 18, lt(tie, 2)); }
    else { M.rect(33, 25, 2, 3, tie); M.rect(61, 25, 2, 3, tie); M.set(33, 25, lt(tie, 2)); M.set(61, 25, lt(tie, 2)); }
  }
  if (a.glasses) drawGlasses(M);
  if (expr === 'shock' || expr === 'sad') {
    const w = [170, 220, 250];
    M.set(62, 28, w); M.rect(61, 29, 3, 2, w); M.set(62, 31, [120, 180, 230]); M.set(61, 29, WHITE);
  }
  if (!hat && X.top) layer(M, (L) => X.top(L, fc), { post: X.topPost, line: true });
  else if (!hat && TOPF[R]) layer(M, (L) => TOPF[R](L, fc), { post: (L) => topPost(L, R, fc), line: true });
  if (a.acc === 'catband') {
    // 假猫耳发箍：塑料感的粉色细箍 + 没有绒毛的硬三角耳
    const k = [226, 98, 146], ki = [252, 196, 214];
    layer(M, (L) => {
      L.fill(30, 12, 66, 26, (x, y) => {
        const o = ((x - 48) / 16.4) ** 2 + ((y - 29) / 15.4) ** 2, i = ((x - 48) / 15.2) ** 2 + ((y - 29) / 14) ** 2;
        return o <= 1 && i > 1 && y < 26;
      }, k);
      earPair(L, [[36.4, 17], [37.6, 7], [44.4, 14.6]], [[38.4, 15], [38.8, 10.4], [42, 14.4]], k, ki);
    }, {
      shade: false, line: false,
      post: (L) => {
        for (let y = 12; y < 26; y++) for (let x = 30; x < 66; x++) if (L.get(x, y) === k && !L.get(x, y - 1)) L.set(x, y, lt(k, 2));
        for (const [x, y] of [[37, 8], [36, 10], [36, 12]]) { L.set(x, y, lt(k, 2)); L.set(95 - x, y, dk(k, 1)); }
      },
    });
  }
  if (hat) layer(M, (L) => drawHat(L, a), { post: (L) => hatPost(L, a, P.acc) });
  if (X.over) X.over(M, hat, sk);
  if (R === 'sankta') layer(M, X.halo || halo, { shade: false });
  // 右侧轮廓内一圈冷色边缘光
  const rim = [];
  for (let y = 4; y < PH; y++) for (let x = 50; x < PW - 1; x++) {
    const c = M.get(x, y);
    if (c && !M.get(x + 1, y) && M.get(x - 1, y) && M.get(x - 2, y)) rim.push([x - 1, y, M.get(x - 1, y)]);
  }
  for (const [x, y, c] of rim) M.set(x, y, mix(c, [196, 222, 255], 0.38));
  M.outline('auto');
  if (R === 'sankta') {
    const g = [255, 246, 196];
    for (const [x, y] of [[35, 3], [62, 4]]) { M.set(x, y, g); M.set(x - 1, y, g); M.set(x + 1, y, g); M.set(x, y - 1, g); M.set(x, y + 1, g); }
  }
  return M;
}

// 源石探测视图：人变成青色剪影，身上的源石和可疑物品发光
const SCAN_BOX = {
  contraband: [25, 66, 15, 13], phone: [41, 68, 6, 10], reunion: [51, 63, 13, 11], keys: [64, 64, 6, 5], coins: [65, 71, 7, 6],
};
const CRYSTAL_SPOTS = [[46, 58], [38, 66], [58, 68], [30, 74], [66, 76], [48, 74], [56, 62], [34, 70]];

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
      if (i * i + j * j > r * r || (x + i + y + j) % 2) continue;
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
      S.rect(x + 5, y - 2, 5, 2, [140, 230, 230]);
      gem(x + 4, y + 5); gem(x + 10, y + 8); gem(x + 12, y + 4, 0.8); gem(x + 6, y + 10, 0.8);
    } else if (it === 'reunion') {
      S.ell(x + 6.5, y + 5.5, 6.5, 5.5, [236, 236, 236]);
      S.ell(x + 6.5, y + 5.5, 6.5, 5.5, [200, 200, 204], (px) => px > x + 9);
      S.rect(x + 2, y + 4, 3, 2, [30, 30, 30]); S.rect(x + 8, y + 4, 3, 2, [30, 30, 30]);
      S.rect(x + 4, y + 8, 5, 1, [180, 60, 50]);
      S.line(x + 1, y + 2, x + 4, y + 3, [180, 60, 50]);
    } else if (it === 'coins') {
      S.ell(x + 2.5, y + 2.5, 2.4, 2.4, [170, 230, 230]); S.ell(x + 5, y + 3.5, 2.2, 2.2, [150, 210, 210]);
      S.set(x + 5, y + 3, [90, 160, 160]);
    } else if (it === 'phone') {
      S.rect(x, y, w, h, [150, 220, 220]); S.rect(x + 1, y + 1, w - 2, h - 3, [60, 120, 130]);
      S.set(x + 3, y + h - 1, [60, 120, 130]);
    } else if (it === 'keys') {
      S.ell(x + 1.5, y + 1.5, 1.8, 1.8, [170, 230, 230]); S.set(x + 1, y + 1, [28, 78, 86]);
      S.rect(x + 3, y + 2, 3, 1, [170, 230, 230]); S.rect(x + 5, y + 3, 1, 2, [170, 230, 230]);
    }
  }
  return S;
}
