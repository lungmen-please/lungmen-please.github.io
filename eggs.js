'use strict';
// 彩蛋：低频出现的特别旅客、标题页互动、墨镜模式、源石虫、可露希尔的广告。
// 通过 game.js 的 hook() 调用：EGGS.scene / EGGS.traveler / EGGS.decide。
// 测试时可设 EGGS.force = 'claude' | 'penguin' | 'inspector' | 'ad' | 'jade' | 'slug'，
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
    const t = makeTraveler({ nation: 'columbia', race: 'feline', name: '克劳德·奥普斯', app: { hat: null, top: 'suit', glasses: true, skin: 'light', style: 'short', hair: [218, 122, 86], eye: [150, 86, 54], cloth: [60, 56, 62], tie: [218, 122, 86], acc: null } });
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
    const K = [34, 36, 46], W = [240, 240, 236], Y = [252, 222, 128], O = [246, 160, 52], T = [232, 234, 240];
    layer(M, (L) => {
      L.poly([[22, 54], [11, 76], [18, 79], [28, 62]], K); L.poly([[74, 54], [85, 76], [78, 79], [68, 62]], K);
    });
    layer(M, (L) => { L.ell(48, 62, 26, 28, K); L.ell(48, 31, 16.5, 16, K); });
    // 脸颊和脖子上的橙黄色
    layer(M, (L) => {
      L.ell(33.5, 37, 3.4, 6.4, O); L.ell(62.5, 37, 3.4, 6.4, O);
      L.ell(33.5, 42, 2.6, 2.4, Y); L.ell(62.5, 42, 2.6, 2.4, Y);
    }, { shade: false, line: false });
    // 白 T 恤：胸口印着一张头像
    layer(M, (L) => {
      L.poly([[30, 50], [40, 47.4], [56, 47.4], [66, 50], [74, 60], [69, 65], [66, 61.4], [66.6, 80], [29.4, 80], [30, 61.4], [27, 65], [22, 60]], T);
    }, { post: (L) => {
      const g = [70, 72, 86];
      L.ell(48, 66, 6, 6.4, g); L.rect(43, 71, 10, 4, g); L.rect(44, 64, 3, 1, T); L.rect(49, 64, 3, 1, T); L.rect(46, 68, 4, 1, T);
      L.rect(42, 77, 12, 1, [150, 154, 168]);
      L.line(40, 48, 44, 52, [200, 204, 214]); L.line(56, 48, 52, 52, [200, 204, 214]);
    } });
    // 白头巾
    layer(M, (L) => {
      L.ell(48, 26, 17.4, 13, T, (x, y) => y <= 23);
      L.poly([[62, 17], [70, 15], [72, 20], [66, 24]], T); L.poly([[66, 22], [72, 26], [68, 30], [64, 25]], T);
    }, { post: (L) => { for (let x = 32; x < 65; x++) if (L.get(x, 23)) L.set(x, 23, [176, 180, 196]); L.line(40, 15, 38, 22, [200, 204, 214]); L.line(54, 14, 57, 22, [200, 204, 214]); } });
    // 喙
    M.poly([[42, 33], [54, 33], [48, 45]], [78, 80, 96]);
    M.rect(43, 33, 10, 1, [112, 114, 130]);
    M.rect(45, 38, 6, 1, O); M.rect(46, 39, 4, 2, O); M.rect(47, 41, 2, 1, [255, 200, 110]);
    // 墨镜
    const s = [14, 14, 20], hi = [130, 150, 190];
    M.rect(34, 26, 12, 6, s); M.rect(50, 26, 12, 6, s); M.rect(46, 27, 4, 2, s); M.rect(32, 27, 2, 1, s); M.rect(62, 27, 2, 1, s);
    M.set(35, 27, hi); M.set(36, 27, hi); M.set(36, 28, hi); M.set(51, 27, hi); M.set(52, 27, hi); M.set(52, 28, hi);
    // 两条金链子
    const G = [240, 200, 70];
    for (const [r, d] of [[13, 6], [16, 12]]) {
      for (let x = 48 - r; x <= 48 + r; x++) {
        const dx = (x + 0.5 - 48) / r;
        const y = 48 + Math.round(d * Math.sqrt(Math.max(0, 1 - dx * dx)));
        M.set(x, y, x % 2 ? G : shade(G, 0.72));
      }
    }
    M.rect(46, 60, 4, 4, G); M.set(47, 61, [255, 244, 180]); M.set(49, 63, shade(G, 0.7));
    if (o.expr === 'smile') { M.set(44, 43, [50, 50, 60]); M.set(51, 43, [50, 50, 60]); }
    M.outline('auto');
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

  // 4. 近卫局督察的突击抽查：证件昨天刚过期
  function inspector() {
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '周慧敏', app: { hat: null, top: 'uniform', cloth: [40, 50, 72], glasses: false, style: 'bob', skin: 'light', hair: [72, 60, 70], eye: [72, 164, 104], scale: [84, 96, 120], eyeShape: 'sharp', acc: null } });
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


  // —— 熟面孔的专属造型 ——
  // 每个角色一套 app（发色、瞳色、服装）加 app.x 自定义图层（角、尾巴、发型、衣服细节），
  // 由 art.js 的 drawPerson 画进同一套明暗和描边里。
  SKIN.fur = [[246, 240, 232], [212, 198, 200]];
  const SKL = [252, 228, 210], BLK = [40, 40, 50], WHT = [238, 238, 242], GOLD = [232, 190, 84];
  const both = (L, pts, c) => { L.poly(pts, c); L.poly(mir(pts), c); };
  const eachBody = (L, fn) => { for (let y = 54; y < PH; y++) for (let x = 16; x < 80; x++) { const c = L.get(x, y); if (c) { const n = fn(x, y, c); if (n) L.set(x, y, n); } } };
  const base = (o) => Object.assign({ hat: null, glasses: false, acc: null, skin: 'light', badge: false }, o);
  // 一对向上的角：根部 → 尖端
  function horns(L, p0, p1, p2, r0, cf) {
    for (const s of [0, 1]) {
      const f = ([x, y]) => [s ? 96 - x : x, y];
      L.curve(f(p0), f(p1), f(p2), (t) => r0 * (1 - t) + 0.8, cf);
    }
  }
  function hornLight(L) {
    const src = L.c.slice();
    for (let y = L.y0 + 1; y <= L.y1; y++) for (let x = L.x0; x <= L.x1; x++) {
      const c = src[y * L.w + x];
      if (c && !src[(y - 1) * L.w + x]) L.set(x, y, mix(c, [255, 236, 210], 0.4));
    }
  }

  const LOOK = {
    // 陈：藏青色头发、两束低马尾，深色的龙角带橙红纹，白衬衫黄领带，黑外套右臂两道白杠
    chen: base({
      style: 'short', ahoge: false, hair: [60, 66, 124], eye: [196, 66, 62], top: 'custom', cloth: [42, 44, 56], scale: [52, 54, 88],
      x: {
        back: (L) => {
          for (const s of [-1, 1]) {
            L.curve([48 + s * 13, 42], [48 + s * 23, 48], [48 + s * 23.4, 70], (t) => 3.3 - 1.8 * t, () => [60, 66, 124]);
            L.poly([[48 + s * 22, 69], [48 + s * 23.6, 77], [48 + s * 25, 69]], [60, 66, 124]);
          }
        },
        top: (L) => horns(L, [40, 19.5], [38, 11], [32.5, 2.5], 2.9, (t) => (t > 0.3 && Math.floor(t * 10) % 3 === 0 ? [206, 98, 58] : [66, 50, 56])),
        topPost: hornLight,
        tail: (L) => {
          L.curve([72, 80], [97, 79], [89, 52], (t) => 2.6 - t, () => [52, 54, 88]);
          L.poly([[86.4, 54], [87, 45], [89, 49], [90.6, 41], [92, 48], [93.4, 46], [92, 55]], [200, 60, 52]);
        },
        fill: (L) => L.poly([[40.5, 56], [55.5, 56], [58, 80], [38, 80]], WHT),
        body: (L, P) => {
          const cd2 = dk(P.c, 2), ty = [238, 198, 74];
          L.line(40, 57, 37, 80, cd2); L.line(55, 57, 58, 80, cd2);
          L.line(41, 58, 39, 80, [206, 208, 218]); L.line(54, 58, 56, 80, [206, 208, 218]);
          L.rect(47, 58, 2, 2, dk(ty, 1)); L.poly([[46.6, 60], [49.4, 60], [50, 72], [48, 75], [46, 72]], ty); L.line(47, 61, 47, 70, lt(ty, 1));
          for (const y of [67, 68, 71, 72]) L.line(66 + (y - 64) * 0.08, y, 75, y + 1, y % 4 === 3 || y % 4 === 0 ? WHT : [206, 208, 218]);
          L.rect(31, 66, 4, 3, GOLD); L.set(32, 67, [255, 240, 180]);
        },
        collar: (L, P) => {
          L.poly([[43, 57.5], [44, 52], [48, 55], [52, 52], [53, 57.5], [48, 60]], WHT);
          both(L, [[35, 59.5], [39, 50], [43.4, 52.6], [42.6, 58.6]], P.c);
        },
      },
    }),
    // 星熊：墨绿长发，额头右侧一只象牙色的角，黑色无袖高领，左臂扎着黑臂带
    hoshiguma: base({
      style: 'long', humanEars: true, hair: [70, 150, 118], eye: [230, 190, 78], top: 'custom', cloth: [42, 44, 52],
      x: {
        top: (L) => {
          L.poly([[50, 24], [55.4, 24], [57.4, 6.4], [56, 5.4]], [238, 218, 194]);
          L.rect(50, 22, 6, 2, [168, 98, 82]);
        },
        topPost: (L) => { L.line(52, 21, 56, 8, [255, 244, 226]); L.line(55, 21, 57, 9, [206, 176, 156]); },
        fill: (L, P) => {
          L.poly(BODY, SKL);
          L.poly([[34.5, 59], [42, 56.2], [54, 56.2], [61.5, 59], [64.6, 68], [66, 80], [30, 80], [31.4, 68]], P.c);
        },
        body: (L, P) => {
          const cd2 = dk(P.c, 2), m = [176, 178, 190];
          L.line(48, 57, 48, 80, m); L.rect(48, 60, 1, 2, [240, 240, 246]);
          L.line(38, 60, 34, 72, cd2); L.line(57, 60, 61, 72, cd2);
          L.line(36, 74, 46, 76, cd2); L.line(50, 76, 60, 74, cd2);
          L.rect(21, 70, 8, 3, BLK);
          eachBody(L, (x, y, c) => (c === SKL && x > 66 ? dk(SKL, 1) : null));
        },
        collar: (L, P) => L.poly([[41.4, 57.6], [41.8, 50], [48, 51.4], [54.2, 50], [54.6, 57.6]], dk(P.c, 1)),
        collarPost: (L) => L.line(48, 52, 48, 57, [176, 178, 190]),
      },
    }),
    // 诗怀雅：金色卷发、两束螺旋双马尾，虎耳虎尾带条纹，黑外套橙色内衬，胸前交叉的橙色绑带
    swire: base({
      style: 'short', ahoge: false, hair: [244, 210, 132], eye: [100, 184, 108], top: 'custom', cloth: [46, 44, 52],
      x: {
        back: (L) => { for (const s of [-1, 1]) for (let i = 0; i < 6; i++) L.ell(48 + s * (21 + (i % 2) * 1.6), 37 + i * 7, 5.6 - i * 0.35, 4.4, [244, 210, 132]); },
        backPost: (L) => {
          const d = dk([244, 210, 132], 2), h = [255, 236, 176];
          for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
            const cx = Math.round(48 + s * (21 + (i % 2) * 1.6)), cy = 37 + i * 7;
            for (let k = -4; k <= 4; k++) if (L.get(cx + k, cy + 3 + Math.round(k * 0.3 * s))) L.set(cx + k, cy + 3 + Math.round(k * 0.3 * s), d);
            for (let k = -2; k <= 1; k++) if (L.get(cx + k, cy - 2)) L.set(cx + k, cy - 2, h);
          }
        },
        top: (L, fc) => {
          TOPF.feline(L, fc);
          const st = [132, 88, 52];
          for (const [x, y] of [[34, 9], [35, 9], [34, 13], [35, 13], [36, 13], [35, 17], [36, 17]]) { if (L.get(x, y)) L.set(x, y, st); if (L.get(95 - x, y)) L.set(95 - x, y, st); }
        },
        tail: (L, fc) => {
          const cf = (t) => (Math.floor(t * 15) % 3 === 0 ? [132, 88, 52] : fc);
          L.curve([72, 80], [97, 78], [89, 46], () => 2.5, cf); L.curve([89, 46], [86, 37], [93, 36], () => 2.3, () => [132, 88, 52], 20);
        },
        fill: (L) => {
          L.poly([[41, 56], [55, 56], [58, 80], [38, 80]], [34, 34, 40]);
          both(L, [[41, 56], [44.6, 57.4], [42.6, 80], [36.6, 80], [35.6, 63]], [234, 122, 54]);
        },
        body: (L) => {
          const o = [234, 122, 54];
          for (let i = 0; i < 2; i++) { L.line(43 + i, 62, 52 + i, 74, o); L.line(52 + i, 62, 43 + i, 74, o); }
          for (let y = 60; y < 80; y += 3) { L.set(38, y, [160, 70, 30]); L.set(57, y, [160, 70, 30]); }
          L.rect(47, 59, 2, 2, GOLD); L.rect(69, 68, 4, 3, o);
        },
        collar: (L, P) => both(L, [[34.6, 60], [38.4, 49.4], [43.4, 52.4], [42.6, 58.6]], P.c),
        collarPost: (L) => { L.line(40, 51, 43, 53, [234, 122, 54]); L.line(55, 51, 52, 53, [234, 122, 54]); },
        // 歪戴的黑色贝雷帽：压在左耳根上，耳尖从帽子后面露出来
        over: (M) => layer(M, (L) => { L.ellR(42.5, 15.4, 10.6, 4.8, -0.16, [46, 44, 54]); L.rect(46, 9, 2, 2, [46, 44, 54]); }, {
          post: (L) => { L.rect(38, 15, 3, 3, GOLD); L.set(38, 15, [255, 240, 180]); for (let x = 34; x < 52; x++) if (L.get(x, 19) && L.get(x, 20)) L.set(x, 19, [28, 28, 34]); },
        }),
      },
    }),
    // 魏彦吾：白色的兽面、眼周墨绿色的纹路，橙红色的鬃毛和鹿角一样分叉的龙角，红长衫外披着黑大衣
    wei: base({
      style: 'long', skin: 'fur', eyeShape: 'sharp', hair: [228, 98, 42], eye: [244, 196, 64], top: 'custom', cloth: [42, 42, 50],
      x: {
        face: (M) => {
          const g = [46, 86, 72], gd = [34, 62, 56];
          for (let y = 31; y <= 40; y++) for (let x = 33; x < 64; x++) {
            if (!inFace(x + 0.5, y + 0.5) || !M.get(x, y)) continue;
            if (y >= 34 && ((x >= 37 && x <= 43) || (x >= 52 && x <= 58))) continue;
            if (y === 40 && Math.abs(x - 47.5) < 4) continue;
            M.set(x, y, x > 58 ? gd : g);
          }
          M.rect(46, 42, 4, 2, [70, 46, 50]); M.set(46, 42, [120, 90, 92]); M.line(48, 44, 48, 46, [150, 120, 120]);
          const h = [228, 98, 42];
          for (const [x, y, w] of [[46, 50, 4], [46, 51, 4], [46, 52, 4], [47, 53, 3], [47, 54, 2], [47, 55, 2], [48, 56, 1]]) M.rect(x, y, w, 1, y > 52 ? dk(h, 1) : h);
        },
        top: (L) => {
          const o = [246, 152, 44];
          for (const s of [0, 1]) {
            const f = (x) => (s ? 96 - x : x);
            L.curve([f(41), 19.5], [f(37), 11], [f(29.5), 4], (t) => 2 - 1.1 * t, () => o);
            for (const [ax, ay, bx, by] of [[37.6, 12, 41, 5], [34, 8.4, 28, 10.6], [32.4, 6.4, 34.4, 0.6]]) { L.line(f(ax), ay, f(bx), by, o); L.line(f(ax) + 1, ay, f(bx) + 1, by, o); }
          }
          both(L, [[36.4, 30], [21.6, 23.6], [26, 32.6], [36.4, 41]], [176, 84, 52]);
          both(L, [[34, 32], [25, 27.4], [28, 32.6], [34, 37]], [240, 214, 196]);
          L.rect(68, 33, 2, 2, GOLD); L.rect(68, 35, 2, 5, [200, 50, 44]); L.set(68, 37, WHT);
        },
        topPost: hornLight,
        tail: (L) => {
          L.curve([70, 80], [98, 80], [90, 54], (t) => 3.2 - 1.6 * t, () => [66, 54, 60]);
          L.poly([[86, 56], [86.6, 46], [89, 50], [90.6, 42], [92.4, 49], [94, 47], [93, 57]], [236, 112, 42]);
        },
        fill: (L) => {
          L.poly([[40, 56], [56, 56], [59.4, 80], [36.6, 80]], [156, 44, 42]);
          both(L, [[40, 56], [43, 57.4], [40.6, 80], [35, 80], [35.4, 63]], [234, 224, 202]);
        },
        body: (L, P) => {
          const cd2 = dk(P.c, 2), o = [232, 150, 52];
          L.line(35, 63, 34, 80, cd2); L.line(60, 63, 61, 80, cd2);
          L.rect(46, 60, 4, 20, o);
          for (let y = 61; y < 80; y += 3) { L.rect(47, y, 2, 1, [150, 76, 30]); L.set(46, y + 1, [255, 214, 130]); }
          for (let k = -5; k <= 5; k++) { const y = 66 - Math.round(Math.abs(k) * 0.9); L.set(48 + k * 1.4, y, k % 2 ? [120, 40, 36] : [206, 150, 60]); }
          for (const s of [0, 1]) for (let x = 24; x <= 31; x++) L.set(s ? 95 - x : x, Math.round(64 - (x - 24) * 0.34), [84, 84, 98]);
        },
        collar: (L, P) => {
          L.poly([[42, 57.6], [42.4, 51.6], [47.4, 54], [48.6, 54], [53.6, 51.6], [54, 57.6]], [124, 34, 36]);
          both(L, [[34.6, 60], [38.4, 50], [42.6, 53], [42, 58.6]], P.c);
        },
        collarPost: (L) => { for (let x = 43; x <= 53; x++) for (let y = 50; y < 56; y++) if (L.get(x, y)) { L.set(x, y, [232, 150, 52]); break; } },
      },
    }),
    // 德克萨斯：黑色长发、内侧挑染暗红，橙色眼睛，白夹克黑肩，斜挎红色背带
    texas: base({
      style: 'long', hair: [48, 48, 66], eye: [226, 150, 66], top: 'custom', cloth: [234, 234, 240],
      x: {
        backPost: (L) => { for (let y = 46; y < PH; y++) for (let x = 24; x < 72; x++) if (L.get(x, y) && (x < 36 || x > 60) && (x + (y >> 2)) % 3 === 0) L.set(x, y, [164, 58, 56]); },
        fill: (L) => {
          eachBody(L, (x, y) => (y < 66.5 - Math.abs(x - 48) * 0.04 ? BLK : null));
          L.poly([[44.4, 56], [51.6, 56], [51, 80], [45, 80]], [34, 34, 42]);
        },
        body: (L) => {
          const r = [200, 54, 56];
          L.line(44, 57, 45, 80, [176, 178, 190]); L.line(52, 57, 51, 80, [176, 178, 190]);
          for (let i = 0; i < 3; i++) L.line(61 + i, 58, 36 + i, 80, i === 2 ? dk(r, 1) : r);
          L.rect(47, 68, 3, 3, [196, 198, 208]);
          L.rect(33, 69, 5, 3, [86, 146, 224]); L.set(34, 70, WHT); L.set(35, 70, WHT);
          for (const s of [0, 1]) for (let x = 21; x < 30; x++) L.set(s ? 95 - x : x, 75, [200, 202, 212]);
        },
        collar: (L) => L.poly([[38.5, 58], [40, 49.4], [44, 51.2], [48, 51.8], [52, 51.2], [56, 49.4], [57.5, 58]], BLK),
        collarPost: (L) => L.line(48, 52, 48, 57, [196, 198, 208]),
      },
    }),
    // 能天使：酒红色短发，细光环，背后是光做的翼片，白马甲黑袖子、红色滚边
    exusiai: base({
      style: 'short', hair: [160, 52, 64], eye: [228, 98, 72], top: 'custom', cloth: [236, 236, 242],
      x: {
        halo: (L) => L.fill(34, 2, 62, 12, (x, y) => {
          const o = ((x - 48) / 11.5) ** 2 + ((y - 7) / 3.2) ** 2, i = ((x - 48) / 9.8) ** 2 + ((y - 7) / 2) ** 2;
          return o <= 1 && i > 1;
        }, (x, y) => (y < 7 ? [255, 250, 214] : [250, 226, 150])),
        wing: (L) => {
          const a = [255, 251, 226], b = [252, 234, 164];
          for (const s of [-1, 1]) {
            const f = (pts) => pts.map(([x, y]) => [48 + s * (48 - x), y]);
            L.poly(f([[27, 52], [13, 41], [11.4, 43.6], [25, 56]]), a);
            L.poly(f([[25, 57.4], [9, 52], [8.2, 55], [24, 61.4]]), b);
            L.poly(f([[25, 62.6], [12, 62.4], [12, 65], [24, 66]]), a);
          }
        },
        fill: (L) => {
          eachBody(L, (x, y) => ((x < 30.5 - (y - 64) * 0.06 || x > 65.5 + (y - 64) * 0.06) && y > 61 ? BLK : null));
          L.poly([[45, 56], [51, 56], [48, 63]], [34, 34, 42]);
        },
        body: (L) => {
          const r = [216, 62, 72];
          L.line(31, 62, 29, 80, r); L.line(64, 62, 66, 80, r);
          L.line(48, 63, 48, 80, [176, 178, 190]);
          L.rect(35, 66, 7, 4, WHT); L.rect(35, 66, 7, 1, r); L.set(37, 68, BLK); L.set(39, 68, BLK);
          L.rect(53, 74, 8, 1, r); L.rect(35, 74, 8, 1, r);
          for (const y of [70, 73]) { L.line(21, y + 1, 26, y, WHT); L.line(69, y, 74, y + 1, [206, 208, 218]); }
        },
        collar: (L, P) => L.poly([[38.5, 58], [40, 49.4], [44, 51.2], [48, 54], [52, 51.2], [56, 49.4], [57.5, 58], [48, 63]], P.c),
        collarPost: (L) => { for (let x = 40; x <= 55; x++) for (let y = 48; y < 56; y++) if (L.get(x, y)) { L.set(x, y, [216, 62, 72]); break; } },
      },
    }),
    // 拉普兰德：银白长发，灰眼睛，苍白的皮肤，黑色高领大衣，刘海上别着两枚发卡
    lappland: base({
      style: 'long', skin: 'pale', hair: [226, 228, 236], eye: [150, 160, 180], top: 'coat', cloth: [42, 42, 50], accent: [214, 216, 226],
      x: {
        hair: (L) => { for (const y of [26, 29]) { L.rect(55, y, 4, 1, [36, 36, 44]); L.set(55, y, [120, 120, 132]); } },
        collar: (L, P) => L.poly([[40, 58.4], [40.6, 48.6], [48, 50.6], [55.4, 48.6], [56, 58.4]], dk(P.c, 1)),
        collarPost: (L) => { L.line(41, 49, 48, 51, [96, 96, 108]); L.line(48, 51, 55, 49, [96, 96, 108]); L.line(48, 52, 48, 58, [214, 216, 226]); },
      },
    }),
    // 阿米娅：棕色长发和长长的兔耳，蓝眼睛，深蓝外套蓝色内衬，脖子上系着蓝色领巾
    amiya: base({
      style: 'long', hair: [114, 78, 58], eye: [72, 150, 200], top: 'coat', cloth: [38, 42, 62], accent: [72, 142, 232],
      x: {
        top: (L, fc) => {
          L.ellR(39, 7, 3.6, 11.6, -0.2, fc); L.ellR(39.3, 8, 1.5, 8.6, -0.2, dk(fc, 2));
          L.ellR(58, 8, 3.6, 11, 0.42, fc); L.ellR(57.8, 9, 1.5, 8, 0.42, dk(fc, 2));
        },
        body: (L) => { L.line(44, 58, 42, 80, [72, 142, 232]); L.line(51, 58, 53, 80, [72, 142, 232]); },
        collarPost: (L) => {
          const b = [72, 142, 232];
          L.poly([[44, 54], [52, 54], [50.4, 59.4], [48, 57], [45.6, 59.4]], b); L.rect(47, 55, 2, 2, lt(b, 2));
        },
      },
    }),
    // 凯尔希：泛绿的银白短发，猞猁耳尖有黑色簇毛，露肩白大衣、绿色连衣裙、黑色颈带
    kaltsit: base({
      style: 'bob', hair: [224, 236, 230], eye: [108, 186, 126], top: 'custom', cloth: [232, 234, 228], badge: true,
      x: {
        top: (L, fc) => {
          TOPF.feline(L, fc);
          const k = [52, 52, 60];
          for (let y = 0; y < 9; y++) for (let x = 32; x < 38; x++) if (L.get(x, y) === fc) { L.set(x, y, k); L.set(95 - x, y, k); }
          for (const [x, y] of [[34, 3], [33, 2], [33, 1], [35, 3]]) { L.set(x, y, k); L.set(95 - x, y, k); }
        },
        fill: (L, P) => {
          L.poly(BODY, SKL);
          L.poly([[44, 56], [52, 56], [58.6, 62.6], [37.4, 62.6]], BLK);
          L.poly([[37.4, 62.6], [58.6, 62.6], [61, 80], [35, 80]], [158, 198, 100]);
          eachBody(L, (x, y) => ((x < 31.6 - (y - 66) * 0.1 || x > 64.4 + (y - 66) * 0.1) && y > 66.5 - Math.abs(x - 48) * 0.02 ? P.c : null));
        },
        body: (L) => {
          const g = dk([158, 198, 100], 2);
          L.line(48, 63, 48, 80, g); L.line(38, 63, 36, 80, g); L.line(58, 63, 60, 80, g);
          L.line(22, 68, 31, 67, [190, 194, 186]); L.line(65, 67, 74, 68, [190, 194, 186]);
          L.rect(42, 67, 1, 5, WHT); L.rect(40, 69, 5, 1, WHT);
        },
        collar: (L) => L.rect(44, 52, 8, 2, BLK),
        collarPost: (L) => L.set(48, 53, [150, 220, 170]),
      },
    }),
    // W：灰白短发挑染红色，黑红相间的短角，橙红色眼睛，黑围巾、灰上衣、黑外套红滚边
    w: base({
      style: 'messy', eyeShape: 'sharp', hair: [208, 208, 216], eye: [238, 116, 58], top: 'custom', cloth: [44, 44, 54],
      x: {
        // 睁着眼的坏笑：嘴角往一边翘
        face: (M, sk) => {
          const ln = [150, 70, 84];
          for (let x = 45; x <= 50; x++) M.set(x, 47, sk[0]);
          for (const [x, y] of [[45, 47], [46, 48], [47, 48], [48, 48], [49, 47], [50, 46], [51, 45]]) M.set(x, y, ln);
        },
        hair: (L) => {
          const r = [206, 56, 62];
          for (let y = 15; y < 36; y++) for (const x of [52, 53]) if (L.get(x, y)) L.set(x, y, y % 5 === 4 ? dk(r, 1) : r);
          for (let y = 30; y < 48; y++) for (const x of [62, 63]) if (L.get(x, y)) L.set(x, y, r);
          for (let y = 34; y < 46; y++) if (L.get(33, y)) L.set(33, y, r);
        },
        top: (L) => horns(L, [39.6, 19.5], [36, 11], [33.4, 4.5], 2.5, (t) => (t > 0.5 ? [200, 50, 56] : [56, 46, 60])),
        topPost: hornLight,
        fill: (L) => L.poly([[40, 56], [56, 56], [58.6, 80], [37.4, 80]], [142, 142, 152]),
        body: (L, P) => {
          const r = [206, 56, 62], cd2 = dk(P.c, 2);
          L.line(39, 58, 36, 80, cd2); L.line(56, 58, 59, 80, cd2);
          L.line(40, 60, 38, 80, r); L.line(55, 60, 57, 80, r);
          for (let i = 0; i < 2; i++) L.line(33 + i, 60, 31 + i, 80, i ? dk(r, 1) : r);
          L.rect(67, 68, 7, 3, r); L.set(69, 69, WHT); L.set(71, 69, WHT);
          L.line(44, 70, 52, 70, [120, 120, 130]); L.line(45, 76, 51, 76, [120, 120, 130]);
        },
        collar: (L) => { L.ell(48, 55, 12.6, 5.2, [50, 50, 60]); L.poly([[52, 57], [58, 57], [57.4, 68], [53, 67]], [50, 50, 60]); },
        collarPost: (L) => {
          const f = [84, 84, 96];
          L.line(39, 53, 45, 57, f); L.line(47, 52, 52, 57, f); L.line(54, 53, 58, 56, f); L.line(54, 60, 56, 66, f);
        },
      },
    }),
    // 霜星：雪白的短发和兔耳，灰色眼睛，白大衣、橙色滚边，头发上别着黑色发卡
    frostnova: base({
      style: 'bob', skin: 'pale', hair: [240, 242, 248], eye: [146, 156, 172], top: 'coat', cloth: [228, 230, 238], accent: [234, 132, 62],
      x: {
        hair: (L) => { L.rect(36, 27, 5, 1, [40, 40, 48]); L.rect(37, 29, 4, 1, [40, 40, 48]); L.set(36, 27, [130, 130, 142]); },
        face: (M) => { M.set(41, 41, [214, 170, 186]); M.set(42, 42, [214, 170, 186]); M.set(40, 40, [214, 170, 186]); },
      },
    }),
    // 弑君者：红褐色短发，黑兜帽，下半张脸罩着黑色面罩
    crownslayer: base({
      hat: 'hood', hatColor: [38, 38, 46], style: 'short', hair: [138, 58, 54], eye: [220, 150, 84], top: 'hoodie', cloth: [42, 42, 50], accent: [170, 60, 56],
      x: {
        face: (M) => {
          const k = [36, 36, 44];
          for (let y = 41; y < 54; y++) for (let x = 33; x < 64; x++) {
            if (!inFace(x + 0.5, y + 0.5)) continue;
            M.set(x, y, y === 41 ? [84, 84, 98] : x > 55 ? [28, 28, 34] : k);
          }
          M.line(42, 44, 48, 46, [64, 64, 76]); M.line(48, 46, 53, 44, [64, 64, 76]);
          for (const [x, y] of [[43, 47], [43, 49], [52, 47], [52, 49]]) M.set(x, y, [110, 110, 124]);
        },
      },
    }),
    // 古米：奶油色的蓬松头发扎成两个团子，巧克力发卡，橙红色眼睛，水手服外面套着灰外套
    gummy: base({
      style: 'short', ahoge: false, hair: [248, 224, 166], eye: [234, 118, 74], top: 'custom', cloth: [50, 54, 88],
      x: {
        back: (L) => {
          for (const s of [-1, 1]) {
            L.ell(48 + s * 20.5, 28, 7.6, 7.4, [248, 224, 166]);
            for (const [dx, dy] of [[5, -5], [8, 0], [6, 6], [0, 8]]) L.ell(48 + s * (20.5 + dx), 28 + dy, 2.6, 2.6, [248, 224, 166]);
          }
        },
        hair: (L) => {
          const c = [124, 72, 46];
          L.rect(36, 25, 4, 2, c); L.set(36, 25, [176, 116, 80]); L.rect(55, 23, 4, 2, c); L.set(55, 23, [176, 116, 80]);
          L.rect(33, 28, 2, 2, [226, 98, 60]); L.rect(61, 28, 2, 2, [226, 98, 60]);
        },
        fill: (L) => eachBody(L, (x, y) => (x < 34 - (y - 60) * 0.12 || x > 62 + (y - 60) * 0.12 ? [122, 110, 110] : null)),
        body: (L) => {
          const o = [234, 122, 54];
          L.line(34, 61, 31, 80, dk([122, 110, 110], 2)); L.line(61, 61, 64, 80, dk([122, 110, 110], 2));
          L.rect(24, 70, 5, 2, o); L.rect(67, 70, 5, 2, dk(o, 1));
          L.line(27, 64, 26, 80, o);
          L.rect(47, 72, 2, 2, GOLD); L.rect(47, 77, 2, 2, GOLD);
        },
        collar: (L) => {
          both(L, [[36, 60.4], [41.6, 51.6], [47.6, 60.6], [44, 67]], WHT);
          L.poly([[46, 60], [50, 60], [49.4, 69], [48, 71], [46.6, 69]], WHT);
        },
        collarPost: (L) => {
          const n = [50, 54, 88];
          L.line(38, 61, 44, 65, n); L.line(57, 61, 51, 65, n); L.rect(47, 60, 2, 2, [206, 208, 218]);
        },
      },
    }),
  };

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
  // 星熊的大盾「般若」：黑色的厚钢板，斜切的上沿，盾面嵌着齿轮，窗口里挤不进来
  function oniShield(M) {
    const F = face(), x0 = Math.round(F.cx + F.rx) + 5, y0 = Math.round(F.cy) - 12;
    const w = Math.max(14, Math.min(26, PW - 1 - x0)), h = PH - y0;
    const st = [70, 72, 84], sd = [46, 48, 58], hi = [132, 136, 152], rim = [100, 104, 118];
    part(M, (L) => {
      L.poly([[x0, y0 + 11], [x0 + w, y0], [x0 + w, PH], [x0, PH]], st);
      L.poly([[x0 + w - 5, y0 + 3], [x0 + w, y0], [x0 + w, PH], [x0 + w - 5, PH]], sd);
      L.line(x0, y0 + 11, x0 + w - 1, y0, hi); L.line(x0, y0 + 12, x0, PH, hi);
      L.line(x0 + 2, y0 + 14, x0 + w - 6, y0 + 6, sd);
    });
    // 齿轮
    const gx = x0 + Math.floor(w / 2) - 2, gy = y0 + 30;
    for (let a = 0; a < 8; a++) { const c = Math.cos(a * Math.PI / 4), s = Math.sin(a * Math.PI / 4); M.rect(Math.round(gx + c * 8.4 - 1), Math.round(gy + s * 8.4 - 1), 2, 2, rim); }
    M.fill(gx - 9, gy - 9, gx + 9, gy + 9, (x, y) => { const d = Math.hypot(x - gx, y - gy); return d <= 7.6 && d > 5.2; }, (x, y) => (y < gy - 2 ? hi : rim));
    M.ell(gx, gy, 2.6, 2.6, sd); M.set(gx - 1, gy - 1, hi);
    for (const [dx, dy] of [[3, 16], [3, h - 6], [w - 8, 12], [w - 8, h - 6]]) { M.set(x0 + dx, y0 + dy, hi); M.set(x0 + dx + 1, y0 + dy + 1, [30, 30, 38]); }
    for (let y = y0 + 48; y < PH; y += 4) M.rect(x0 + 4, y, w - 12, 1, sd);
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
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '陈晖洁', app: LOOK.chen });
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
    const t = makeTraveler({ nation: 'lungmen', race: 'oni', name: '星熊', app: LOOK.hoshiguma });
    t.items = [];
    t.voice = 110;
    looks(t, oniShield);
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
    const t = makeTraveler({ nation: 'lungmen', race: 'feline', name: '诗怀雅', app: LOOK.swire });
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
    const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '魏彦吾', app: LOOK.wei });
    setRace(t, 'lung');
    t.items = [];
    t.voice = 95;
    t.intro = ['（一位衣着考究的中年人。不远处，站着两个穿黑衣的人。）', '不必紧张。我只是路过，看看年轻人怎么干活。'];
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
    const t = makeTraveler({ nation: 'siracusa', race: 'lupo', name: '德克萨斯', app: LOOK.texas });
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
    const t = makeTraveler({ nation: 'laterano', race: 'sankta', name: '能天使', app: LOOK.exusiai });
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
    const t = makeTraveler({ nation: 'siracusa', race: 'lupo', name: '拉普兰德', app: LOOK.lappland });
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
    const t = makeTraveler({ nation: 'kazdel', race: 'cautus', name: '阿米娅', app: LOOK.amiya });
    t.items = [];
    makeRhodes(t);
    t.docs.rhodes.code = '阿米娅';
    t.voice = 230;
    t.intro = ['博士！……啊，上班时间要叫审查员先生。', '凯尔希医生让我来给您送饭。这是罗德岛发给我的干员证，他们说拿着它就能过关。'];
    t.answers = { infected: ['……您知道的。', '但罗德岛的干员证，可以证明我没有问题。'] };
    t.react = {
      approve: '谢谢博士！晚上见，记得早点下班。',
      deny: '……我明白了。规定就是规定，对吧。饭我放窗台上了。',
      detain: '（她手上的戒指闪过一道微光，又暗了下去。）……请不要这样。',
    };
    return t;
  }

  function kaltsit() {
    const t = makeTraveler({ nation: 'victoria', race: 'feline', name: '凯尔希', app: LOOK.kaltsit });
    t.items = [];
    t.docs.rhodes = { code: '凯尔希', name: t.name, expiry: today() + ri(300, 900) };
    t.voice = 130;
    t.scanFn = scanMon3tr;
    t.intro = [
      met('amiya') ? '阿米娅已经来过了？……好。' : '是我。别摆出那副表情，公事公办。',
      '关于矿石病在下城区的扩散，我需要尽快和龙门的负责人谈一谈。',
      '（她开始解释源石结晶在血液里的沉积机制。三分钟过去了，你身后的队伍开始打哈欠。）',
      '……你在听吗？',
    ];
    t.react = {
      approve: '谢谢。另外，今晚早点回家，你的黑眼圈很重。',
      deny: '这个决定并不明智。不过，我尊重规则。',
      detain: '……Mon3tr，不必。我们走。',
    };
    return t;
  }

  function wBomb() {
    const t = makeTraveler({ nation: 'kazdel', race: 'sarkaz', name: 'W', app: LOOK.w });
    t.items = ['egg_bomb'];
    t.detain = true;
    t.flaws = ['smuggle'];
    t.voice = 210;
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
    const t = makeTraveler({ nation: 'ursus', race: 'cautus', name: '叶莲娜', app: LOOK.frostnova });
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
    const t = makeTraveler({ nation: 'lungmen', race: 'lupo', app: LOOK.crownslayer });
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
    const t = makeTraveler({ nation: 'ursus', race: 'ursus', name: '古米', app: LOOK.gummy });
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
    { k: 'rhodes_all', need: ['amiya', 'kaltsit'], text: '成就：罗德岛的老朋友' },
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
      drawPerson((typeof titleApp === 'function' ? titleApp : sampleApp)(race), { expr: TITLE_EXPR[race] }).draw(cv, i * 96, 0);
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
        drawPerson((typeof titleApp === 'function' ? titleApp : sampleApp)(race), { expr: i === 2 ? 'smile' : 'neutral' }).draw(cv, i * 96, 0);
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

  // 源石虫：黑色多面岩壳，壳上长着源石尖刺，壳底透出橙黄色的光
  function slugCanvas() {
    const cv = document.createElement('canvas');
    cv.width = 22; cv.height = 13;
    const M = new Pix(22, 13);
    const k = [74, 74, 90], kd = [44, 44, 56], kl = [122, 124, 144], kh = [178, 180, 198];
    // 尖刺
    M.poly([[13, 5], [18, 0], [16, 6]], kd); M.set(17, 1, kl);
    M.poly([[5, 7], [0, 5], [4, 9]], kd); M.set(1, 6, kl);
    M.poly([[17, 8], [22, 7], [18, 10.4]], kd); M.set(20, 8, kl);
    M.poly([[7, 5], [6, 1], [9.4, 4]], kd);
    // 壳
    M.poly([[3, 11], [4, 7], [7, 4], [12, 3], [16, 5], [19, 8], [19, 11]], k);
    M.poly([[7, 4], [12, 3], [10, 7]], kl); M.poly([[4, 7], [7, 4], [10, 7], [6, 10]], kd);
    M.poly([[12, 3], [16, 5], [14, 8], [10, 7]], k); M.poly([[10, 7], [14, 8], [12, 11], [6, 10]], [92, 94, 112]);
    M.poly([[16, 5], [19, 8], [19, 11], [14, 8]], kd);
    M.set(8, 5, kh); M.set(9, 4, kh); M.set(11, 4, kh);
    M.line(10, 7, 14, 8, kd); M.line(10, 7, 6, 10, [24, 24, 30]);
    // 壳底的光
    M.rect(5, 11, 13, 1, [255, 196, 56]); M.rect(6, 12, 10, 1, [236, 120, 30]);
    M.set(4, 11, [236, 120, 30]); M.set(18, 11, [236, 120, 30]); M.set(8, 10, [255, 214, 110]); M.set(13, 10, [255, 170, 50]);
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
      if (race === 'lung') return Object.assign(base('vouivre'), LOOK.chen);
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
      look({ race: 'vouivre', hair: [60, 66, 124], cloth: [42, 44, 56], pants: [34, 36, 48], long: true, guard: true, scale: [52, 54, 88], tall: 1 }),
      look({ race: 'oni', hair: [70, 150, 118], cloth: [42, 44, 52], pants: [34, 36, 44], long: true, tall: 2, shield: true }),
    ] },
    { k: 'walk_penguin', from: 1, v: 26, figs: [
      look({ race: 'lupo', hair: [48, 48, 66], cloth: [234, 234, 240], pants: [36, 36, 46], long: true, bag: 'case', bagColor: [200, 160, 90] }),
      look({ race: 'sankta', hair: [160, 52, 64], cloth: [236, 236, 242], pants: [36, 36, 46], tall: 0, bag: 'pack', bagColor: [52, 56, 70] }),
    ] },
    { k: 'walk_rhodes', from: 4, v: 18, figs: [
      look({ race: 'cautus', hair: [114, 78, 58], cloth: [38, 42, 62], pants: [40, 44, 60], tall: 0, long: true }),
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
        ctx.fillStyle = 'rgb(70,72,84)'; ctx.fillRect(sx, head + 4, 4, 13);
        ctx.fillStyle = 'rgb(132,136,152)'; ctx.fillRect(sx + 1, head + 8, 2, 2);
        // 星熊的角
        ctx.fillStyle = 'rgb(238,218,194)'; ctx.fillRect(x + (w.dir < 0 ? -1 : 0), head - 3, 1, 3);
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

  // ———————————————— 结算：捡来的旧终端 ————————————————
  // 下班路上的三条消息：阿米娅（女儿）、凯尔希（老婆）、普瑞赛斯（前任？）。
  // 只是彩蛋，不影响存款和剧情。

  const PHONE = [
    {
      k: 'amiya', name: '阿米娅', rel: '女儿',
      msg: [
        '博士，您还有许多事情需要处理。现在还不能休息哦。',
        '博士……今天的事，谢谢您替我保密。桌上的理智顶液只能喝一瓶哦。',
        '博士，我在练小提琴。隔壁的干员问是不是有源石虫在叫……真的有那么难听吗？',
        '博士，今天检查站的队都排到街角了。您一定很累吧？我给您留了一块苹果派。',
        '不管明天发生什么，我都会和您一起走下去的。晚安，博士。',
      ],
      seen: '博士，今天在窗口看到您工作的样子了。很帅，就是黑眼圈有点重。',
      lost: '（消息未送达：隔离区没有信号。）',
      replies: [
        ['马上回家', '嗯！饭在锅里热着呢。'],
        ['摸摸头', '博、博士！……下次请当面摸。'],
      ],
    },
    {
      k: 'kaltsit', name: '凯尔希', rel: '老婆',
      msg: [
        '你的作息、饮食和工资，我都会过问。这不是关心，是医嘱。（后面还有 2847 字，已折叠）',
        '阿米娅问我你是不是又熬夜了。我说：是。不必解释，Mon3tr 都看见了。',
        '今天没有出错。别得意，这只是你本来就该做到的。',
        '家长会我替你去了。老师问阿米娅的父亲为什么总戴着兜帽，我说：他见不得光。',
        '明天小心行事。无论你选哪条路，记得回来。这条不用回复。',
      ],
      fined: '听说你今天又判断失误了。失忆不是借口。罚款从你的零花钱里扣。',
      seen: '今天在窗口，你倒是公事公办。很好。黑眼圈的账回家再算。',
      lost: '诊所这边一切都好。按时吃饭，照顾好阿米娅。不必来找我。',
      replies: [
        ['工资上交', '嗯。零花钱明天给你。'],
        ['收到', '（对方已读。）'],
      ],
    },
    {
      k: 'priestess', name: '普瑞赛斯', rel: '前任？',
      msg: [
        '找到你了。你换了终端，换了名字，连脸都藏起来了。没关系，我认得出来。',
        '那个医生还是把你管得那么严吗？以前，你的日程可都是我排的。',
        '我看见那孩子了。她的眼睛很像……算了。你把她照顾得很好。',
        '你答应过我的事，还记得吗？忘了也没关系。我替你记了一万年。',
        '去睡吧。无论文明存续还是毁灭，我都在终点等你。',
      ],
      replies: [
        ['拉黑', '（拉黑失败：该联系人不在任何通讯录里。）'],
        ['你是谁？', '（消息已送达。对方正在输入……一直在输入。）'],
      ],
    },
  ];

  function phoneFace(k) {
    const cv = document.createElement('canvas');
    cv.width = 28; cv.height = 28;
    const app = LOOK[k] || base({ style: 'long', skin: 'pale', hair: [34, 34, 46], eye: [150, 200, 220], top: 'coat', cloth: [228, 230, 236] });
    const ctx = cv.getContext('2d');
    ctx.fillStyle = k === 'kaltsit' ? '#3d5a4a' : '#3a4a66';
    ctx.fillRect(0, 0, 28, 28);
    drawPerson(app, { noShades: true }).draw(cv, -34, k === 'amiya' ? -20 : -26);
    if (k === 'priestess') {            // 信号不好：只剩一个轮廓
      ctx.fillStyle = 'rgba(8, 14, 22, 0.82)'; ctx.fillRect(0, 0, 28, 28);
      ctx.fillStyle = '#7fd6d0';
      for (const [x, y, w] of [[0, 6, 9], [17, 11, 11], [3, 19, 14], [20, 24, 8]]) ctx.fillRect(x, y, w, 1);
    }
    return cv;
  }

  function summaryPhone(d) {
    const sc = document.querySelector('#summary');
    if (!sc || !S || sc.querySelector('.egg-phone')) return;
    const day = Math.min(Math.max(S.day, 1), 5) - 1;
    const metToday = (k) => S.flags['egg_' + k + '_day'] === S.day;
    const textOf = (c) => {
      if (c.lost && (c.k === 'amiya' ? S.fam.sisterLost : S.fam.momLost)) return c.lost;
      if (c.seen && metToday(c.k)) return c.seen;
      if (c.fined && d && (d.fines > 0 || d.total - d.correct >= 3)) return c.fined;
      return c.msg[day];
    };
    const read = new Set();
    const ph = document.createElement('div');
    ph.className = 'egg-phone';
    ph.innerHTML = '<div class="ph-top"><b>PRTS</b><span class="ph-n"></span></div><div class="ph-body"></div>';
    const body = ph.querySelector('.ph-body'), count = ph.querySelector('.ph-n');
    const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
    const upd = () => { const n = PHONE.length - read.size; count.textContent = n ? `未读 ${n}` : '已读'; ph.classList.toggle('new', n > 0); };

    function list() {
      body.textContent = '';
      for (const c of PHONE) {
        const row = el('div', 'ph-row' + (read.has(c.k) ? '' : ' unread'));
        row.appendChild(phoneFace(c.k));
        const who = el('div', 'ph-who');
        who.appendChild(el('b', '', c.name)); who.appendChild(el('small', '', c.rel));
        row.appendChild(who); row.appendChild(el('i', 'ph-dot'));
        row.addEventListener('pointerdown', () => { SFX.click(); chat(c); });
        body.appendChild(row);
      }
      body.appendChild(el('p', 'ph-note', '下班路上，终端响了三声。'));
    }

    function chat(c) {
      const first = !read.has(c.k);
      read.add(c.k); upd();
      body.textContent = '';
      const back = el('div', 'ph-back');
      back.appendChild(el('span', '', '← ')); back.appendChild(el('b', '', c.name)); back.appendChild(el('small', '', c.rel));
      back.addEventListener('pointerdown', () => { SFX.click(); list(); });
      body.appendChild(back);
      const text = textOf(c), sys = text.startsWith('（');
      body.appendChild(el('div', sys ? 'ph-sys' : 'ph-msg', text));
      if (c.k === 'priestess') body.appendChild(el('div', 'ph-time', '发送时间：■■■■ 年前'));
      const ops = el('div', 'ph-ops');
      for (const [q, a] of sys ? [] : c.replies) {
        const b = el('button', 'ph-op', q);
        b.type = 'button';
        b.addEventListener('click', () => {
          SFX.paper();
          ops.remove();
          body.appendChild(el('div', 'ph-msg me', q));
          setTimeout(() => { if (body.contains(back)) { body.appendChild(el('div', a.startsWith('（') ? 'ph-sys' : 'ph-msg', a)); body.scrollTop = body.scrollHeight; } }, 500);
        });
        ops.appendChild(b);
      }
      body.appendChild(ops);
      if (first && read.size === PHONE.length) setTimeout(() => toast('三条消息全部已读。理智 -3。'), 300);
    }

    upd(); list();
    sc.classList.add('with-phone');
    sc.appendChild(ph);
  }

  const ENDING_X = {
    citizen: () => (decOf('chen') === 'approve' ? '嘉奖令的末尾，有一个签得很用力的名字：陈晖洁。' : ''),
    rhodes: () => (met('amiya') ? '阿米娅把那张干员证举得高高的：“博士，这下我们都是罗德岛的人了！”' : ''),
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
    if (LOOK[k]) Object.assign(t.app, LOOK[k]);
    if (k === 'chen') looks(t, chenSword);
    if (k === 'hoshiguma') {
      looks(t, oniShield);
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
    else if (name === 'summary') { summaryEggs(); summaryMore(); summaryPhone(arg); }
    else if (name === 'ending') endingEggs(arg);
  };
})();
