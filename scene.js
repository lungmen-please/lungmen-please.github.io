'use strict';
// 室外场景：龙门天际线、检查站闸门、排队的旅客。
// 画布 640x72（CSS 也是 640x72），检查亭里约 15fps 重画。静态部分缓存在离屏画布里。
// 最上面 16 行会被 HUD 盖住，别把重要东西放在那里。

(function () {
  const W = 640, H = 72;
  const GROUND = 70;            // 旅客脚底那一行的下方
  const QX = 160, SP = 18;      // 队首位置、队伍间距
  const DOOR_X = 92;            // 走进检查亭的位置
  const GATE_X = 125, GATE_Y = 50, GATE_LEN = 28;
  const OL = [22, 17, 22];
  const WHITE = [244, 242, 236];

  const RACE_W = { feline: 3, cautus: 2, perro: 2.5, lupo: 2.5, vulpo: 2, ursus: 2, zalak: 1.5, sarkaz: 1.2, vouivre: 1, sankta: 1.2, liberi: 1.5 };
  const PANTS = [[40, 40, 50], [52, 46, 40], [34, 38, 52], [70, 66, 62], [46, 52, 44]];
  const BAGS = [[120, 80, 50], [70, 90, 120], [140, 60, 50], [80, 80, 86]];

  const rgb = (c, a) => (a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpC = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const sh = (c, k) => c.map((v) => Math.max(0, Math.min(255, v * k)));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ———————————————— 排队旅客的外观 ————————————————
  function newLook(rand = Math.random) {
    const pickR = (a) => a[Math.floor(rand() * a.length)];
    let s = 0;
    for (const k in RACE_W) s += RACE_W[k];
    let r = rand() * s, race = 'feline';
    for (const k in RACE_W) { r -= RACE_W[k]; if (r < 0) { race = k; break; } }
    const skins = Object.keys(SKIN);
    return {
      race, hair: pickR(HAIRS), cloth: pickR(CLOTHES), skin: SKIN[race === 'sarkaz' && rand() < 0.5 ? 'pale' : pickR(skins)][0],
      pants: pickR(PANTS), tall: Math.floor(rand() * 3), long: rand() < 0.35,
      hat: rand() < 0.12 ? pickR(['cap', 'beanie', 'hood']) : null, hatColor: pickR(CLOTHES),
      bag: rand() < 0.35 ? pickR(['case', 'pack']) : null, bagColor: pickR(BAGS),
      scale: pickR([[92, 128, 96], [140, 96, 70], [96, 110, 140]]), ph: rand() * 100,
    };
  }

  // ———————————————— 小人：先拼成一组矩形，再描边、上色 ————————————————
  // 坐标：x 以身体中线为准（头占 -3..2），y 以脚底为 0、向上为负。默认面朝左（检查亭方向）。
  // 标记：1 头部（会跟着回头镜像） 2 不描边 4 腿 8 躯干（呼吸时拉长）
  function build(L, t, o) {
    const R = [];
    const add = (x, y, w, h, c, f = 0) => R.push([x, y, w, h, c, f]);
    const T = 6 + L.tall, tt = -4 - T, ht = tt - 6;
    const hair = L.hair, hd = sh(hair, 0.72), cl = L.cloth, cd = sh(cl, 0.72), sk = L.skin;
    const ph = L.ph;
    const s = Math.round(Math.sin(t * 2.6 + ph) * 1.2);
    const hat = L.hat;

    // —— 尾巴（身体后面，朝右）——
    switch (L.race) {
      case 'feline':
        add(3, -6, 1, 1, hair); add(4, -7, 1, 1, hair); add(5, -10, 1, 3, hair); add(5 + s, -12, 1, 2, hair); add(4 + s, -13, 1, 1, hair);
        break;
      case 'lupo':
        add(3, -7, 2, 2, hair); add(5, -8, 2, 3, hair); add(6 + (s > 0 ? 1 : 0), -11, 2, 3, hair); add(7 + (s > 0 ? 1 : 0), -12, 1, 1, hair);
        break;
      case 'vulpo':
        add(3, -7, 2, 2, hair); add(4, -11, 4, 5, hair); add(5 + s, -14, 4, 4, hair); add(6 + s, -16, 3, 2, WHITE); add(5 + s, -15, 1, 1, WHITE);
        break;
      case 'perro': {
        const w = Math.round(Math.sin(t * 14 + ph));
        add(3, -7, 1, 1, hair); add(4, -9 + (w > 0 ? 0 : 1), 1, 2, hair);
        break;
      }
      case 'zalak':
        add(3, -6, 2, 2, hair); add(4, -11, 3, 5, hair); add(4, -15, 3, 4, hair); add(3 + (s < 0 ? -1 : 0), -17, 3, 2, hair); add(3, -16, 1, 1, hd);
        break;
      case 'vouivre': {
        const sc = L.scale;
        add(3, -6, 2, 3, sc); add(5, -4, 2, 2, sc); add(7, -3, 2, 2, sc); add(9, -2, 1, 1, sc); add(5, -4, 1, 1, sh(sc, 0.7)); add(7, -3, 1, 1, sh(sc, 0.7));
        break;
      }
      case 'cautus':
        add(3, -7, 1, 1, WHITE);
        break;
    }
    // —— 萨科塔的小翅膀 ——
    if (L.race === 'sankta') { add(2, tt, 3, 2, WHITE); add(3, tt + 2, 3, 1, WHITE); add(4, tt - 1, 1, 1, WHITE); }
    // —— 腿 ——
    const pc = L.pants, pd = sh(pc, 0.6);
    if (o.walking) {
      const wf = Math.floor(t * 7 + ph) % 2;
      add(-3, -4, 2, wf ? 3 : 4, pc, 4); add(0, -4, 2, wf ? 4 : 3, pc, 4);
      add(wf ? -4 : -3, wf ? -2 : -1, 2, 1, pd, 4); add(wf ? 0 : 1, wf ? -1 : -2, 2, 1, pd, 4);
    } else {
      add(-3, -4, 2, 4, pc, 4); add(0, -4, 2, 4, pc, 4);
      add(-4, -1, 3, 1, pd, 4); add(-1, -1, 3, 1, pd, 4);
    }
    // —— 背包 ——
    if (L.bag === 'pack') { add(3, tt + 1, 2, 4, L.bagColor, 8); }
    // —— 躯干 ——
    add(-3, tt, 6, T, cl, 8);
    add(2, tt, 1, T, cd, 8);
    add(-1, tt + 2, 1, T - 3, cd, 8);
    add(-2, tt, 3, 1, sh(cl, 1.2), 8);
    if (L.guard) { add(-3, tt + 3, 6, 1, [204, 170, 64], 8); add(-5, tt + 2, 1, 6, [30, 30, 34], 8); }
    // —— 行李箱 ——
    if (L.bag === 'case') { add(-9, -6, 5, 6, L.bagColor, 4); add(-8, -7, 3, 1, sh(L.bagColor, 0.6), 4); add(-9, -3, 5, 1, sh(L.bagColor, 0.8), 4); }
    // —— 头 ——
    add(-3, ht + 1, 6, 4, sk, 1); add(-2, ht, 4, 6, sk, 1);
    // 侧面的耳朵
    if (!hat && L.race === 'sarkaz') add(-4, ht + 2, 1, 2, sk, 1);
    if (!hat && (L.race === 'sankta' || L.race === 'vouivre')) add(1, ht + 2, 1, 2, sh(sk, 0.9), 1);
    // 头发
    add(-2, ht - 1, 5, 1, hair, 1); add(-3, ht, 6, 1, hair, 1); add(-3, ht + 1, 2, 1, hair, 1);
    add(0, ht + 1, 3, 3, hair, 1);
    if (L.long) add(1, ht + 4, 2, 4, hair, 1);
    // 眼睛
    const blink = Math.sin(t * 1.3 + ph * 2) > 0.97;
    add(-2, ht + 3, 1, blink ? 0 : 1, [40, 28, 30], 1 | 2);
    // —— 头上的种族特征（帽子会挡住）——
    if (!hat) {
      switch (L.race) {
        case 'feline': add(-3, ht - 3, 1, 2, hair, 1); add(-2, ht - 2, 1, 1, hair, 1); add(2, ht - 3, 1, 2, hair, 1); add(1, ht - 2, 1, 1, hair, 1); break;
        case 'lupo': add(-3, ht - 4, 1, 3, hair, 1); add(-2, ht - 3, 1, 2, hair, 1); add(2, ht - 4, 1, 3, hair, 1); add(1, ht - 3, 1, 2, hair, 1); break;
        case 'vulpo':
          add(-4, ht - 5, 1, 4, hair, 1); add(-3, ht - 4, 2, 3, hair, 1); add(-3, ht - 3, 1, 1, WHITE, 1 | 2);
          add(2, ht - 5, 1, 4, hair, 1); add(0, ht - 4, 2, 3, hair, 1); add(1, ht - 3, 1, 1, WHITE, 1 | 2);
          break;
        case 'cautus': {
          const fl = Math.sin(t * 0.9 + ph) > 0.7 ? 1 : 0;   // 偶尔耷拉一下
          add(-2, ht - 7, 1, 6, hair, 1); add(1, ht - 7 + fl, 1, 6 - fl, hair, 1); if (fl) add(2, ht - 6, 1, 1, hair, 1);
          add(-2, ht - 5, 1, 2, [234, 164, 162], 1 | 2);
          break;
        }
        case 'perro': add(-4, ht, 1, 4, hd, 1); add(3, ht, 1, 4, hd, 1); break;
        case 'ursus': add(-4, ht - 2, 2, 2, hair, 1); add(2, ht - 2, 2, 2, hair, 1); add(-4, ht - 2, 1, 1, hd, 1 | 2); add(3, ht - 2, 1, 1, hd, 1 | 2); break;
        case 'zalak': add(-3, ht - 3, 1, 2, hair, 1); add(2, ht - 3, 1, 2, hair, 1); add(-3, ht - 4, 1, 1, hd, 1); add(2, ht - 4, 1, 1, hd, 1); break;
        case 'sarkaz': {
          const hc = [74, 58, 70];
          add(-2, ht - 3, 1, 2, hc, 1); add(-1, ht - 4, 2, 1, hc, 1); add(1, ht - 3, 1, 1, hc, 1);
          add(1, ht - 2, 1, 1, hc, 1); add(2, ht - 3, 2, 1, hc, 1); add(3, ht - 2, 1, 1, hc, 1);
          break;
        }
        case 'vouivre': {
          const hc = [228, 214, 182];
          add(-2, ht - 2, 1, 1, hc, 1); add(-1, ht - 3, 1, 1, hc, 1); add(0, ht - 4, 1, 1, hc, 1);
          add(1, ht - 2, 1, 1, hc, 1); add(2, ht - 3, 1, 1, hc, 1); add(3, ht - 4, 1, 1, hc, 1);
          break;
        }
        case 'liberi': {
          const lt = [Math.min(255, hair[0] + 50), Math.min(255, hair[1] + 50), Math.min(255, hair[2] + 50)];
          add(-4, ht + 1, 1, 2, lt, 1); add(-5, ht, 1, 2, lt, 1); add(3, ht + 1, 1, 2, lt, 1); add(4, ht, 1, 2, lt, 1);
          break;
        }
      }
    } else {
      const hc = L.hatColor, hcd = sh(hc, 0.75);
      if (hat === 'cap' || hat === 'guard') {
        add(-3, ht - 2, 6, 3, hc, 1); add(-5, ht, 3, 1, hat === 'guard' ? [24, 24, 30] : hcd, 1);
        if (hat === 'guard') add(-3, ht, 6, 1, [204, 170, 64], 1 | 2);
      } else if (hat === 'beanie') {
        add(-3, ht - 2, 6, 3, hc, 1); add(-3, ht, 6, 1, hcd, 1); add(-1, ht - 3, 2, 1, hcd, 1);
      } else {
        add(-3, ht - 2, 6, 3, hc, 1); add(0, ht - 1, 4, 7, hc, 1); add(3, ht + 1, 1, 6, hcd, 1);
      }
    }
    if (L.race === 'sankta') add(-3, ht - 4 + (Math.sin(t * 2 + ph) > 0 ? 0 : 1), 6, 1, [252, 216, 92], 1 | 2);
    return R;
  }

  // o: {walking, faceRight, lookBack, lift, breath}
  function drawFig(ctx, L, X, t, o) {
    const R = build(L, t, o);
    const Y = GROUND - (o.lift || 0);
    const br = o.breath || 0;
    const place = (r) => {
      let [x, y, w, h, , f] = r;
      if ((f & 1) && o.lookBack) x = -x - w;
      if (o.faceRight) x = -x - w;
      if (f & 1) y -= br;
      if (f & 8) { y -= br; h += br; }
      return [Math.round(X + x), Y + y, w, h];
    };
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(Math.round(X) - 5, GROUND - 1, 10, 2);
    ctx.fillStyle = rgb(OL);
    for (const r of R) { if (r[5] & 2 || r[3] <= 0) continue; const [x, y, w, h] = place(r); ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
    for (const r of R) { if (r[3] <= 0) continue; const [x, y, w, h] = place(r); ctx.fillStyle = rgb(r[4]); ctx.fillRect(x, y, w, h); }
  }

  // ———————————————— 静态图层 ————————————————
  let LY = null;
  const PAL_NIGHT = { far: [[66, 54, 80], [58, 48, 72]], farWin: 'rgba(255,214,150,0.35)', near: [[36, 28, 44], [30, 24, 38]], hi: 1.35,
    lit: ['rgba(232,184,74,0.85)', 'rgba(150,210,220,0.8)'], dark: 'rgba(0,0,0,0.25)', ant: [70, 60, 70] };
  const PAL_DAY = { far: [[150, 152, 182], [138, 140, 172]], farWin: 'rgba(255,255,255,0.18)', near: [[86, 84, 112], [76, 76, 104]], hi: 1.22,
    lit: ['rgba(255,236,190,0.35)', 'rgba(200,236,255,0.45)'], dark: 'rgba(30,30,60,0.25)', ant: [110, 108, 124] };

  function buildCity(P, out) {
    const rand = lcg(1097);
    const far = mk(W, H), near = mk(W, H);
    const neon = [], blinks = [], stars = [];
    // 远处的城：低矮、偏紫，稀疏的灯
    let c = far.getContext('2d');
    for (let x = -4; x < W;) {
      const w = 8 + Math.floor(rand() * 22), top = 20 + Math.floor(rand() * 20);
      c.fillStyle = rgb(rand() < 0.5 ? P.far[0] : P.far[1]);
      c.fillRect(x, top, w, 50 - top);
      if (rand() < 0.25) { c.fillRect(x + Math.floor(w / 2), top - 6, 1, 6); }
      c.fillStyle = P.farWin;
      for (let i = 0; i < w * (50 - top) / 40; i++) c.fillRect(x + 1 + Math.floor(rand() * (w - 2)), top + 2 + Math.floor(rand() * (48 - top)), 1, 1);
      x += w + Math.floor(rand() * 4);
    }
    // 近处的城：高楼、窗户、天线、霓虹招牌
    c = near.getContext('2d');
    for (let x = 96; x < W;) {
      const w = 14 + Math.floor(rand() * 30), top = 16 + Math.floor(rand() * 22);
      const base = rand() < 0.5 ? P.near[0] : P.near[1];
      c.fillStyle = rgb(base); c.fillRect(x, top, w, 46 - top);
      c.fillStyle = rgb(sh(base, P.hi)); c.fillRect(x, top, 1, 46 - top); c.fillRect(x, top, w, 1);
      // 楼顶
      const roof = rand();
      if (roof < 0.3) { c.fillStyle = rgb(base); c.fillRect(x + 3, top - 4, 6, 4); c.fillRect(x + 5, top - 6, 2, 2); }
      else if (roof < 0.55) { c.fillStyle = rgb(P.ant); c.fillRect(x + w - 4, top - 9, 1, 9); blinks.push([x + w - 4, top - 10, rand() * 6]); }
      else if (roof < 0.7) { c.fillStyle = rgb(base); c.fillRect(x + 2, top - 2, w - 4, 2); }
      // 窗户
      for (let wy = top + 3; wy < 44; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          const r = rand();
          if (r < 0.28) { c.fillStyle = rand() < 0.75 ? P.lit[0] : P.lit[1]; c.fillRect(wx, wy, 2, 2); }
          else if (r < 0.5) { c.fillStyle = P.dark; c.fillRect(wx, wy, 2, 2); }
        }
      }
      // 竖招牌
      if (rand() < 0.55) {
        const nx = x + (rand() < 0.5 ? 1 : w - 5), ny = top + 4 + Math.floor(rand() * 6);
        neon.push({ x: nx, y: ny, w: 4, h: 10 + Math.floor(rand() * 6), col: [[255, 92, 150], [90, 230, 230], [255, 200, 80], [170, 120, 255]][Math.floor(rand() * 4)], ph: rand() * 50, bad: rand() < 0.25 });
      }
      x += w + 1 + Math.floor(rand() * 6);
    }
    for (let i = 0; i < 40; i++) stars.push([Math.floor(rand() * W), 1 + Math.floor(rand() * 30), rand() * 10]);
    return { far, near, neon, blinks, stars };
  }

  function buildLayers() {
    const night = buildCity(PAL_NIGHT), day = buildCity(PAL_DAY);
    const ground = mk(W, H);
    let c;
    // 地面：城墙、马路、人行道、隔离柱，以及检查亭
    c = ground.getContext('2d');
    c.fillStyle = rgb([74, 66, 60]); c.fillRect(0, 40, W, 16);
    c.fillStyle = rgb([104, 94, 84]); c.fillRect(0, 40, W, 2);
    c.fillStyle = rgb([58, 52, 48]); c.fillRect(0, 42, W, 1);
    for (let x = 0; x < W; x += 40) { c.fillStyle = rgb([60, 54, 50]); c.fillRect(x, 43, 1, 10); c.fillStyle = rgb([94, 86, 78]); c.fillRect(x + 4, 45, 1, 1); c.fillRect(x + 35, 45, 1, 1); }
    for (let x = 0; x < W; x += 8) { c.fillStyle = rgb([232, 184, 74]); c.fillRect(x, 53, 4, 3); c.fillStyle = rgb([26, 22, 20]); c.fillRect(x + 4, 53, 4, 3); }
    c.fillStyle = rgb([44, 40, 44]); c.fillRect(0, 56, W, 7);
    for (let x = 0; x < W; x += 18) { c.fillStyle = rgb([130, 118, 92]); c.fillRect(x, 59, 9, 1); }
    c.fillStyle = rgb([100, 92, 84]); c.fillRect(0, 63, W, 1);
    c.fillStyle = rgb([68, 60, 56]); c.fillRect(0, 64, W, 8);
    c.fillStyle = rgb([58, 52, 48]);
    for (let x = 0; x < W; x += 14) c.fillRect(x, 64, 1, 8);
    c.fillRect(0, 68, W, 1);
    // 排队用的隔离柱和红绳
    for (let x = QX - 8; x < W; x += 54) {
      c.fillStyle = rgb([200, 170, 80]); c.fillRect(x, 60, 1, 9); c.fillRect(x - 1, 59, 3, 1); c.fillRect(x - 1, 69, 3, 1);
      c.fillStyle = rgb([170, 50, 50]);
      for (let i = 1; i < 54; i++) c.fillRect(x + i, 61 + Math.round(Math.sin(Math.PI * i / 54) * 2), 1, 1);
    }
    // 检查亭
    c.fillStyle = rgb([46, 38, 35]); c.fillRect(0, 22, 106, 50);
    c.fillStyle = rgb([36, 30, 28]); c.fillRect(104, 22, 2, 50);
    for (let x = 0; x < 110; x += 6) { c.fillStyle = rgb([232, 184, 74]); c.fillRect(x, 17, 3, 5); c.fillStyle = rgb([26, 22, 20]); c.fillRect(x + 3, 17, 3, 5); }
    c.fillStyle = rgb([20, 16, 15]); c.fillRect(0, 22, 108, 1);
    // 近卫局招牌
    c.fillStyle = rgb([34, 58, 112]); c.fillRect(6, 27, 34, 12);
    c.fillStyle = rgb([70, 100, 160]); c.fillRect(6, 27, 34, 1);
    c.fillStyle = rgb([232, 184, 74]);
    c.fillRect(10, 29, 6, 6); c.fillRect(11, 35, 4, 1); c.fillRect(12, 36, 2, 1);
    c.fillStyle = rgb([34, 58, 112]); c.fillRect(12, 31, 2, 2);
    c.fillStyle = rgb([200, 210, 230]);
    for (let i = 0; i < 4; i++) c.fillRect(19 + i * 5, 31, 3, 3);
    // 窗户框
    c.fillStyle = rgb([24, 20, 20]); c.fillRect(44, 27, 52, 24);
    c.fillStyle = rgb([92, 80, 72]); c.fillRect(42, 50, 56, 3);
    // 门
    c.fillStyle = rgb([28, 22, 20]); c.fillRect(84, 52, 16, 18);
    c.fillStyle = rgb([60, 50, 46]); c.fillRect(84, 52, 16, 1); c.fillRect(97, 61, 1, 2);
    // 墙上的灯管
    c.fillStyle = rgb([20, 16, 15]); c.fillRect(8, 44, 70, 1);
    // 探照灯杆
    c.fillStyle = rgb([40, 34, 32]); c.fillRect(107, 18, 1, 22); c.fillRect(104, 18, 6, 2);
    // 闸门立柱
    for (let y = 46; y < 70; y += 2) { c.fillStyle = rgb(((y / 2) | 0) % 2 ? [232, 184, 74] : [26, 22, 20]); c.fillRect(GATE_X - 1, y, 3, 2); }
    c.fillStyle = rgb([50, 44, 40]); c.fillRect(GATE_X - 3, 69, 7, 2);
    LY = { far: night.far, near: night.near, farD: day.far, nearD: day.near, ground, neon: night.neon, blinks: night.blinks, stars: night.stars };
  }

  // ———————————————— 天色（随当天时间变化）————————————————
  const SKY = [
    [0, [96, 124, 176], [238, 190, 156]],
    [0.4, [74, 122, 190], [178, 206, 222]],
    [0.75, [70, 72, 132], [240, 170, 112]],
    [1, [30, 24, 58], [196, 96, 92]],
  ];
  function skyAt(k) {
    for (let i = 1; i < SKY.length; i++) {
      if (k <= SKY[i][0]) {
        const a = SKY[i - 1], b = SKY[i], u = (k - a[0]) / (b[0] - a[0]);
        return [lerpC(a[1], b[1], u), lerpC(a[2], b[2], u)];
      }
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }

  // ———————————————— 状态 ————————————————
  const st = { D: undefined, pos: new Map(), prev: [], leavers: [], lastT: 0, gate: 0, van: null, vanNext: 0, cat: null, catNext: 0, drone: null, droneNext: 0 };
  const GUARD = { race: 'lupo', hair: [40, 36, 42], cloth: [38, 50, 92], skin: [222, 178, 142], pants: [30, 32, 44], tall: 2, long: false, hat: 'guard', hatColor: [38, 50, 92], bag: null, ph: 3.3, guard: true };

  function reset(D, queue, t) {
    st.D = D; st.pos.clear(); st.leavers = []; st.gate = 0;
    queue.forEach((L, i) => st.pos.set(L, { x: QX + i * SP, walking: false }));
    st.prev = queue.slice();
    st.van = null; st.vanNext = t + 45 + Math.random() * 60;
    st.cat = null; st.catNext = t + 20 + Math.random() * 40;
    st.drone = null; st.droneNext = t + 8 + Math.random() * 20;
  }

  function update(queue, t, dt) {
    const now = new Set(queue);
    st.prev.forEach((L, i) => {
      if (now.has(L)) return;
      const p = st.pos.get(L);
      if (p) st.leavers.push({ L, x: p.x, mode: i === 0 ? 'booth' : 'off' });
      st.pos.delete(L);
    });
    queue.forEach((L, i) => {
      const tx = QX + i * SP;
      let p = st.pos.get(L);
      if (!p) { p = { x: Math.max(W + 12, tx + 24), walking: true }; st.pos.set(L, p); }
      const v = 34 * dt;
      if (p.x > tx + 0.3) { p.x = Math.max(tx, p.x - v); p.walking = true; }
      else if (p.x < tx - 0.3) { p.x = Math.min(tx, p.x + v); p.walking = true; }
      else { p.x = tx; p.walking = false; }
    });
    st.prev = queue.slice();
    for (const l of st.leavers) l.x += (l.mode === 'booth' ? -40 : 40) * dt;
    st.leavers = st.leavers.filter((l) => (l.mode === 'booth' ? l.x > DOOR_X : l.x < W + 20));
    const open = st.leavers.some((l) => l.mode === 'booth' && l.x < QX + 6 && l.x > GATE_X - 30);
    st.gate = clamp(st.gate + (open ? 4 : -2.5) * dt, 0, 1);
    // 彩蛋：企鹅物流的车、墙头的猫、无人机
    if (!st.van && t > st.vanNext) st.van = { x: W + 40 };
    if (st.van) { st.van.x -= 120 * dt; if (st.van.x < -50) { st.van = null; st.vanNext = t + 120 + Math.random() * 150; } }
    if (!st.cat && t > st.catNext) st.cat = { x: 110, sit: 0, sat: false };
    if (st.cat) {
      const c = st.cat;
      if (!c.sat && c.x > 300 + (c.x % 7) * 20) { c.sat = true; c.sit = 4 + Math.random() * 3; }
      if (c.sit > 0) c.sit -= dt; else c.x += 11 * dt;
      if (c.x > W + 10) { st.cat = null; st.catNext = t + 90 + Math.random() * 120; }
    }
    if (!st.drone && t > st.droneNext) st.drone = { x: -10, y: 22 + Math.random() * 8, v: 50 + Math.random() * 30 };
    if (st.drone) { st.drone.x += st.drone.v * dt; if (st.drone.x > W + 10) { st.drone = null; st.droneNext = t + 25 + Math.random() * 35; } }
  }

  // ———————————————— 画 ————————————————
  function draw(cv, queue, t, D) {
    queue = queue || [];
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (!LY) buildLayers();
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (st.D !== D) reset(D, queue, t);
    const dt = clamp(t - st.lastT, 0, 0.1);
    st.lastT = t;
    update(queue, t, dt);

    const k = D ? clamp(D.t / 300, 0, 1) : 0.85;
    const dk = clamp((k - 0.55) / 0.45, 0, 1);       // 天黑程度
    const [top, hor] = skyAt(k);
    for (let y = 0; y < 50; y += 2) { ctx.fillStyle = rgb(lerpC(top, hor, Math.pow(y / 50, 1.4))); ctx.fillRect(0, y, W, 2); }
    // 星星
    if (dk > 0.4) {
      for (const [x, y, p] of LY.stars) { ctx.fillStyle = `rgba(255,250,230,${(dk - 0.4) * (0.5 + 0.5 * Math.sin(t * 2 + p))})`; ctx.fillRect(x, y, 1, 1); }
    }
    // 太阳
    const sx = 60 + k * 520, sy = 46 - Math.sin(Math.PI * clamp(k * 0.9 + 0.05, 0, 1)) * 26;
    ctx.fillStyle = rgb(lerpC([255, 240, 200], [255, 150, 90], k), 0.25); ctx.fillRect(sx - 7, sy - 7, 14, 14);
    ctx.fillStyle = rgb(lerpC([255, 246, 220], [255, 170, 110], k)); ctx.fillRect(sx - 4, sy - 5, 8, 10); ctx.fillRect(sx - 5, sy - 4, 10, 8);
    const nk = clamp((k - 0.45) / 0.5, 0, 1);
    ctx.drawImage(LY.farD, 0, 0);
    if (nk > 0) { ctx.globalAlpha = nk; ctx.drawImage(LY.far, 0, 0); ctx.globalAlpha = 1; }
    // 远处探照灯
    if (dk > 0) {
      for (const [bx, sp, ph] of [[230, 0.25, 0], [520, 0.18, 2]]) {
        const a = -Math.PI / 2 + Math.sin(t * sp + ph) * 0.6;
        ctx.fillStyle = `rgba(255,240,200,${0.07 * dk})`;
        ctx.beginPath(); ctx.moveTo(bx, 44); ctx.lineTo(bx + Math.cos(a - 0.06) * 80, 44 + Math.sin(a - 0.06) * 80); ctx.lineTo(bx + Math.cos(a + 0.06) * 80, 44 + Math.sin(a + 0.06) * 80); ctx.fill();
      }
    }
    // 飞艇
    const ax = ((t * 7) % 1000) - 160, ay = 24;
    ctx.fillStyle = rgb([104, 100, 118]); ctx.fillRect(ax, ay, 36, 6); ctx.fillRect(ax + 3, ay - 1, 30, 8); ctx.fillRect(ax + 8, ay - 2, 20, 10);
    ctx.fillStyle = rgb([82, 78, 96]); ctx.fillRect(ax + 3, ay + 5, 30, 2);
    ctx.fillStyle = rgb([126, 122, 140]); ctx.fillRect(ax + 8, ay - 1, 20, 1);
    ctx.fillStyle = rgb([70, 66, 84]); ctx.fillRect(ax + 34, ay - 3, 4, 3); ctx.fillRect(ax + 34, ay + 6, 4, 3); ctx.fillRect(ax + 14, ay + 8, 8, 2);
    ctx.fillStyle = 'rgba(232,184,74,0.9)'; ctx.fillRect(ax + 15, ay + 8, 1, 1); ctx.fillRect(ax + 18, ay + 8, 1, 1);
    if (Math.floor(t * 2) % 2) { ctx.fillStyle = rgb([255, 80, 70]); ctx.fillRect(ax + 37, ay + 2, 1, 1); }
    ctx.drawImage(LY.nearD, 0, 0);
    if (nk > 0) { ctx.globalAlpha = nk; ctx.drawImage(LY.near, 0, 0); ctx.globalAlpha = 1; }
    // 霓虹与楼顶灯
    const na = 0.35 + 0.65 * dk;
    for (const n of LY.neon) {
      const off = n.bad ? Math.sin(t * 9 + n.ph) > 0.6 && Math.sin(t * 23 + n.ph) > 0 : Math.sin(t * 0.7 + n.ph) > 0.985;
      if (off) { ctx.fillStyle = 'rgba(40,30,40,0.9)'; ctx.fillRect(n.x, n.y, n.w, n.h); continue; }
      ctx.fillStyle = rgb(n.col, 0.18 * na); ctx.fillRect(n.x - 2, n.y - 2, n.w + 4, n.h + 4);
      ctx.fillStyle = rgb(n.col, na); ctx.fillRect(n.x, n.y, n.w, n.h);
      ctx.fillStyle = rgb(sh(n.col, 0.45), na);
      for (let y = n.y + 1; y < n.y + n.h - 1; y += 3) ctx.fillRect(n.x + 1, y, n.w - 2, 1);
    }
    for (const [x, y, p] of LY.blinks) if (Math.sin(t * 2.5 + p) > 0.3) { ctx.fillStyle = rgb([255, 70, 60]); ctx.fillRect(x, y, 1, 1); }
    // 无人机
    if (st.drone) {
      const d = st.drone, y = Math.round(d.y + Math.sin(t * 3) * 1.5);
      ctx.fillStyle = rgb([40, 40, 48]); ctx.fillRect(d.x, y, 4, 1); ctx.fillRect(d.x - 1, y - 1, 2, 1); ctx.fillRect(d.x + 3, y - 1, 2, 1);
      ctx.fillStyle = Math.floor(t * 4) % 2 ? rgb([255, 70, 60]) : rgb([80, 255, 140]); ctx.fillRect(d.x + 1, y + 1, 1, 1);
    }
    ctx.drawImage(LY.ground, 0, 0);
    // 城墙上的灯
    for (let x = 140; x < W; x += 80) {
      ctx.fillStyle = `rgba(255,214,140,${0.25 + 0.6 * dk})`; ctx.fillRect(x, 46, 2, 2);
      ctx.fillStyle = `rgba(255,214,140,${0.08 + 0.12 * dk})`; ctx.fillRect(x - 3, 45, 8, 6);
    }
    // 墙头的猫
    if (st.cat) drawCat(ctx, st.cat, t);
    // 企鹅物流的车
    if (st.van) drawVan(ctx, Math.round(st.van.x), t, dk);
    // 彩蛋：路过的熟面孔（eggs.js），画在排队的人后面
    if (window.EGGS && EGGS.outside) { try { EGGS.outside(ctx, t, D, dk); } catch (e) { console.error(e); } }
    // 检查亭的窗户：暖光，里面坐着你
    const flick = 0.92 + 0.08 * Math.sin(t * 17) * Math.sin(t * 3.1);
    ctx.fillStyle = rgb([226, 186, 120], flick); ctx.fillRect(46, 29, 48, 20);
    ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(46, 29, 48, 2);
    ctx.fillStyle = rgb([60, 46, 40]);
    ctx.fillRect(64, 36, 8, 7); ctx.fillRect(61, 43, 14, 6); ctx.fillRect(63, 34, 10, 2); ctx.fillRect(62, 35, 3, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(48, 30, 2, 18); ctx.fillRect(52, 30, 1, 18);
    ctx.fillStyle = rgb([24, 20, 20]); ctx.fillRect(69, 29, 2, 20);
    // 招牌灯管与探照灯光锥
    ctx.fillStyle = `rgba(160,220,255,${0.5 + 0.4 * dk})`; ctx.fillRect(8, 43, 70, 1);
    ctx.fillStyle = rgb([255, 240, 190]); ctx.fillRect(104, 20, 5, 1);
    if (dk > 0.05) {
      ctx.fillStyle = `rgba(255,236,180,${0.1 * dk})`;
      ctx.beginPath(); ctx.moveTo(104, 21); ctx.lineTo(109, 21); ctx.lineTo(210, 72); ctx.lineTo(118, 72); ctx.fill();
    }
    // 旅客：从队尾往队首画
    const figs = [];
    queue.forEach((L) => { const p = st.pos.get(L); if (p) figs.push({ L, x: p.x, walking: p.walking, faceRight: false }); });
    for (const l of st.leavers) figs.push({ L: l.L, x: l.x, walking: true, faceRight: l.mode === 'off' });
    figs.sort((a, b) => b.x - a.x);
    for (const f of figs) {
      if (f.x > W + 14) continue;
      const ph = f.L.ph;
      const o = { walking: f.walking, faceRight: f.faceRight };
      if (f.walking) o.lift = Math.floor(t * 7 + ph) % 2;
      else {
        o.breath = Math.sin(t * 2.1 + ph) > 0.5 ? 1 : 0;
        o.lookBack = Math.sin(t * 0.37 + ph * 3) > 0.82;
        o.lift = Math.sin(t * 0.53 + ph * 7) > 0.96 ? 1 : 0;
      }
      drawFig(ctx, f.L, f.x, t, o);
    }
    // 门口的近卫局干员
    drawFig(ctx, GUARD, 114, t, { faceRight: true, lookBack: Math.sin(t * 0.3) > 0.7, breath: Math.sin(t * 1.9) > 0.5 ? 1 : 0 });
    // 闸门横杆
    const a = -st.gate * 1.35;
    for (let i = 0; i < GATE_LEN; i++) {
      ctx.fillStyle = Math.floor(i / 4) % 2 ? rgb([236, 232, 224]) : rgb([196, 52, 44]);
      ctx.fillRect(Math.round(GATE_X + Math.cos(a) * i), Math.round(GATE_Y + Math.sin(a) * i), 2, 2);
    }
    ctx.fillStyle = rgb([40, 34, 32]); ctx.fillRect(GATE_X - 1, GATE_Y - 1, 3, 3);
    // 下班后：天边更暗一点
    if (D && D.over) { ctx.fillStyle = 'rgba(10,8,20,0.15)'; ctx.fillRect(0, 0, W, H); }
  }

  function drawCat(ctx, c, t) {
    const x = Math.round(c.x), y = 39;
    // 先画一遍深色、四向偏移当描边，再画橘猫
    for (const [ox, oy, col] of [[-1, 0, OL], [1, 0, OL], [0, -1, OL], [0, 1, OL], [0, 0, [226, 142, 62]]]) {
      ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = rgb(col); catShape(ctx, c, x, y, t); ctx.restore();
    }
    ctx.fillStyle = rgb([170, 92, 40]);
    if (c.sit > 0) { ctx.fillRect(x + 1, y - 2, 1, 2); ctx.fillRect(x + 3, y - 6, 2, 1); }
    else { ctx.fillRect(x + 1, y - 3, 1, 2); ctx.fillRect(x + 3, y - 3, 1, 2); ctx.fillRect(x + 5, y - 5, 2, 1); }
    ctx.fillStyle = rgb([40, 30, 20]);
    if (c.sit > 0) ctx.fillRect(x + 4, y - 5, 1, 1); else ctx.fillRect(x + 7, y - 4, 1, 1);
  }

  function catShape(ctx, c, x, y, t) {
    if (c.sit > 0) {
      ctx.fillRect(x, y - 3, 4, 4); ctx.fillRect(x + 3, y - 6, 3, 3); ctx.fillRect(x + 3, y - 7, 1, 1); ctx.fillRect(x + 5, y - 7, 1, 1);
      const sw = Math.round(Math.sin(t * 3) * 1.5);
      ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x - 2, y - 1 + sw, 1, 2);
    } else {
      const s = Math.floor(t * 8) % 2;
      ctx.fillRect(x, y - 3, 6, 2); ctx.fillRect(x + 5, y - 5, 3, 3); ctx.fillRect(x + 5, y - 6, 1, 1); ctx.fillRect(x + 7, y - 6, 1, 1);
      ctx.fillRect(x - 1, y - 6, 1, 4); ctx.fillRect(x - 2, y - 7, 1, 1);
      ctx.fillRect(x + (s ? 0 : 1), y - 1, 1, 1); ctx.fillRect(x + (s ? 4 : 5), y - 1, 1, 1);
    }
  }

  function drawVan(ctx, x, t, dk) {
    const y = 52, body = [38, 38, 44];
    if (dk > 0.1) { ctx.fillStyle = `rgba(255,236,160,${0.12 * dk})`; ctx.beginPath(); ctx.moveTo(x - 6, 57); ctx.lineTo(x - 40, 54); ctx.lineTo(x - 40, 63); ctx.fill(); }
    ctx.fillStyle = rgb(OL); ctx.fillRect(x - 8, y + 2, 40, 10); ctx.fillRect(x - 1, y - 1, 33, 4);
    ctx.fillStyle = rgb(body); ctx.fillRect(x, y, 31, 10); ctx.fillRect(x - 7, y + 3, 8, 7);
    ctx.fillStyle = rgb([150, 196, 214]); ctx.fillRect(x - 6, y + 4, 4, 2);
    ctx.fillStyle = rgb([232, 184, 74]); ctx.fillRect(x - 7, y + 7, 38, 1); ctx.fillRect(x, y, 31, 1);
    // 企鹅标志
    ctx.fillStyle = rgb([20, 20, 24]); ctx.fillRect(x + 12, y + 1, 5, 6);
    ctx.fillStyle = rgb(WHITE); ctx.fillRect(x + 13, y + 3, 3, 4); ctx.fillRect(x + 13, y + 2, 1, 1);
    ctx.fillStyle = rgb([255, 150, 40]); ctx.fillRect(x + 11, y + 2, 1, 1); ctx.fillRect(x + 13, y + 7, 1, 1); ctx.fillRect(x + 15, y + 7, 1, 1);
    ctx.fillStyle = rgb([255, 240, 160]); ctx.fillRect(x - 7, y + 5, 1, 1);
    ctx.fillStyle = rgb([255, 60, 50]); ctx.fillRect(x + 30, y + 5, 1, 2);
    const r = Math.floor(t * 12) % 2;
    for (const wx of [x - 4, x + 23]) {
      ctx.fillStyle = rgb([18, 16, 18]); ctx.fillRect(wx, y + 9, 5, 3); ctx.fillRect(wx + 1, y + 8, 3, 5);
      ctx.fillStyle = rgb([120, 116, 120]); ctx.fillRect(wx + 2 - r, y + 10, 1, 1); ctx.fillRect(wx + 1 + r, y + 10, 1, 1);
    }
  }

  window.SCENE = { draw, newLook, drawFig, GROUND, GUARD, _st: st };
})();
