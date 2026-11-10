'use strict';
// 彩蛋：低频出现的特别旅客、标题页互动、墨镜模式、源石虫、可露希尔的广告。
// 通过 game.js 的 hook() 调用：EGGS.scene / EGGS.traveler / EGGS.decide。
// 测试时可设 EGGS.force = 'claude' | 'penguin' | 'doctor' | 'inspector' | 'ad' | 'jade' | 'slug'，
// 或龙门篇的熟面孔（见 EGGS.TRAVELERS），路过的人（见 EGGS.CAMEOS），'radio' | 'news' | 'news_ad'。

(function () {
  const E = { force: null, shades: false };
  window.EGGS = E;

  // 图鉴里没有的种族（只给证件显示用，不进种族图鉴）
  RACES.penguin = { name: '企鹅', desc: '……图鉴里没有这一页。' };
  REASON.egg_penguin = '证件种族“企鹅”不在种族图鉴里';

  // —— 墨镜模式：包一层 drawPerson ——
  const baseDraw = drawPerson;
  // 脸的位置来自 art.js 的 FACE（不同画风版本坐标不同）
  const face = () => (typeof FACE !== 'undefined' ? FACE : { cx: 48, cy: 40, rx: 15, ry: 17, eyeY: 40, eyeL: [38, 45], eyeR: [51, 58] });
  function addShades(M) {
    const F = face(), k = [18, 18, 24], hi = [126, 146, 178];
    const y0 = F.eyeY - 1, h = 7;
    const [l0, l1] = F.eyeL, [r0, r1] = F.eyeR;
    M.rect(l0 - 1, y0, l1 - l0 + 3, h, k); M.rect(r0 - 1, y0, r1 - r0 + 3, h, k);
    M.rect(l1 + 2, y0 + 1, Math.max(1, r0 - l1 - 3), 1, k);
    M.rect(Math.round(F.cx - F.rx), y0 + 1, Math.max(1, l0 - 1 - Math.round(F.cx - F.rx)), 1, k);
    M.rect(r1 + 2, y0 + 1, Math.max(1, Math.round(F.cx + F.rx) - r1 - 2), 1, k);
    M.set(l0, y0 + 1, hi); M.set(l0 + 1, y0 + 1, hi); M.set(r0, y0 + 1, hi); M.set(r0 + 1, y0 + 1, hi);
  }
  drawPerson = function (a, o) {
    const M = baseDraw(a, o);
    if (E.shades && !(o && o.noShades)) addShades(M);
    return M;
  };

  // —— 让彩蛋旅客能自定义检查结果 ——
  const baseAnalyze = analyze;
  analyze = function (a, b, t, hatOn) {
    if (t && t.eggAnalyze) {
      const r = t.eggAnalyze(a, b, hatOn);
      if (r) return r;
    }
    return baseAnalyze(a, b, t, hatOn);
  };

  const flags = () => (S && S.flags) || {};
  const once = (k) => !flags()['egg_' + k];
  const mark = (k) => { if (S) S.flags['egg_' + k] = true; };
  const pair = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);

  // ———————————————— 特别旅客 ————————————————

  // 1. 原作联动：自称哥伦比亚人的 Claude，时区出卖了他
  function claude() {
    const t = makeTraveler({ nation: 'columbia', race: 'feline', name: '克劳德·奥普斯', app: { hat: null, top: 'suit', glasses: true } });
    t.docs.permit.nation = 'lungmen';
    t.flaws = ['permit_nation'];
    t.intro = ['Hello, I am 哥伦比亚人。', '（他的终端右下角，时钟显示：东八区。）'];
    t.answers = {
      nation: ['我是哥伦比亚人。IP 是哥伦比亚的，时区是……东八区的哥伦比亚。', '这个……说来话长。'],
      name: ['Claude 就是我，我就是 Claude。'],
    };
    t.react = {
      approve: 'Thank you! 一百八一杯！……我是说，have a nice day.',
      deny: '……我还会换个 IP 回来的。',
      detain: '我只是想用一下龙门的网络！',
    };
    t.voice = 210;
    return t;
  }

  // 2. 企鹅物流的大帝：戴墨镜的帝企鹅，图鉴里查无此族
  function drawPenguin(o = {}) {
    const M = new Pix();
    const K = [30, 30, 36], W = [240, 240, 236], Y = [252, 222, 128], O = [246, 160, 52];
    layer(M, (L) => {
      L.poly([[22, 54], [12, 76], [19, 79], [28, 62]], K); L.poly([[74, 54], [84, 76], [77, 79], [68, 62]], K);
    });
    layer(M, (L) => { L.ell(48, 60, 26, 28, K); L.ell(48, 30, 17, 16, K); });
    layer(M, (L) => {
      L.ell(48, 64, 17, 20, W);
      L.ell(48, 47, 13, 5, Y, (x, y) => y >= 44);
      L.ell(33, 37, 3.5, 6, O); L.ell(63, 37, 3.5, 6, O);
    }, { shade: false, line: false });
    // 嘴
    M.poly([[44.5, 34], [51.5, 34], [48, 41]], [44, 44, 50]);
    M.rect(46, 37, 4, 1, O); M.rect(47, 38, 2, 1, O);
    // 墨镜
    const s = [14, 14, 20], hi = [130, 150, 190];
    M.rect(35, 26, 11, 6, s); M.rect(50, 26, 11, 6, s); M.rect(46, 27, 4, 1, s);
    M.set(36, 27, hi); M.set(37, 27, hi); M.set(51, 27, hi); M.set(52, 27, hi);
    // 金链子
    const G = [240, 200, 70];
    for (let x = 34; x <= 62; x += 2) {
      const dx = (x + 0.5 - 48) / 15;
      const y = 46 + Math.round(5 * Math.sqrt(Math.max(0, 1 - dx * dx)));
      M.set(x, y, G); M.set(x + 1, y, shade(G, 0.8));
    }
    M.rect(46, 52, 4, 4, G); M.set(47, 53, [255, 240, 170]);
    if (o.expr === 'smile') { M.set(45, 42, [44, 44, 50]); M.set(51, 42, [44, 44, 50]); }
    return M;
  }
  function penguin() {
    const t = makeTraveler({ nation: 'lungmen', race: 'feline', name: '大帝', app: { hat: null } });
    t.race = 'penguin';
    t.app = Object.assign({}, t.app, { race: 'penguin', hat: null });
    t.photo = t.app;
    t.docs.id.race = 'penguin';
    t.items = ['coins'];
    t.flaws = ['egg_penguin'];
    t.expect = 'deny';
    t.ok = ['deny'];
    t.drawFn = (o) => drawPenguin(o);
    t.photoFn = () => drawPenguin({});
    t.voice = 90;
    t.intro = ['哟。', '企鹅物流，使命必达，', '龙门街头，我最大。', '证件在这儿，节奏别停下。'];
    t.answers = { race: ['企鹅怎么了？企鹅也是泰拉的一份子。', '图鉴没有我？那是图鉴的损失。'] };
    t.react = {
      approve: '大帝的路，从来没有收费站。',
      deny: '没关系，大帝从不排队——大帝走后门。',
      detain: '你敢拘留大帝？我的律师是一整个物流公司。',
    };
    t.eggAnalyze = (a, b) => {
      if (pair(a, b, 'face', 'id.race') || pair(a, b, 'id.photo', 'id.race') || pair(a, b, 'rule.race', 'id.race')) {
        return { kind: 'race', text: '种族图鉴里没有“企鹅”这一页。' };
      }
      return null;
    };
    return t;
  }

  // 3. 戴兜帽的“博士”：兜帽永远摘不下来
  function shadowFace(M) {
    const F = face(), d = [22, 20, 26];
    for (let y = Math.floor(F.cy - F.ry); y <= F.cy + F.ry; y++) {
      for (let x = Math.floor(F.cx - F.rx); x <= F.cx + F.rx; x++) {
        if (((x + 0.5 - F.cx) / F.rx) ** 2 + ((y + 0.5 - F.cy) / F.ry) ** 2 <= 1 && M.get(x, y)) M.set(x, y, d);
      }
    }
    const ex = (r) => Math.round((r[0] + r[1]) / 2);
    M.set(ex(F.eyeL), F.eyeY, [150, 170, 200]); M.set(ex(F.eyeR), F.eyeY, [150, 170, 200]);
    return M;
  }
  function doctor() {
    const t = makeTraveler({ nation: 'victoria', race: 'feline', app: { hat: 'hood', hatColor: [44, 46, 54], cloth: [36, 38, 46], top: 'coat', glasses: false } });
    if (S.day >= 4) {
      t.docs.rhodes = { code: '博士', name: t.name, expiry: today() + ri(100, 900) };
      t.app.badge = true;
    }
    t.drawFn = (o) => shadowFace(drawPerson(t.app, Object.assign({}, o, { hatOff: false })));
    t.photoFn = () => shadowFace(drawPerson(t.app, { hatOff: false }));
    t.hatLine = '……还是算了吧。';
    t.ok = ['approve', 'deny'];
    t.voice = 140;
    t.intro = ['……', '（兜帽下传来一声轻轻的叹气。）', '我好像忘了很重要的事。不过证件，我没忘。'];
    t.react = {
      approve: '谢谢。如果你见到一只兔耳朵的女孩，告诉她我在这儿。',
      deny: '……也好。我再想想，我到底是谁。',
      detain: '……这种感觉，好像在哪里经历过。',
    };
    t.eggAnalyze = (a, b) => {
      if (pair(a, b, 'face', 'id.race') || pair(a, b, 'face', 'id.photo')) return { hint: '兜帽下一片漆黑，什么也看不清。' };
      return null;
    };
    return t;
  }

  // 4. 近卫局督察的突击抽查：证件昨天刚过期
  function inspector() {
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '周慧敏', app: { hat: null, top: 'uniform', cloth: [40, 50, 72], glasses: false, style: 'bob' } });
    t.docs.id.expiry = today() - 1;
    t.flaws = ['id_expired'];
    t.inspector = true;
    t.voice = 170;
    t.intro = ['你好。', '（她站得笔直，不太像普通旅客。）'];
    t.answers = { expired: ['哦？你注意到了。', '……继续。'] };
    t.react = {
      deny: '（她亮出近卫局的徽章）例行抽查。合格，继续保持。',
      approve: '（她亮出近卫局的徽章）例行抽查。证件昨天就过期了，审查员。',
      detain: '（她亮出近卫局的徽章）……拘留就不必了。抽查合格。',
    };
    t.ok = ['deny', 'detain'];
    return t;
  }

  // ———————————————— 龙门的熟面孔（第一部 · 龙门篇） ————————————————
  // 所有叠加在立绘上的小零件（剑、角、伤疤、Pocky……）都按 FACE 定位，换画风也不会跑偏。

  RACES.lung = { name: '龙', desc: '深色的龙角；粗壮的龙尾。页边手写：“别再拦我。——陈”' };
  RACES.oni = { name: '鬼', desc: '……图鉴里没有这一页。' };

  const OLC = [40, 28, 44];
  const dim = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  const mouthY = () => Math.round(face().eyeY + face().ry * 0.7);
  const eyeMid = (r) => Math.round((r[0] + r[1]) / 2);
  // 画一个小零件：自带描边，压在立绘最上面
  function part(M, fn, outline = true) {
    const L = new Pix(M.w, M.h);
    fn(L);
    if (L.x1 < 0) return M;
    if (outline) {
      const add = [];
      const [x0, y0, x1, y1] = L.box(1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (L.get(x, y)) continue;
        if (L.get(x - 1, y) || L.get(x + 1, y) || L.get(x, y - 1) || L.get(x, y + 1)) add.push([x, y]);
      }
      for (const [x, y] of add) M.set(x, y, OLC);
    }
    M.blit(L);
    return M;
  }
  // 证件上的种族换成图鉴里没有的那种，立绘仍按 app.race 画
  function setRace(t, race) { t.race = race; t.docs.id.race = race; }
  function looks(t, over, photoOver) {
    t.drawFn = (o) => over(drawPerson(t.app, o), o || {});
    t.photoFn = () => (photoOver || ((M) => M))(drawPerson(t.photo || t.app, { hatOff: true }), {});
  }
  const raceHint = (text) => (a, b) => (pair(a, b, 'face', 'id.race') || pair(a, b, 'id.photo', 'id.race') || pair(a, b, 'rule.race', 'id.race') ? { hint: text } : null);
  function news(text) { if (!S) return; (S.flags.egg_news = S.flags.egg_news || []).push({ d: S.day, text }); }
  const met = (k) => !!flags()['egg_' + k];
  const decOf = (k) => flags()['egg_' + k + '_dec'];
  function narrate(ms, text) { if (typeof later === 'function' && D) later(ms, () => say('n', text)); }

  // —— 小零件 ——
  // 陈的剑「赤霄」：剑柄从肩后露出来
  function chenSword(M) {
    const F = face(), bx = Math.round(F.cx - F.rx) + 1, by = PH + 2, tx = bx - 12, ty = Math.round(F.cy) - 4;
    const at = (k) => [Math.round(bx + (tx - bx) * k), Math.round(by + (ty - by) * k)];
    return part(M, (L) => {
      const [gx, gy] = at(0.62), [px, py] = at(1);
      L.line(bx, by, gx, gy, [44, 40, 52]); L.line(bx + 1, by, gx + 1, gy, [44, 40, 52]); L.line(bx + 2, by, gx + 2, gy, [70, 64, 80]);
      L.line(gx, gy, px, py, [196, 46, 44]); L.line(gx + 1, gy, px + 1, py, [150, 30, 36]);
      L.rect(gx - 2, gy - 1, 6, 2, [232, 190, 82]); L.set(gx - 2, gy - 1, [255, 232, 160]);
      L.rect(px - 1, py - 2, 3, 3, [232, 190, 82]); L.set(px - 1, py - 2, [255, 232, 160]);
    });
  }
  // 星熊：额头一只角、人类耳朵、窗口里挤不进来的大盾
  function oniHead(M) {
    const F = face(), sk = [250, 222, 200];
    const top = Math.round(F.cy - F.ry), cx = Math.round(F.cx) + 3;
    part(M, (L) => {
      L.ell(F.cx - F.rx + 0.5, F.cy + 2, 2.6, 3.6, sk); L.ell(F.cx + F.rx - 0.5, F.cy + 2, 2.6, 3.6, sk);
      L.set(Math.round(F.cx - F.rx) + 1, Math.round(F.cy + 2), [222, 180, 160]); L.set(Math.round(F.cx + F.rx) - 1, Math.round(F.cy + 2), [222, 180, 160]);
    });
    return part(M, (L) => {
      L.poly([[cx - 3, top + 7], [cx + 3, top + 7], [cx + 1, top - 6], [cx - 0.5, top - 6]], [228, 120, 96]);
      L.line(cx - 1, top + 6, cx, top - 4, [255, 184, 160]); L.rect(cx - 3, top + 5, 7, 1, [188, 84, 70]);
    });
  }
  function oniShield(M) {
    const F = face(), x0 = Math.round(F.cx + F.rx) + 2, y0 = Math.round(F.cy) - 8;
    const w = Math.max(14, Math.min(28, PW - 2 - x0)), h = PH - y0;
    const st = [92, 98, 112], sd = [64, 68, 82], red = [176, 42, 44];
    part(M, (L) => {
      L.rect(x0, y0 + 2, w, h - 2, st); L.rect(x0 + 2, y0, w - 4, 2, st);
      for (let y = y0 + 4; y < PH; y += 6) { L.set(x0 + 2, y, [150, 156, 172]); L.set(x0 + w - 3, y, [150, 156, 172]); }
      L.rect(x0 + w - 3, y0 + 2, 2, h - 2, sd);
      L.rect(x0, y0 + 2, 1, h - 2, [130, 136, 152]);
    });
    // 盾面上的般若面
    const mx = x0 + Math.floor(w / 2), my = y0 + 14;
    M.rect(mx - 6, my - 6, 12, 12, red); M.rect(mx - 5, my + 6, 10, 3, red);
    M.rect(mx - 4, my - 3, 3, 2, [255, 226, 120]); M.rect(mx + 1, my - 3, 3, 2, [255, 226, 120]);
    M.line(mx - 6, my - 7, mx - 9, my - 11, [232, 220, 196]); M.line(mx + 5, my - 7, mx + 8, my - 11, [232, 220, 196]);
    for (let i = -4; i <= 3; i += 2) { M.set(mx + i, my + 4, [250, 246, 236]); M.set(mx + i + 1, my + 5, [250, 246, 236]); }
    M.rect(mx - 4, my + 2, 9, 1, [90, 20, 26]);
    return M;
  }
  // 德克萨斯嘴里叼着的 Pocky
  function pocky(M) {
    const F = face(), x = Math.round(F.cx) + 1, y = mouthY();
    for (let i = 0; i < 9; i++) M.set(x + i, y + Math.floor(i / 3), i < 6 ? [112, 62, 40] : [232, 196, 140]);
    M.set(x + 2, y, [150, 96, 70]);
    return M;
  }
  // 拉普兰德左眼上的伤疤
  function scar(M) {
    const F = face(), x = eyeMid(F.eyeR), c = [176, 86, 96];
    for (let y = F.eyeY - 5; y <= F.eyeY + 8; y++) if (y < F.eyeY || y > F.eyeY + 5) M.set(x + Math.round((y - F.eyeY) / 6), y, c);
    M.set(x - 1, F.eyeY - 3, c); M.set(x + 1, F.eyeY + 7, c);
    return M;
  }
  // 霜星：身边飘着雪花
  function snow(M) {
    const F = face(), w = [236, 246, 255], b = [168, 206, 240];
    const spots = [[-1.55, -0.7], [1.5, -0.9], [-1.7, 0.6], [1.75, 0.35], [-0.6, -1.45], [0.95, 1.45], [1.2, -1.7], [-1.3, 1.6]];
    for (const [i, [dx, dy]] of spots.entries()) {
      const x = Math.round(F.cx + dx * F.rx), y = Math.round(F.cy + dy * F.ry);
      if (i % 2) { M.set(x, y, w); M.set(x - 1, y, b); M.set(x + 1, y, b); M.set(x, y - 1, b); M.set(x, y + 1, b); } else M.set(x, y, w);
    }
    return M;
  }

  // —— 源石探测视图里的额外东西 ——
  if (typeof SCAN_BOX !== 'undefined') SCAN_BOX.egg_bomb = [27, 63, 13, 13];
  if (typeof drawScan === 'function') {
    const baseScan = drawScan;
    drawScan = function (person, t) {
      const M = baseScan(person, t);
      try { if (t && t.scanFn) t.scanFn(M); } catch (e) { console.error(e); }
      return M;
    };
  }
  const GLOW = [140, 236, 230], HOT = [255, 120, 80];
  function scanBomb(M) {
    const [x, y, w, h] = (typeof SCAN_BOX !== 'undefined' && SCAN_BOX.egg_bomb) || [27, 63, 13, 13];
    const cx = x + w / 2, cy = y + h / 2 + 1;
    M.ell(cx, cy, w / 2 - 1, h / 2 - 1.5, [60, 30, 30]);
    M.ell(cx - 1, cy - 1, w / 2 - 3, h / 2 - 3.5, HOT);
    M.rect(Math.round(cx) - 1, y + 1, 3, 2, GLOW);
    M.line(Math.round(cx) + 1, y + 1, Math.round(cx) + 4, y - 2, [255, 220, 120]);
    M.set(Math.round(cx) + 4, y - 3, [255, 255, 200]);
    M.rect(Math.round(cx) - 2, Math.round(cy), 5, 1, [255, 240, 200]);
  }
  function scanGuns(M) {
    for (const [ax, ay, bx, by] of [[18, 58, 34, 80], [78, 56, 62, 80]]) {
      M.line(ax, ay, bx, by, GLOW); M.line(ax + 1, ay, bx + 1, by, GLOW);
      M.rect(Math.round((ax + bx) / 2) - 1, Math.round((ay + by) / 2), 3, 3, GLOW);
    }
  }
  // 凯尔希身后的 Mon3tr：探测仪里能看到一个巨大的轮廓
  function scanMon3tr(M) {
    const g = [120, 255, 170], gd = [44, 130, 90];
    const L = new Pix(M.w, M.h);
    const k = PW / 96;
    const P = (pts) => L.poly(pts.map(([x, y]) => [x * k, y]), g);
    P([[95, 4], [80, 2], [68, 7], [61, 13], [66, 17], [78, 15], [95, 18]]);          // 头
    P([[66, 17], [74, 22], [88, 24], [95, 22], [95, 18], [78, 15]]);                 // 下颚
    P([[86, 20], [95, 18], [95, 60], [88, 50], [84, 34]]);                           // 脖子
    P([[88, 34], [76, 40], [64, 52], [60, 60], [64, 58], [70, 50], [86, 42]]);       // 前爪
    const [x0, y0, x1, y1] = L.box(0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!L.get(x, y)) continue;
      const edge = !L.get(x - 1, y) || !L.get(x + 1, y) || !L.get(x, y - 1) || !L.get(x, y + 1);
      if (edge) M.set(x, y, g); else if ((x + y) % 3 === 0) M.set(x, y, gd);
    }
    for (let i = 0; i < 5; i++) { M.set(Math.round((68 + i * 3) * k), 17 + (i % 2), [255, 255, 255]); M.set(Math.round((70 + i * 4) * k), 21, [255, 255, 255]); }
    M.set(Math.round(76 * k), 8, [255, 80, 80]); M.set(Math.round(77 * k), 8, [255, 80, 80]); M.set(Math.round(76 * k), 9, [255, 160, 120]);
    for (const [cx, cy] of [[60, 60], [63, 61], [66, 60]]) M.line(Math.round(cx * k), cy, Math.round((cx - 2) * k), cy + 3, [255, 255, 255]);
  }

  // —— 角色 ——
  function chen() {
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '陈晖洁', app: { hat: null, style: 'long', hair: [46, 60, 104], eye: [206, 60, 70], top: 'uniform', cloth: [36, 46, 84], scale: [58, 70, 112], glasses: false, acc: null } });
    setRace(t, 'lung');
    t.items = [];
    t.voice = 150;
    looks(t, chenSword);
    t.intro = ['近卫局特别督察，陈。', '（她把证件拍在窗口上，旁边是一枚近卫局的徽章。）', '例行巡查。别浪费我的时间。'];
    t.answers = { race: ['龙。龙门的龙。', '图鉴里没有？那是近卫局的失职，我会处理。'] };
    t.ok = ['approve', 'deny'];
    t.react = {
      approve: '效率不错。继续保持。',
      deny: '……很好。按规矩办事，这才是龙门的审查员。',
      detain: '拘留我？……你有胆量。可惜理由不够。',
    };
    t.citeWhy = () => '无故拘留了近卫局特别督察陈晖洁';
    t.eggAnalyze = raceHint('种族图鉴里没有“龙”这一页。……不过她胸前那枚近卫局徽章是真的。');
    return t;
  }

  function hoshiguma() {
    const t = makeTraveler({ nation: 'lungmen', race: 'oni', name: '星熊', app: { hat: null, style: 'long', hair: [56, 96, 74], eye: [234, 172, 52], top: 'suit', cloth: [52, 56, 70], tie: [150, 40, 40], glasses: false, acc: null } });
    t.items = [];
    t.voice = 110;
    looks(t, (M) => oniShield(oniHead(M)), oniHead);
    t.intro = ['（一面巨大的盾牌先挤进了窗口，然后卡住了。）', '……抱歉。星熊，近卫局。', '盾牌就不拿进来了。证件给你。'];
    t.answers = { race: ['鬼。从东边来的，在龙门住了很多年了。', '图鉴里没有？回头让陈补上。'] };
    t.ok = ['approve'];
    t.react = {
      approve: '谢了。改天请你喝酒。',
      deny: '（她叹了口气，扛起盾牌，从员工通道进去了。）',
      detain: '……（盾牌又往窗口里挤了一点。）你认真的？',
    };
    t.citeWhy = (dec) => (dec === 'detain' ? '无故拘留了近卫局高级警司星熊' : '拒绝了近卫局高级警司星熊（证件齐全）');
    t.eggAnalyze = raceHint('种族图鉴里没有“鬼”这一页。……不过近卫局的人都认识她。');
    return t;
  }

  function swire() {
    const t = makeTraveler({ nation: 'lungmen', race: 'feline', name: '诗怀雅', app: { hat: null, style: 'long', hair: [242, 208, 124], eye: [234, 172, 52], top: 'suit', cloth: [204, 162, 74], tie: [150, 40, 40], glasses: false, acc: null } });
    t.items = ['coins'];
    t.docs.id.expiry = today() - 1;
    t.flaws = ['id_expired'];
    t.bribe = 100;
    t.voice = 220;
    t.intro = ['哎呀，排队真慢。', '（她把一沓厚厚的龙门币压在了证件底下。）', '我是诗怀雅，你应该听说过我吧？行个方便？'];
    t.answers = { expired: ['过期了？我最近太忙了嘛。', '这点小事……钱不够的话，我这里还有。'] };
    t.ok = ['deny', 'detain'];
    t.react = {
      approve: '……（她收起笑容，亮出近卫局的证件）廉政抽查。你被记过了，审查员。',
      deny: '（她亮出近卫局的证件）廉政抽查。很好——钱我收回了。',
      detain: '（她笑出了声）拘留我？抽查合格，而且很有魄力嘛。',
    };
    t.citeWhy = () => '收受贿赂，放行了证件过期的旅客（廉政抽查）';
    return t;
  }

  function wei() {
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '魏彦吾', app: { hat: 'cap', hatColor: [36, 36, 42], style: 'short', hair: [64, 64, 76], eye: [206, 60, 70], top: 'suit', cloth: [40, 40, 48], tie: [150, 40, 40], scale: [70, 76, 104], glasses: false, acc: null } });
    setRace(t, 'lung');
    t.items = [];
    t.voice = 95;
    t.intro = ['（一位衣着考究的中年人。不远处，站着两个穿黑衣的人。）', '不必紧张。我只是路过，看看年轻人怎么干活。'];
    t.hatLine = '……好。规矩就是规矩。';
    t.answers = { race: ['龙。', '这张脸，你在电视上应该见过。'] };
    t.ok = ['approve', 'deny'];
    t.react = {
      approve: '嗯。手脚利索，不错。',
      deny: '哈哈哈！好！龙门需要的，就是你这样的人。',
      detain: '（两个黑衣人同时上前一步。他抬手拦住了他们。）年轻人，下次看清楚再动手。',
    };
    t.citeWhy = () => '试图拘留龙门总督魏彦吾';
    t.eggAnalyze = raceHint('种族图鉴里没有“龙”这一页。……这张脸，你好像在电视上见过。');
    return t;
  }

  function texas() {
    const t = makeTraveler({ nation: 'siracusa', race: 'lupo', name: '德克萨斯', app: { hat: null, style: 'long', hair: [40, 36, 42], eye: [234, 172, 52], top: 'jacket', cloth: [52, 56, 70], glasses: false, acc: null } });
    t.items = ['phone'];
    if (t.docs.permit) t.docs.permit.purpose = '送货';
    t.voice = 120;
    looks(t, pocky);
    t.intro = ['……', '企鹅物流。送货。'];
    t.answers = { name: ['德克萨斯。……就这样。'], nation: ['叙拉古。以前的事，不想提。'] };
    t.react = {
      approve: '……谢了。这个给你。',
      deny: '……（她转身就走。远处有人喊：“德克萨斯——等等我！”）',
      detain: '……（她看了你一眼。那眼神让你有点后悔。）',
    };
    return t;
  }

  function exusiai() {
    const t = makeTraveler({ nation: 'laterano', race: 'sankta', name: '能天使', app: { hat: null, style: 'short', hair: [206, 76, 72], eye: [206, 72, 84], top: 'jacket', cloth: [52, 56, 70], glasses: false, acc: null } });
    t.items = ['phone'];
    if (t.docs.permit) t.docs.permit.purpose = '送货';
    t.voice = 240;
    t.scanFn = scanGuns;
    t.intro = ['嗨～审查员！', '企鹅物流，使命必达！今天送的是……嗯，保密！', '（她背后的琴盒里，发出了金属碰撞的声音。）'];
    t.answers = { name: ['证件上就是这么写的！拉特兰人起名很自由的～'] };
    t.react = {
      approve: met('penguin') ? '谢啦！老板在后门等我呢，拜拜～这个苹果派给你！' : '谢啦！这个给你——刚出炉的苹果派！',
      deny: '诶——？好吧，我从屋顶过去也一样！',
      detain: '等等等等！琴盒里只是乐器啦！……大概。',
    };
    t.eggAnalyze = (a, b) => {
      if (pair(a, b, 'face', 'rule.smuggle') || pair(a, b, 'face', 'rule.reunion')) return { hint: '琴盒里装的是铳。拉特兰人出门都带铳，手册上没说不行。' };
      return null;
    };
    return t;
  }

  function lappland() {
    const t = makeTraveler({ nation: 'siracusa', race: 'lupo', name: '拉普兰德', app: { hat: null, style: 'messy', hair: [244, 242, 238], eye: [66, 124, 206], top: 'coat', cloth: [52, 56, 70], glasses: false, acc: null } });
    t.items = [];
    applyFlaw(t, 'permit_expired');
    if (t.docs.permit) t.docs.permit.purpose = '找人';
    t.voice = 200;
    looks(t, scar, scar);
    t.expr = 'smile';
    t.intro = met('texas') && decOf('texas') === 'approve'
      ? ['哈……我闻到了。', '德克萨斯刚刚从这里过去了，对吧？', '那我更要进去了。']
      : ['哈哈……龙门，好热闹的地方。', '我来找个老朋友。她叫德克萨斯——你见过吗？'];
    t.answers = { expired: ['过期了？哈，我在荒野里转了太久，都忘了日子。', '让我进去吧。德克萨斯在等我——虽然她自己还不知道。'] };
    t.react = {
      approve: '哈哈哈哈！谢啦！龙门今晚会很热闹的！',
      deny: '哈哈哈！拒绝我？你真有意思。我会再来的。',
      detain: '拘留我？好啊好啊——看你们关不关得住。',
    };
    return t;
  }

  function amiya() {
    const t = makeTraveler({ nation: 'kazdel', race: 'cautus', name: '阿米娅', app: { hat: null, style: 'long', hair: [96, 62, 40], eye: [66, 124, 206], top: 'coat', cloth: [36, 38, 46], glasses: false, acc: null } });
    t.items = [];
    makeRhodes(t);
    t.docs.rhodes.code = '阿米娅';
    t.voice = 230;
    const doc = met('doctor');
    t.intro = ['您好！我是罗德岛的阿米娅。', '我们来龙门，是为了帮助这里的感染者。这是我的干员证。'];
    if (doc) t.intro.push('……那个，请问您有没有见过一个戴兜帽的人？');
    t.answers = { infected: ['是的，我是感染者。', '但罗德岛的干员证，可以证明我们是来帮忙的。'] };
    t.react = {
      approve: doc ? '博士来过这里？太好了……谢谢您！' : '谢谢您！罗德岛会记住您的。',
      deny: '……我明白了。我们会遵守龙门的规定。',
      detain: '（她手上的戒指闪过一道微光，又暗了下去。）……请不要这样。',
    };
    return t;
  }

  function kaltsit() {
    const t = makeTraveler({ nation: 'victoria', race: 'feline', name: '凯尔希', app: { hat: null, style: 'bob', hair: [200, 222, 204], eye: [72, 164, 104], top: 'coat', cloth: [184, 188, 200], glasses: false, acc: null, badge: true } });
    t.items = [];
    t.docs.rhodes = { code: '凯尔希', name: t.name, expiry: today() + ri(300, 900) };
    t.voice = 130;
    t.scanFn = scanMon3tr;
    t.intro = [
      met('amiya') ? '阿米娅已经过去了？……好。' : '罗德岛医疗部，凯尔希。',
      '关于矿石病在下城区的扩散，我需要尽快和龙门的负责人谈一谈。',
      '（她开始解释源石结晶在血液里的沉积机制。三分钟过去了，你身后的队伍开始打哈欠。）',
      '……你在听吗？',
    ];
    t.react = {
      approve: '谢谢。另外，你该早点睡觉了，你的黑眼圈很重。',
      deny: '这个决定并不明智。不过，我尊重规则。',
      detain: '……Mon3tr，不必。我们走。',
    };
    return t;
  }

  function wBomb() {
    const t = makeTraveler({ nation: 'kazdel', race: 'sarkaz', name: 'W', app: { hat: null, style: 'bob', hair: [214, 214, 224], eye: [206, 72, 84], skin: 'pale', top: 'jacket', cloth: [112, 40, 48], glasses: false, acc: null } });
    t.items = ['egg_bomb'];
    t.detain = true;
    t.flaws = ['smuggle'];
    t.voice = 210;
    t.expr = 'smile';
    t.scanFn = scanBomb;
    t.intro = ['嗨～', '（她笑眯眯地把证件推过来。指尖有一股火药味。）', '我只是来送个礼物，很快就走～'];
    t.answers = { smuggle: ['这个？礼物而已嘛～', '别那么紧张，它只是在……倒计时。'] };
    t.react = {
      approve: '谢啦～礼物就放在你桌上了哦。',
      deny: '真无情～那这个礼物，就留给你吧。',
      detain: '哎呀，被发现了～不过，你桌上好像有什么东西在响哦？',
    };
    t.citeWhy = (dec) => (dec === 'approve' ? '放行了携带源石炸药的旅客' : '');
    t.eggAnalyze = (a, b) => {
      if (pair(a, b, 'rule.smuggle', 'scan.egg_bomb')) return { kind: 'smuggle', text: '“礼物”里装着源石炸药。' };
      return null;
    };
    return t;
  }

  function frostnova() {
    const t = makeTraveler({ nation: 'ursus', race: 'cautus', name: '叶莲娜', app: { hat: null, style: 'long', hair: [244, 242, 238], eye: [66, 124, 206], top: 'coat', cloth: [184, 188, 200], glasses: false, acc: null } });
    t.items = [];
    applyFlaw(t, 'infected');
    applyFlaw(t, 'reunion');
    applyFlaw(t, 'ursus');
    t.voice = 150;
    t.expr = 'sad';
    looks(t, snow);
    t.intro = ['（窗口的玻璃上，结了一层薄薄的霜。）', '……', '龙门，比切尔诺伯格暖和多了。'];
    t.answers = {
      reunion: ['……我不会说谎。是的，我是整合运动的人。', '你可以拘留我。只是，你挡不住冬天。'],
      infected: ['是啊。我们都是。', '……这病，让我越来越冷了。'],
    };
    t.react = {
      approve: '……谢谢。你是个温柔的人。可惜，这里不是温柔的地方。',
      deny: '……我明白。',
      detain: '……这样也好。替我向雪怪们说声抱歉。',
    };
    return t;
  }

  function crownslayer() {
    const t = makeTraveler({ nation: 'lungmen', race: 'feline', app: { hat: 'hood', hatColor: [96, 32, 40], style: 'short', hair: [40, 36, 42], top: 'hoodie', cloth: [52, 46, 52], glasses: false, acc: null } });
    t.items = [];
    applyFlaw(t, 'reunion');
    t.voice = 170;
    t.drawFn = (o) => drawPerson(t.app, Object.assign({}, o, { hatOff: false }));
    t.photoFn = () => drawPerson(t.app, { hatOff: false });
    t.hatLine = '……不。';
    t.intro = ['（你一眨眼，她已经站在窗口前了。）', '龙门人。回家。', '……快点。'];
    t.answers = { reunion: ['……你看到了什么，就当没看到。', '（她的手按在了腰间。）'] };
    t.react = {
      approve: '（一阵风吹过。她已经不见了。）',
      deny: '……哼。墙挡不住我。',
      detain: '（兜帽滑落，露出一张整合运动的面具。）……记住这个名字：弑君者。',
    };
    t.eggAnalyze = (a, b) => (pair(a, b, 'face', 'id.race') || pair(a, b, 'face', 'id.photo') ? { hint: '兜帽遮得严严实实。连证件照上都戴着。' } : null);
    return t;
  }

  function gummy() {
    const t = makeTraveler({ nation: 'ursus', race: 'ursus', name: '古米', app: { hat: null, style: 'twin', hair: [222, 112, 92], eye: [66, 124, 206], top: 'hoodie', cloth: [178, 152, 114], glasses: false, acc: null } });
    t.items = ['keys'];
    if (t.docs.permit) t.docs.permit.purpose = '探亲';
    applyFlaw(t, 'ursus');
    t.voice = 250;
    t.expr = 'smile';
    t.intro = ['你好呀！', '（她怀里抱着一个冒着热气的保温桶。）', '我是来给朋友送罗宋汤的！'];
    t.answers = { ursus: ['我、我只是来送饭的……', '汤要凉了……'] };
    t.react = {
      approve: '谢谢你！这一份给你，趁热喝哦！',
      deny: S.day >= 5 ? '……好吧。这一份还是留给你吧，别饿着。' : '诶……那汤要凉了……',
      detain: '呜……至少把汤喝了吧！',
    };
    return t;
  }

  const TRAVELERS = [
    { k: 'claude', from: 1, p: 0.02, make: claude },
    { k: 'penguin', from: 2, p: 0.02, make: penguin },
    { k: 'inspector', from: 2, p: 0.02, make: inspector },
    { k: 'doctor', from: 3, p: 0.02, make: doctor },
    { k: 'chen', from: 1, p: 0.008, op: 1, name: '陈', make: chen },
    { k: 'texas', from: 1, p: 0.008, op: 1, name: '德克萨斯', make: texas },
    { k: 'gummy', from: 1, p: 0.008, op: 1, name: '古米', make: gummy },
    { k: 'hoshiguma', from: 2, p: 0.008, op: 1, name: '星熊', make: hoshiguma },
    { k: 'swire', from: 2, p: 0.008, op: 1, name: '诗怀雅', make: swire },
    { k: 'exusiai', from: 2, p: 0.008, op: 1, name: '能天使', make: exusiai },
    { k: 'lappland', from: 2, p: 0.008, op: 1, name: '拉普兰德', make: lappland },
    { k: 'wei', from: 3, p: 0.008, op: 1, name: '魏彦吾', make: wei },
    { k: 'w', from: 3, p: 0.008, op: 1, name: 'W', make: wBomb },
    { k: 'amiya', from: 4, p: 0.008, op: 1, name: '阿米娅', make: amiya },
    { k: 'kaltsit', from: 4, p: 0.008, op: 1, name: '凯尔希', make: kaltsit },
    { k: 'frostnova', from: 4, p: 0.008, op: 1, name: '霜星', make: frostnova },
    { k: 'crownslayer', from: 4, p: 0.008, op: 1, name: '弑君者', make: crownslayer },
  ];
  const OLD_NAMES = { claude: 'Claude', penguin: '大帝', inspector: '周督察', doctor: '戴兜帽的人' };
  const eggName = (k) => (TRAVELERS.find((x) => x.k === k) || {}).name || OLD_NAMES[k] || k;

  function spawn(x) {
    mark(x.k);
    if (S) { S.flags['egg_day' + S.day] = true; S.flags['egg_' + x.k + '_day'] = S.day; }
    const t = x.make();
    t.eggKey = x.k;
    return t;
  }

  E.traveler = function (n) {
    if (!S) return undefined;
    if (typeof specialDue === 'function' && specialDue(n)) return undefined;
    const forced = TRAVELERS.find((x) => x.k === E.force);
    if (forced) { E.force = null; return spawn(forced); }
    if (n < 2) return undefined;
    const pool = TRAVELERS.filter((x) => S.day >= x.from && once(x.k)).sort(() => Math.random() - 0.5);
    for (const x of pool) if (Math.random() < x.p) return spawn(x);
    // 第 2–5 天，每天至少来一位熟面孔
    if (D && S.day >= 2 && !flags()['egg_day' + S.day]) {
      if (D.eggAt === undefined) D.eggAt = ri(3, 7);
      const ops = pool.filter((x) => x.op);
      if (n >= D.eggAt && ops.length) return spawn(ops[0]);
    }
    return undefined;
  };

  // 违规通知里写清楚是谁
  if (typeof citeReason === 'function') {
    const baseCite = citeReason;
    citeReason = function (t, dec) {
      if (t && t.citeWhy && !okSet(t).includes(dec)) { const w = t.citeWhy(dec); if (w) return w; }
      return baseCite(t, dec);
    };
  }

  // —— 盖章之后 ——
  const OUT = {
    chen: (t, dec) => {
      if (dec === 'deny') {
        news('陈督察昨日在边境检查站被拦下。陈：“按规矩办事，做得好。”近卫局宣布：检查手册将增补“龙”一页。');
        S.flags.egg_lungPage = true;
      }
    },
    hoshiguma: (t, dec) => { if (dec === 'approve') narrate(1600, '（窗外传来“咚”的一声。盾牌终于从窗口拔出来了。）'); },
    swire: (t, dec) => {
      if (dec === 'approve') {
        D.bribe -= t.bribe || 0;
        D.fines += 5;
        updateHud();
        setTimeout(() => { if (scene === 'booth') banner('近卫局廉政抽查：贿款没收，另罚 5 龙门币。', 'bad'); }, 900);
        news('近卫局廉政抽查：一名审查员收受“小费”被记过。诗怀雅警司：“钱不是万能的。”');
      } else {
        setTimeout(() => { if (scene === 'booth') banner('近卫局廉政抽查：合格。', 'info'); }, 900);
      }
    },
    wei: (t, dec) => { if (dec === 'deny') news('魏彦吾长官微服私访边境检查站，被审查员拒之门外。魏长官：“龙门就需要这样的人。”'); },
    texas: (t, dec) => {
      if (dec !== 'approve') return;
      S.flags.egg_pocky = (S.flags.egg_pocky || 0) + 8;
      narrate(1300, '（她从口袋里掏出一盒 Pocky，放在了你桌上。）');
      setTimeout(addPocky, 1500);
    },
    exusiai: (t, dec) => { if (dec === 'approve') S.flags.pie = S.day; },
    lappland: (t, dec) => { if (dec === 'approve') news('下城区昨夜发生斗殴。目击者：“一个白头发的鲁珀，一边大笑一边挥剑。”'); },
    amiya: (t, dec) => { if (dec === 'approve') S.flags.rhodes = true; },
    kaltsit: (t, dec) => { if (dec === 'approve') S.flags.rhodesDoc = true; },
    w: () => { setTimeout(addGift, 1700); },
    frostnova: (t, dec) => { if (dec === 'approve') news('龙门气象台：下城区昨夜罕见降雪，原因不明。'); },
    crownslayer: (t, dec) => {
      if (dec === 'approve') news('近卫局：整合运动干部“弑君者”疑似已潜入城内。');
      if (dec === 'detain') news('近卫局在边境检查站抓获一名整合运动干部。');
    },
    gummy: (t, dec) => { if (dec === 'approve' || (dec === 'deny' && S.day >= 5)) { S.flags.pie = S.day; S.flags.egg_soup = S.day; } },
  };

  const ACHV = [
    { k: 'penguin_all', need: ['penguin', 'texas', 'exusiai'], text: '成就：企鹅物流，使命必达' },
    { k: 'guard_all', need: ['chen', 'hoshiguma', 'swire'], text: '成就：近卫局三位督察都来过了' },
    { k: 'rhodes_all', need: ['doctor', 'amiya', 'kaltsit'], text: '成就：罗德岛的老朋友' },
    { k: 'reunion_all', need: ['frostnova', 'crownslayer', 'w'], text: '成就：整合运动的不速之客' },
  ];
  function checkAchv() {
    for (const a of ACHV) {
      if (flags()['achv_' + a.k] || !a.need.every(met)) continue;
      S.flags['achv_' + a.k] = true;
      setTimeout(() => toast(a.text), 2400);
    }
  }

  E.decide = function (t, dec) {
    if (t.inspector) {
      const ok = dec !== 'approve';
      setTimeout(() => { if (scene === 'booth') banner(ok ? '近卫局突击抽查：合格。' : '近卫局突击抽查：不合格。', ok ? 'info' : 'bad'); }, 900);
    }
    if (t.eggKey && S) {
      S.flags['egg_' + t.eggKey + '_dec'] = dec;
      if (OUT[t.eggKey]) OUT[t.eggKey](t, dec);
      checkAchv();
    }
  };

  // ———————————————— 小提示条 ————————————————

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'egg-toast';
    el.textContent = text;
    stage.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
  }

  // 5. 墨镜模式：Konami 码，或者在检查亭连点日期 7 下
  function toggleShades() {
    E.shades = !E.shades;
    SFX.init(); SFX.good();
    const msg = E.shades ? '理性模式启动：所有人都戴上了墨镜。' : '理性模式关闭：墨镜收起来了。';
    if (scene === 'booth' && D) { banner(msg, 'warn'); renderPortrait(); } else toast(msg);
  }
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  document.addEventListener('keydown', (ev) => {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) { kpos = 0; toggleShades(); }
  });

  // ———————————————— 标题页：点立绘 ————————————————

  const TITLE_RACES = ['vulpo', 'sarkaz', 'feline', 'sankta', 'ursus'];
  const TITLE_LINES = {
    vulpo: ['尾巴不给摸！', '……就摸一下哦。'],
    sarkaz: ['看什么看。', '再点我就……算了，你也不容易。'],
    feline: ['喵？', '喵～'],
    sankta: ['主保佑你！', '要来块苹果派吗？'],
    ursus: ['……', '（他默默递给你一罐蜂蜜。）'],
  };
  const TITLE_EXPR = { vulpo: 'angry', sarkaz: 'angry', feline: 'smile', sankta: 'smile', ursus: 'closed' };

  function titleEggs() {
    const cv = document.getElementById('tArt');
    if (!cv) return;
    const clicks = [0, 0, 0, 0, 0];
    cv.style.cursor = 'pointer';
    cv.addEventListener('pointerdown', (ev) => {
      const r = cv.getBoundingClientRect();
      const i = Math.max(0, Math.min(4, Math.floor((ev.clientX - r.left) / r.width * 5)));
      const race = TITLE_RACES[i];
      clicks[i]++;
      SFX.init(); SFX.click();
      if (clicks[i] < 3) return;
      const lines = TITLE_LINES[race];
      const line = lines[Math.min(lines.length - 1, Math.floor((clicks[i] - 3) / 2))];
      const ctx = cv.getContext('2d');
      ctx.clearRect(i * 96, 0, 96, 80);
      drawPerson(sampleApp(race), { expr: TITLE_EXPR[race] }).draw(cv, i * 96, 0);
      SFX.mumble(line, race === 'ursus' ? 90 : 190);
      const old = cv.parentNode.querySelector(`.egg-bubble[data-i="${i}"]`);
      if (old) old.remove();
      const b = document.createElement('div');
      b.className = 'egg-bubble';
      b.dataset.i = i;
      b.textContent = line;
      b.style.left = `${cv.offsetLeft + (i + 0.5) * (cv.offsetWidth / 5)}px`;
      b.style.top = `${cv.offsetTop + 12}px`;
      cv.parentNode.appendChild(b);
      setTimeout(() => {
        b.remove();
        if (!document.body.contains(cv)) return;
        ctx.clearRect(i * 96, 0, 96, 80);
        drawPerson(sampleApp(race), { expr: i === 2 ? 'smile' : 'neutral' }).draw(cv, i * 96, 0);
      }, 1800);
    });
  }

  // ———————————————— 检查亭：日期连点、源石虫 ————————————————

  function boothEggs() {
    const date = document.getElementById('hDate');
    if (date) {
      let n = 0, t0 = 0;
      date.addEventListener('pointerdown', () => {
        const now = performance.now();
        n = now - t0 < 2500 ? n + 1 : 1;
        t0 = now;
        if (n >= 7) { n = 0; toggleShades(); }
      });
    }
    if (E.force === 'slug') { E.force = null; setTimeout(spawnSlug, 300); }
  }

  function slugCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 22; cv.height = 13;
    const M = new Pix(22, 13);
    layer(M, (L) => {
      L.ell(11, 9, 9, 3.6, [214, 142, 76]);
      L.ell(4, 8, 3, 2.6, [224, 160, 96]);
      L.rect(1, 3, 1, 4, [190, 120, 60]); L.rect(4, 3, 1, 4, [190, 120, 60]);
    });
    layer(M, (L) => {
      L.poly([[8, 7], [11, 1], [14, 7]], [70, 66, 80]);
      L.poly([[13, 7], [16, 3], [18, 8]], [84, 80, 96]);
    });
    M.set(11, 4, [255, 176, 70]); M.set(16, 5, [255, 176, 70]);
    M.set(3, 7, [30, 24, 26]);
    M.draw(cv);
    return cv;
  }

  function spawnSlug() {
    if (scene !== 'booth' || !D || D.ended) return;
    const desk = document.getElementById('desk');
    if (!desk || desk.querySelector('.egg-slug')) return;
    const el = document.createElement('div');
    el.className = 'egg-slug';
    el.appendChild(slugCanvas());
    el.style.top = `${40 + Math.floor(Math.random() * 150)}px`;
    desk.appendChild(el);
    void el.offsetWidth;
    el.classList.add('go');
    let hit = false;
    el.addEventListener('pointerdown', (ev) => {
      if (hit) return;
      hit = true;
      ev.stopPropagation();
      SFX.click();
      el.classList.add('flee');
      if (S) S.flags.egg_slugs = (S.flags.egg_slugs || 0) + 1;
      const n = S ? S.flags.egg_slugs : 1;
      say('n', n >= 3 ? `（你今天已经弹走第 ${n} 只源石虫了。它们好像很喜欢你的桌子。）` : '（你把一只源石虫弹下了桌子。）');
      setTimeout(() => el.remove(), 700);
    });
    setTimeout(() => el.remove(), 15000);
  }

  setInterval(() => {
    if (scene === 'booth' && D && !D.paused && !D.ended && !document.hidden && Math.random() < 0.08) spawnSlug();
  }, 15000);

  // ———————————————— 结算：可露希尔的广告 / 合成玉 ————————————————

  function summaryEggs() {
    const panel = document.querySelector('#summary .panel');
    if (!panel) return;
    const f = E.force;
    if (f === 'ad' || f === 'jade') E.force = null;
    if (f === 'ad' || (f !== 'jade' && Math.random() < 0.08)) {
      const ad = document.createElement('div');
      ad.className = 'egg-ad';
      ad.innerHTML = '<b>可露希尔的限时特惠</b>十连寻访只要 6000 合成玉！<br>今日首单双倍！<small>（你没有合成玉。点一下撕掉。）</small>';
      ad.addEventListener('pointerdown', () => { SFX.paper(); ad.classList.add('torn'); setTimeout(() => ad.remove(), 400); });
      panel.appendChild(ad);
    } else if (f === 'jade' || Math.random() < 0.06) {
      const fam = panel.querySelector('.fam');
      if (fam) {
        const d = document.createElement('div');
        d.className = 'egg-jade';
        d.innerHTML = '<span>口袋里</span>合成玉 ×1';
        d.title = '不能付房租。';
        fam.appendChild(d);
      }
    }
  }


  // ———————————————— 检查亭：桌上的小东西 ————————————————

  function pixCanvas(w, h, fn) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const M = new Pix(w, h);
    fn(M);
    M.outline(OLC);
    M.draw(cv);
    return cv;
  }

  // 德克萨斯给的 Pocky：点一下吃一根
  function addPocky() {
    if (scene !== 'booth' || !D || typeof addDoc !== 'function') return;
    const n = (S && S.flags.egg_pocky) || 0;
    let el = document.querySelector('#docs .doc[data-doc="egg_pocky"]');
    if (n <= 0) { if (el) el.remove(); return; }
    if (!el) {
      el = addDoc('egg_pocky', '<div class="egg-pk"></div><span class="egg-pkn"></span>', 150, 214, 'egg-item');
      el.querySelector('.egg-pk').appendChild(pixCanvas(30, 18, (M) => {
        M.rect(1, 4, 27, 13, [206, 40, 48]); M.rect(1, 4, 27, 2, [236, 80, 84]);
        M.rect(4, 8, 14, 5, [250, 240, 226]);
        for (let i = 0; i < 4; i++) { M.rect(20 + i * 2, 1 + (i % 2), 1, 4, [112, 62, 40]); M.set(20 + i * 2, 5, [232, 196, 140]); }
        for (let x = 5; x < 17; x += 3) M.rect(x, 9, 2, 3, [112, 62, 40]);
      }));
      let at = null;
      el.addEventListener('pointerdown', () => { at = el.style.left + el.style.top; });
      el.addEventListener('click', () => {
        if (at !== el.style.left + el.style.top || !S) return;
        S.flags.egg_pocky = Math.max(0, (S.flags.egg_pocky || 0) - 1);
        SFX.click();
        const left = S.flags.egg_pocky;
        say('n', left ? `（你吃了一根 Pocky。巧克力味的。还剩 ${left} 根。）` : '（最后一根 Pocky 也吃完了。你把空盒子叠好收了起来。）');
        addPocky();
      });
    }
    el.querySelector('.egg-pkn').textContent = `Pocky ×${n}`;
  }

  // W 留下的“礼物”：会响，点开或者等它自己炸
  function addGift() {
    if (scene !== 'booth' || !D || D.ended || typeof addDoc !== 'function') return;
    if (document.querySelector('#docs .doc[data-doc="egg_gift"]')) return;
    const el = addDoc('egg_gift', '<div class="egg-gb"></div><span class="egg-led"></span><span class="egg-gt">滴……滴……</span>', 120, 150, 'egg-item');
    el.querySelector('.egg-gb').appendChild(pixCanvas(26, 22, (M) => {
      M.rect(1, 7, 24, 14, [168, 40, 52]); M.rect(1, 4, 24, 4, [196, 56, 66]);
      M.rect(11, 4, 4, 17, [240, 206, 96]); M.rect(1, 12, 24, 3, [240, 206, 96]);
      M.poly([[13, 4], [6, 0], [7, 4]], [240, 206, 96]); M.poly([[13, 4], [20, 0], [19, 4]], [240, 206, 96]);
    }));
    const day = D;
    let done = false;
    const beep = setInterval(() => {
      if (!document.body.contains(el) || D !== day) { clearInterval(beep); return; }
      if (!done) SFX.tone(1480, 0.05, 'square', 0.03);
    }, 1000);
    const finish = (txt) => {
      if (done) return;
      done = true;
      clearInterval(beep);
      el.classList.add('open');
      el.querySelector('.egg-gt').textContent = 'Boom～ 开玩笑的。——W';
      say('n', txt);
      setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 520); }, 6000);
    };
    let at = null;
    el.addEventListener('pointerdown', () => { at = el.style.left + el.style.top; });
    el.addEventListener('click', () => {
      if (at !== el.style.left + el.style.top) return;
      SFX.paper();
      finish('（你屏住呼吸，打开了盒子——里面是一个闹钟和一张卡片。）');
    });
    setTimeout(() => {
      if (done || !document.body.contains(el)) return;
      SFX.noise(0.5, 0.4, 1200);
      el.classList.add('boom');
      finish('（盒子“砰”的一声炸开了——喷了你一脸彩带。）');
    }, 20000);
  }

  // 图鉴增补“龙”一页（陈被拦下之后）
  let lateWrapped = false;
  function wrapLate() {
    if (lateWrapped || typeof sampleApp !== 'function') return;
    lateWrapped = true;
    const base = sampleApp;
    sampleApp = function (race) {
      if (race === 'lung') return Object.assign(base('vouivre'), { hair: [46, 60, 104], eye: [206, 60, 70], scale: [58, 70, 112], style: 'long', top: 'uniform', cloth: [36, 46, 84] });
      return base(race);
    };
  }
  function syncLungPage() {
    const on = !!flags().egg_lungPage, i = RACE_ORDER.indexOf('lung');
    if (on && i < 0) RACE_ORDER.push('lung');
    if (!on && i >= 0) RACE_ORDER.splice(i, 1);
  }

  // ———————————————— 检查亭：对讲机 ————————————————

  const RADIO = {
    1: '各检查站注意，今天起恢复正常通行。都给我打起精神。',
    2: '切尔诺伯格的消息你们都听说了。感染者入境，一律按新规办。',
    3: '下城区查获一批源石。检查站的探测仪，别只当摆设。',
    4: '整合运动已经出现在龙门周边。看到面具，直接拘留。',
    5: '……今天可能是很长的一天。守住检查站。完毕。',
  };
  const RADIO_X = [
    '（隔壁亭子的收音机里在放空的新歌。你跟着哼了两句。）',
    '（对讲机里传来星熊的声音：“谁的车停在闸门口？企鹅物流的？……算了。”）',
    '（对讲机里传来诗怀雅的声音：“下班后谁跟我去喝下午茶？我请客！”没有人回答。）',
    '（对讲机里有人小声说：“听说魏长官今天会来巡查？”另一个声音：“嘘。”）',
  ];
  function radioTick() {
    if (scene !== 'booth' || !D || D.paused || D.ended || D.over) return;
    if (D.eggRadio === undefined) {
      D.eggRadio = Math.random() < 0.6 ? 40 + Math.random() * 180 : Infinity;
      D.eggRadio2 = Math.random() < 0.3 ? 60 + Math.random() * 200 : Infinity;
    }
    if (E.force === 'radio') { E.force = null; D.eggRadio = D.t; }
    if (D.t >= D.eggRadio) {
      D.eggRadio = Infinity;
      SFX.tone(1200, 0.06, 'square', 0.03); SFX.noise(0.3, 0.05, 2400, 0.08);
      say('n', `（对讲机沙沙作响：“这里是近卫局，陈。${RADIO[S.day] || RADIO[5]}”）`);
    }
    if (D.t >= D.eggRadio2) {
      D.eggRadio2 = Infinity;
      say('n', RADIO_X[Math.floor(Math.random() * RADIO_X.length)]);
    }
  }
  setInterval(radioTick, 1000);

  // ———————————————— 室外：路过的熟面孔 ————————————————

  const look = (o) => Object.assign({ race: 'feline', hair: [40, 36, 42], cloth: [52, 56, 70], skin: [250, 222, 200], pants: [40, 40, 50], tall: 1, long: false, hat: null, hatColor: [52, 56, 70], bag: null, bagColor: [120, 80, 50], scale: [92, 128, 96], ph: Math.random() * 100 }, o);
  const CAMEOS = [
    { k: 'walk_guard', from: 1, v: 20, figs: [
      look({ race: 'vouivre', hair: [46, 60, 104], cloth: [36, 46, 84], pants: [30, 32, 44], long: true, guard: true, scale: [58, 70, 112], tall: 1 }),
      look({ race: 'oni', hair: [56, 96, 74], cloth: [52, 56, 70], pants: [30, 32, 44], long: true, tall: 2, shield: true }),
    ] },
    { k: 'walk_penguin', from: 1, v: 26, figs: [
      look({ race: 'lupo', hair: [40, 36, 42], long: true, bag: 'case', bagColor: [200, 160, 90] }),
      look({ race: 'sankta', hair: [206, 76, 72], tall: 0, bag: 'pack', bagColor: [52, 56, 70] }),
    ] },
    { k: 'walk_rhodes', from: 4, v: 18, figs: [
      look({ race: 'cautus', hair: [96, 62, 40], cloth: [36, 38, 46], tall: 0, long: true }),
      look({ race: 'feline', hat: 'hood', hatColor: [44, 46, 54], cloth: [36, 38, 46], pants: [36, 38, 46], tall: 2 }),
    ] },
    { k: 'walk_chase', from: 4, v: 62, dir: 1, gap: 26, figs: [
      look({ race: 'ursus', hair: [208, 212, 226], cloth: [236, 236, 236], hat: 'hood', hatColor: [220, 220, 224], mask: true }),
      look({ race: 'lupo', hair: [40, 36, 42], cloth: [38, 50, 92], pants: [30, 32, 44], hat: 'guard', hatColor: [38, 50, 92], guard: true, tall: 2 }),
      look({ race: 'perro', hair: [134, 80, 46], cloth: [38, 50, 92], pants: [30, 32, 44], hat: 'guard', hatColor: [38, 50, 92], guard: true, tall: 1 }),
    ] },
  ];
  const WK = { D: undefined, cur: null, next: 0 };
  E.outside = function (ctx, t, Dd) {
    if (!window.SCENE || !SCENE.drawFig || !S) return;
    if (WK.D !== Dd) { WK.D = Dd; WK.cur = null; WK.next = t + 25 + Math.random() * 50; }
    const forced = CAMEOS.find((c) => c.k === E.force);
    if (forced) { E.force = null; WK.cur = null; WK.next = -1; WK.want = forced; }
    if (!WK.cur && Dd && t > WK.next) {
      const pool = CAMEOS.filter((c) => S.day >= c.from);
      const c = WK.want || pool[Math.floor(Math.random() * pool.length)];
      WK.want = null;
      if (c) {
        const dir = c.dir || -1;
        WK.cur = { c, dir, x: dir < 0 ? 660 : 90, t0: t };
        S.flags.egg_walk = (S.flags.egg_walk || 0) + 1;
      }
    }
    const w = WK.cur;
    if (!w) return;
    const dt = Math.min(0.1, Math.max(0, t - (w.last || t)));
    w.last = t;
    w.x += w.dir * w.c.v * dt;
    const gap = w.c.gap || 13;
    const span = gap * w.c.figs.length;
    if ((w.dir < 0 && w.x < 40) || (w.dir > 0 && w.x > 660 + span)) { WK.cur = null; WK.next = t + 70 + Math.random() * 90; return; }
    ctx.save();
    ctx.beginPath(); ctx.rect(110, 0, 640, 72); ctx.clip();
    ctx.translate(0, -8);
    w.c.figs.forEach((L, i) => {
      const x = Math.round(w.x - w.dir * i * gap);
      const lift = Math.floor(t * (w.c.v > 40 ? 12 : 7) + L.ph) % 2;
      SCENE.drawFig(ctx, L, x, t, { walking: true, faceRight: w.dir > 0, lift });
      const G = SCENE.GROUND - lift;
      const head = G - 4 - (6 + L.tall) - 6;
      if (L.shield) {
        const sx = w.dir < 0 ? x - 8 : x + 4;
        ctx.fillStyle = 'rgb(22,17,22)'; ctx.fillRect(sx - 1, head + 3, 6, 15);
        ctx.fillStyle = 'rgb(92,98,112)'; ctx.fillRect(sx, head + 4, 4, 13);
        ctx.fillStyle = 'rgb(176,42,44)'; ctx.fillRect(sx + 1, head + 8, 2, 3);
        // 星熊的角
        ctx.fillStyle = 'rgb(228,120,96)'; ctx.fillRect(x + (w.dir < 0 ? -1 : 0), head - 3, 1, 2);
      }
      if (L.mask) {
        ctx.fillStyle = 'rgb(244,244,244)'; ctx.fillRect(x + (w.dir > 0 ? -2 : -3), head + 1, 5, 4);
        ctx.fillStyle = 'rgb(30,30,30)'; ctx.fillRect(x + (w.dir > 0 ? 1 : -2), head + 2, 1, 1);
        ctx.fillStyle = 'rgb(180,60,50)'; ctx.fillRect(x + (w.dir > 0 ? -1 : -2), head + 4, 3, 1);
      }
    });
    ctx.restore();
  };

  // ———————————————— 报纸：号外 / 小广告 ————————————————

  const ADS = [
    '<b>企鹅物流</b>使命必达。龙门市内次日达，易燃易爆品另计。',
    '<b>寻物启事</b>本人丢失 Pocky 一盒。拾到者请送还企鹅物流。——德克萨斯',
    '<b>近卫局提醒</b>源石虫不是宠物。请勿投喂，请勿带回家。',
    '<b>近卫局招聘</b>要求：吃苦耐劳，服从安排，不怕被陈督察骂。',
    '<b>龙门大酒楼</b>今日特价：罗宋汤（乌萨斯风味）。',
  ];
  function newsEggs() {
    const panel = document.querySelector('#news .panel');
    if (!panel || !S) return;
    const f = E.force;
    if (f === 'news' || f === 'news_ad') E.force = null;
    const items = (S.flags.egg_news || []).filter((x) => x.d === S.day - 1);
    if (f === 'news' && !items.length) items.push({ text: '本报讯：检查站附近发现大量源石虫，市民请勿投喂。' });
    if (items.length) {
      const el = document.createElement('div');
      el.className = 'egg-extra';
      el.innerHTML = `<b>号外</b>${items.slice(-2).map((x) => `<p>${esc(x.text)}</p>`).join('')}`;
      el.addEventListener('pointerdown', () => { SFX.paper(); el.classList.toggle('flip'); });
      panel.appendChild(el);
    } else if (f === 'news_ad' || Math.random() < 0.3) {
      const el = document.createElement('div');
      el.className = 'egg-extra ad';
      el.innerHTML = ADS[(S.day + Math.floor(Math.random() * ADS.length)) % ADS.length];
      panel.appendChild(el);
    }
  }

  // ———————————————— 结算 / 结局 / 标题 ————————————————

  function summaryMore() {
    const panel = document.querySelector('#summary .panel');
    if (!panel || !S) return;
    // 古米的罗宋汤顶替了晚饭
    if (S.flags.egg_soup === S.day) {
      for (const lb of panel.querySelectorAll('label.exp')) {
        for (const n of lb.childNodes) if (n.nodeType === 3 && n.textContent.includes('苹果派')) n.textContent = n.textContent.replace('苹果派', '古米的罗宋汤');
      }
    }
    const today = TRAVELERS.filter((x) => met(x.k) && S.flags['egg_' + x.k + '_day'] === S.day);
    if (today.length) setTimeout(() => toast(`今天在窗口见到了：${today.map((x) => eggName(x.k)).join('、')}`), 600);
  }

  const ENDING_X = {
    citizen: () => (decOf('chen') === 'approve' ? '嘉奖令的末尾，有一个签得很用力的名字：陈晖洁。' : ''),
    rhodes: () => (met('amiya') ? '门外，一个兔耳朵的女孩探出头来：“欢迎来到罗德岛！”' : ''),
    reunion: () => (decOf('frostnova') === 'approve' ? '那年冬天，龙门下了一场很大的雪。' : ''),
    lost: () => (met('gummy') ? '后来，有个乌萨斯女孩每周都会往隔离区送一桶罗宋汤。' : ''),
    evicted: () => (S.flags.egg_pocky ? '你口袋里还剩几根 Pocky。那天晚上，一家人分着吃了。' : ''),
  };
  function endingEggs(kind) {
    const panel = document.querySelector('#ending .panel');
    if (!panel || !S) return;
    const seen = TRAVELERS.filter((x) => met(x.k));
    const extra = (ENDING_X[kind] || (() => ''))();
    if (extra) {
      const el = document.createElement('p');
      el.className = 'egg-faces';
      el.textContent = extra;
      const stats = panel.querySelector('.stats');
      panel.insertBefore(el, stats || panel.querySelector('.credit'));
      if (panel.offsetHeight > 356) el.remove();      // 放不下就算了
    }
    if (seen.length) {
      const b = document.createElement('div');
      b.className = 'egg-badge';
      b.innerHTML = `熟面孔 ${seen.length}/${TRAVELERS.length}<div class="pop">这一周在窗口前见过：<br>${esc(seen.map((x) => eggName(x.k)).join('、'))}</div>`;
      b.addEventListener('pointerdown', () => { SFX.click(); b.classList.toggle('on'); });
      panel.appendChild(b);
    }
  }

  const TITLES = ['龙门，请出示龙门币', '龙门，请出示苹果派', '龙门，请出示 Pocky', '龙门，请出示证件'];
  function titleMore() {
    const h = document.querySelector('#title h1');
    if (h) {
      let n = 0, i = 0;
      h.style.cursor = 'default';
      h.addEventListener('pointerdown', () => {
        if (++n < 5) return;
        n = 0;
        SFX.init(); SFX.good();
        h.textContent = TITLES[i++ % TITLES.length];
      });
    }
    const sub = document.querySelector('#title .sub');
    if (sub) {
      const lines = ['招聘要求：会看耳朵。不会看的，陈督察会教你。', '待遇：日结五龙门币。苹果派另算。', '注意：窗口前偶尔会出现熟面孔。'];
      let k = 0;
      sub.addEventListener('pointerdown', () => { SFX.init(); SFX.click(); toast(lines[k++ % lines.length]); });
    }
  }

  E._spawnSlug = spawnSlug;
  E._addGift = addGift;
  E._addPocky = addPocky;
  // 第 1 天的教学来客（gen.js 的 tutorChen / visitHoshiguma）：这里只负责换上专属立绘
  E.dress = function (k, t) {
    if (k === 'chen') looks(t, chenSword);
    if (k === 'hoshiguma') {
      looks(t, (M) => oniShield(oniHead(M)), oniHead);
      t.eggAnalyze = raceHint('种族图鉴里没有“鬼”这一页。……不过近卫局的人都认识她。');
      t.eggKey = 'hoshiguma';
      mark('hoshiguma');
    }
  };
  E.TRAVELERS = TRAVELERS.map((x) => x.k);
  E.ACHV = ACHV.map((a) => ({ k: a.k, text: a.text.replace(/^成就：/, '') }));
  E.nameOf = eggName;
  E.CAMEOS = CAMEOS.map((x) => x.k);

  E.scene = function (name, arg) {
    wrapLate();
    if (name === 'title') { titleEggs(); titleMore(); }
    else if (name === 'news') newsEggs();
    else if (name === 'booth') { syncLungPage(); boothEggs(); addPocky(); }
    else if (name === 'summary') { summaryEggs(); summaryMore(); }
    else if (name === 'ending') endingEggs(arg);
  };
})();
