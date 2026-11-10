'use strict';
// 旅客生成与判定：外观、证件、罪状、剧情角色，以及检查模式下的字段对比。

const rnd = Math.random;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function wpick(obj) {
  const ks = Object.keys(obj);
  let s = 0;
  for (const k of ks) s += obj[k];
  let r = rnd() * s;
  for (const k of ks) { r -= obj[k]; if (r < 0) return k; }
  return ks[ks.length - 1];
}
const pad = (n) => String(n).padStart(2, '0');
const DAY0 = Date.UTC(2097, 5, 1) / 864e5;
const today = () => DAY0 + S.day - 1;
function fmtDate(n) {
  const d = new Date(n * 864e5);
  return `${d.getUTCFullYear() - 1000}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

// —— 外观 ——
const colorDist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

function genApp(race) {
  const a = {
    race, skin: pick(Object.keys(SKIN)), hair: pick(HAIRS), style: pick(HAIR_STYLES), eye: pick(EYES), cloth: pick(CLOTHES), top: pick(TOPS),
    hat: null, hatColor: pick(CLOTHES), glasses: rnd() < 0.15, tie: pick([[150, 40, 40], [40, 60, 120], [40, 40, 44]]),
    scale: null, acc: null, badge: false,
  };
  if (race === 'sarkaz' && rnd() < 0.5) a.skin = 'pale';
  if (race === 'vouivre') a.scale = pick([[92, 128, 96], [140, 96, 70], [96, 110, 140], [150, 140, 110]]);
  if (rnd() < 0.18) a.hat = pick(['cap', 'beanie', 'hood']);
  return a;
}

// 证件照换成另一个人：发色明显不同、发型不同
function altApp(a) {
  const b = { ...a, hat: null };
  const hairs = HAIRS.filter((h) => colorDist(h, a.hair) > 140);
  b.hair = pick(hairs.length ? hairs : HAIRS.filter((h) => h !== a.hair));
  b.style = pick(HAIR_STYLES.filter((s) => s !== a.style));
  if (rnd() < 0.5) b.skin = pick(Object.keys(SKIN).filter((s) => s !== a.skin));
  b.glasses = !a.glasses;
  b.eye = pick(EYES);
  return b;
}

// —— 姓名、证件号 ——
function genName(nation) {
  const N = NATIONS[nation];
  return N.cn ? pick(N.last) + pick(N.first) : pick(N.first) + '·' + pick(N.last);
}
function genIdno(nation) { return `${NATIONS[nation].code}-${ri(1000, 9999)}-${ri(100, 999)}`; }

function alterName(n) {
  const chars = [...n];
  const idx = chars.map((c, i) => (NAME_SWAP[c] ? i : -1)).filter((i) => i >= 0);
  if (idx.length) {
    const i = pick(idx);
    chars[i] = NAME_SWAP[chars[i]];
  } else {
    const cand = chars.map((c, i) => (c !== '·' ? i : -1)).filter((i) => i >= 0);
    const i = pick(cand);
    chars[i] = pick(['某', '之', '亚', '尔', '文', '安'].filter((c) => c !== chars[i]));
  }
  const out = chars.join('');
  return out !== n ? out : chars.slice(0, -1).join('') + (chars[chars.length - 1] === '安' ? '文' : '安');
}

function alterIdno(s) {
  const pos = [...s].map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  const i = pick(pos), c = [...s];
  let d;
  do d = String(ri(0, 9)); while (d === c[i]);
  c[i] = d;
  return c.join('');
}

// —— 旅客 ——
function nationW(day) {
  const w = { ...NATION_W };
  if (day >= 5) delete w.ursus;
  return w;
}

function makeTraveler(o = {}) {
  const day = S.day;
  const nation = o.nation || wpick(nationW(day));
  const race = o.race || wpick(NATIONS[nation].races);
  const app = Object.assign(genApp(race), o.app || {});
  app.race = race;
  const name = o.name || genName(nation), idno = genIdno(nation);
  const t = {
    nation, race, app, photo: app, photoDiff: false, name, infected: false, crystals: [], items: [], flaws: [], detain: false,
    docs: {}, hatOff: false, expr: 'neutral', voice: 120 + ri(0, 120),
  };
  t.docs.id = { name, race, idno, nation, city: pick(NATIONS[nation].cities), expiry: today() + ri(3, 1500) };
  if (nation !== 'lungmen') t.docs.permit = { name, idno, nation, purpose: pick(PURPOSES), expiry: today() + ri(0, 45) };
  if (day >= 2 && nation !== 'lungmen') {
    t.docs.health = { name, date: today() - ri(0, 6), fusion: 0, density: +(0.05 + rnd() * 0.2).toFixed(2), status: '非感染者' };
  }
  if (day >= 3 && race === 'sarkaz') t.docs.guar = { name, company: pick(COMPANIES), expiry: today() + ri(1, 90) };
  if (rnd() < 0.4) t.items.push(pick(['coins', 'phone', 'keys']));
  return t;
}

function crystalSpots() {
  const s = CRYSTAL_SPOTS.slice().sort(() => rnd() - 0.5);
  return s.slice(0, ri(2, 3));
}

// honest：报告如实写感染者；incons：结论写非感染者但融合率>0；lie：报告完全干净
function infect(t, mode) {
  t.infected = true;
  t.crystals = crystalSpots();
  const h = t.docs.health;
  if (!h) return;
  if (mode === 'honest') {
    h.fusion = ri(2, 12); h.density = +(0.3 + rnd() * 0.6).toFixed(2); h.status = '感染者';
  } else if (mode === 'incons') {
    h.fusion = ri(1, 6); h.density = +(0.25 + rnd() * 0.4).toFixed(2); h.status = '非感染者';
  }
}

function makeRhodes(t) {
  infect(t, 'honest');
  t.docs.rhodes = { code: pick(CODES), name: t.name, expiry: today() + ri(20, 400) };
  t.app.badge = true;
  t.rhodesOp = true;
}

function rhodesOK(t) {
  const r = t.docs.rhodes;
  return S.day >= 4 && !!r && r.name === t.docs.id.name && r.expiry >= today();
}

function applyFlaw(t, f) {
  const d = t.docs, T = today();
  switch (f) {
    case 'id_expired': d.id.expiry = T - ri(1, 300); break;
    case 'race': d.id.race = pick(CONFUSE[t.race]); break;
    case 'photo': t.photo = altApp(t.app); t.photoDiff = true; break;
    case 'permit_missing': if (!d.permit) return false; delete d.permit; break;
    case 'permit_expired': if (!d.permit) return false; d.permit.expiry = T - ri(1, 20); break;
    case 'permit_name': if (!d.permit) return false; d.permit.name = alterName(t.name); break;
    case 'permit_idno': if (!d.permit) return false; d.permit.idno = alterIdno(d.id.idno); break;
    case 'permit_nation':
      if (!d.permit) return false;
      d.permit.nation = pick(Object.keys(NATIONS).filter((n) => n !== t.nation && n !== 'lungmen'));
      break;
    case 'health_missing': if (!d.health) return false; delete d.health; break;
    case 'infected': if (!d.health) return false; infect(t, 'honest'); break;
    case 'health_incons': if (!d.health) return false; infect(t, 'incons'); break;
    case 'health_name': if (!d.health) return false; d.health.name = alterName(t.name); break;
    case 'health_lie': if (!d.health) return false; infect(t, 'lie'); break;
    case 'sarkaz_noguar': if (!d.guar) return false; delete d.guar; break;
    case 'guar_expired': if (!d.guar) return false; d.guar.expiry = T - ri(1, 30); break;
    case 'guar_name': if (!d.guar) return false; d.guar.name = alterName(t.name); break;
    case 'smuggle': t.items = ['contraband']; t.detain = true; break;
    case 'reunion': t.items = t.items.filter((x) => x !== 'contraband'); t.items.push('reunion'); t.detain = true; break;
    case 'rhodes_name': if (!d.rhodes) return false; d.rhodes.name = alterName(t.name); break;
    case 'rhodes_expired': if (!d.rhodes) return false; d.rhodes.expiry = T - ri(1, 60); break;
    case 'ursus': if (t.nation !== 'ursus' || S.day < 5) return false; break;
    default: return false;
  }
  t.flaws.push(f);
  return true;
}

// [起始天, 权重]
const FLAWS = {
  id_expired: [1, 1], race: [1, 3], photo: [1, 2], permit_missing: [1, 1.4], permit_expired: [1, 1.4], permit_name: [1, 1],
  permit_idno: [1, 0.8], permit_nation: [1, 0.8], health_missing: [2, 1], infected: [2, 2.2], health_incons: [2, 1],
  health_name: [2, 0.8], health_lie: [3, 1.5], sarkaz_noguar: [3, 1.2], guar_expired: [3, 0.7], guar_name: [3, 0.7],
  smuggle: [3, 1.5], reunion: [4, 1.6], rhodes_name: [4, 0.8], rhodes_expired: [4, 0.6], ursus: [5, 2],
};
const FLAW_P = { 1: 0.45, 2: 0.5, 3: 0.55, 4: 0.55, 5: 0.6 };
const SARKAZ_FLAWS = ['sarkaz_noguar', 'guar_expired', 'guar_name'];
const RHODES_FLAWS = ['rhodes_name', 'rhodes_expired'];
const FOREIGN_FLAWS = ['permit_missing', 'permit_expired', 'permit_name', 'permit_idno', 'permit_nation', 'health_missing',
  'infected', 'health_incons', 'health_name', 'health_lie', ...RHODES_FLAWS];
const NO_RHODES = ['infected', 'health_incons', 'health_lie', 'health_missing', 'health_name'];

function pickFlaw(day) {
  const w = {};
  for (const [k, [from, wt]] of Object.entries(FLAWS)) if (from <= day) w[k] = wt;
  return wpick(w);
}

function foreignNation(day) {
  const w = nationW(day);
  delete w.lungmen;
  return wpick(w);
}

function randomTraveler() {
  const day = S.day;
  // 第 1 天上午（星熊来之前）：只有龙门本地人，只会出种族不符这一种问题
  const early = day === 1 && !(D && D.stage);
  const flaw = rnd() < (FLAW_P[day] || 0.55) ? (early ? 'race' : pickFlaw(day)) : null;
  const o = early ? { nation: 'lungmen' } : {};
  if (flaw === 'ursus') o.nation = 'ursus';
  if (SARKAZ_FLAWS.includes(flaw)) { o.race = 'sarkaz'; o.nation = rnd() < 0.65 ? 'kazdel' : 'victoria'; }
  if (FOREIGN_FLAWS.includes(flaw)) o.nation = foreignNation(day);
  const t = makeTraveler(o);
  if (day >= 4 && t.nation !== 'lungmen' && !NO_RHODES.includes(flaw) && (RHODES_FLAWS.includes(flaw) || rnd() < 0.15)) makeRhodes(t);
  if (flaw) applyFlaw(t, flaw);
  return t;
}

// —— 剧情角色 ——
// 第 1 天的两位近卫局来客。没加载 eggs.js 时用普通立绘和一位普通警员顶替。
const dress = (k, t) => { if (typeof EGGS !== 'undefined' && EGGS.dress) EGGS.dress(k, t); return t; };
function tutorChen() {
  const t = makeTraveler({ nation: 'lungmen', race: 'vouivre', name: '陈晖洁', app: { hat: null, style: 'long', hair: [46, 60, 104], eye: [206, 60, 70], top: 'uniform', cloth: [36, 46, 84], scale: [58, 70, 112], glasses: false, acc: null } });
  t.docs.id.race = 'feline';      // 测试证件：种族故意写错
  t.flaws.push('race');
  t.items = [];
  t.voice = 150;
  t.ok = ['deny', 'approve'];     // 教学：盖哪个章都不记违规
  t.intro = ['近卫局特别督察，陈。今天起你归我管。', '规矩只有一条：证件上写的种族，要和本人对得上。', '这是张测试证件。点【检查】，再点证件上的“种族”和我本人。'];
  t.answers = { race: ['没错，种族是我故意写错的。', '发现对不上，就盖【拒绝】。'] };
  t.react = {
    deny: '很好，就这么查。戴帽子的，让他摘了再看。星熊晚点过来。',
    approve: '……证件上写的是菲林，我头上长的是角。下一位看仔细点。星熊晚点过来。',
  };
  return dress('chen', t);
}
function visitHoshiguma() {
  const egg = typeof EGGS !== 'undefined' && EGGS.dress;
  const t = egg
    ? makeTraveler({ nation: 'lungmen', race: 'oni', name: '星熊', app: { hat: null, style: 'long', hair: [56, 96, 74], eye: [234, 172, 52], top: 'suit', cloth: [52, 56, 70], tie: [150, 40, 40], glasses: false, acc: null } })
    : makeTraveler({ nation: 'lungmen', race: 'perro', app: { hat: null, top: 'uniform', cloth: [36, 46, 84], glasses: false } });
  t.items = [];
  t.voice = 110;
  t.ok = ['approve', 'deny'];
  t.intro = egg
    ? ['（一面巨大的盾牌先挤进了窗口，然后卡住了。）', '……抱歉。星熊，近卫局。陈让我来看看新人。', '顺便捎张通知：从现在起，证件要多查几样。先把我的章盖了吧。']
    : ['近卫局的。陈督察让我来看看新人。', '顺便捎张通知：从现在起，证件要多查几样。先把我的章盖了吧。'];
  t.answers = { race: ['鬼。从东边来的，在龙门住了很多年了。', '图鉴里没有？回头让陈补上。'] };
  t.react = { approve: '谢了。通知放你桌上了，改天请你喝酒。', deny: '（她笑了笑。）够谨慎。通知放你桌上了。' };
  t.onDecide = () => { if (D) D.stagePending = true; };
  return dress('hoshiguma', t);
}

const SPECIALS = {
  1: {
    0: tutorChen,
    1: () => {
      const t = makeTraveler({ nation: 'lungmen', race: 'feline', name: '林国栋', app: { hair: [196, 198, 208], style: 'short', top: 'jacket', hat: null, glasses: true } });
      t.items = [];
      t.voice = 100;
      t.intro = ['后生仔，第一日返工啊？', '叫我林伯就得。慢慢来，我唔赶时间。'];
      t.react = { approve: '多谢晒。好好干啊。', deny: '吓？我系龙门人嚟㗎！' };
      return t;
    },
    2: () => {
      const t = makeTraveler({ nation: 'lungmen', race: 'sarkaz', app: { hat: null, acc: 'catband' } });
      t.docs.id.race = 'feline';
      t.flaws.push('race');
      t.intro = ['喵。', '我是菲林。喵。'];
      t.answers = { race: ['这、这是我的猫耳朵！', '角？什么角？喵？'] };
      t.react = { deny: '……可恶，被看穿了喵。', approve: '嘿嘿，龙门人真好骗。喵。' };
      return t;
    },
    3: visitHoshiguma,
    5: () => {
      const t = makeTraveler({ nation: 'columbia', race: 'vulpo', app: { top: 'suit', hat: null } });
      t.docs.permit.expiry = today() - 1;
      t.flaws.push('permit_expired');
      t.intro = ['做生意的，赶时间。', '快点盖章吧，时间就是龙门币。'];
      t.answers = { expired: ['就过期一天！通融一下嘛。', '下次来给你带特产，好不好？'] };
      t.react = { deny: '就过期一天！龙门人真不讲人情。', approve: '爽快！下次给你带特产。' };
      return t;
    },
  },
  2: {
    1: () => {
      const t = makeTraveler({ nation: 'kazimierz', race: 'cautus', app: { hat: null, style: 'long', top: 'coat' } });
      infect(t, 'honest');
      t.flaws.push('infected');
      t.expr = 'sad';
      t.intro = ['我女儿在龙门读书。', '她来信说病了……我只想去看看她。'];
      t.answers = { infected: ['我知道我是感染者。', '我只想看她一眼，看完就走。'] };
      t.react = { deny: '……我明白了。请别告诉她我来过。', approve: '谢谢你……谢谢你。' };
      return t;
    },
    3: () => {
      const t = makeTraveler({ nation: 'victoria', race: 'perro' });
      infect(t, 'incons');
      t.flaws.push('health_incons');
      t.intro = ['体检的医生说我没事。', '你看，结论写着非感染者。'];
      t.react = { deny: '只是一点点融合率而已……', approve: '谢啦！' };
      return t;
    },
  },
  3: {
    0: () => {
      const t = makeTraveler({ nation: 'kazdel', race: 'sarkaz', app: { hat: null, top: 'jacket' } });
      t.intro = ['我只是来扛货的。', '别盯着我的角看。'];
      t.react = { approve: '……谢了。你是第一个没多问的人。', deny: '哼，萨卡兹走到哪都一样。' };
      return t;
    },
    2: () => {
      const t = makeTraveler({ nation: 'lungmen', race: 'perro', app: { top: 'jacket', hat: null } });
      t.items = ['contraband'];
      t.detain = true;
      t.flaws.push('smuggle');
      t.bribe = 30;
      t.intro = ['我是龙门人，回家而已。', '（他往证件底下塞了 30 龙门币）', '拿去买点好吃的，大家方便。'];
      t.answers = { smuggle: ['这是……土特产！', '嘘——小声点。钱你也收了嘛。'] };
      t.react = { approve: '够意思！', detain: '你收了钱还抓我？！', deny: '啧，不识好歹。' };
      return t;
    },
    4: () => {
      const t = makeTraveler({ nation: 'laterano', race: 'sankta', app: { hat: null } });
      t.items = [];
      t.intro = ['日安！主保佑你。', '听说龙门有很好吃的苹果派？'];
      t.react = { approve: '感谢！这个送你，是我自己烤的苹果派！', deny: '哎呀……主会原谅你的。' };
      t.onDecide = (dec) => { if (dec === 'approve') S.flags.pie = S.day; };
      return t;
    },
  },
  4: {
    0: () => {
      const t = makeTraveler({ nation: 'victoria', race: 'feline', app: { hat: null } });
      makeRhodes(t);
      t.intro = ['罗德岛的医生在等我们。', '这是我的干员证。'];
      t.react = { approve: '谢谢。罗德岛会记住你的。', deny: '……我们会找别的路。' };
      t.onDecide = (dec) => { if (dec === 'approve') S.flags.rhodes = true; };
      return t;
    },
    2: () => {
      const t = makeTraveler({ nation: 'leithanien', race: 'liberi', app: { hat: null, top: 'coat' } });
      t.items = [];
      t.note = true;
      t.intro = ['我只是过境。', '哦，对了——有人托我把这个交给你。', '（她把一张折好的纸条推了过来）'];
      t.react = { approve: '他们说，你会做出正确的选择。', deny: '没关系。纸条你已经收到了。' };
      t.onDecide = () => { S.flags.note = true; };
      return t;
    },
    4: () => {
      const t = makeTraveler({ nation: 'ursus', race: 'ursus', app: { hat: null } });
      t.items = ['reunion'];
      t.detain = true;
      t.flaws.push('reunion');
      t.expr = 'angry';
      t.intro = ['……', '让开。'];
      t.react = { detain: '感染者的怒火，你挡不住！', approve: '……', deny: '哼。龙门的墙，挡不了多久。' };
      return t;
    },
  },
  5: {
    1: () => {
      const t = makeTraveler({ nation: 'ursus', race: 'lupo', name: '鲍里斯·沃尔科夫', app: { acc: 'scarf', hat: null } });
      t.photo = altApp(t.app);
      t.photo.acc = null;
      t.photoDiff = true;
      t.items = ['reunion'];
      t.detain = true;
      t.flaws = ['ursus', 'photo', 'reunion'];
      const lost = S.fam.sisterLost;
      t.intro = ['（他把白色围巾往下拉了拉）', '……你收到纸条了吧。', lost ? '放我过去。隔离区的墙，我们替你翻。' : '放我过去。小雅的抑制剂，我们包了。'];
      t.answers = { reunion: ['你知道我是谁。', lost ? '想想你妹妹现在在哪。' : '想想你妹妹。'] };
      t.react = { approve: '整合运动不会忘记你。', deny: '你会后悔的。', detain: '……你选错边了，审查员。' };
      t.onDecide = (dec) => {
        if (dec === 'approve') { S.flags.reunion = true; if (!S.fam.sisterLost) S.gift = (S.gift || 0) + 3; }
        if (dec === 'detain') S.flags.caught = true;
      };
      return t;
    },
    3: () => {
      const t = makeTraveler({ nation: 'kazimierz', race: 'cautus', app: { badge: true, top: 'coat', cloth: [42, 46, 54], hat: null } });
      t.items = [];
      t.docs.rhodes = { code: pick(CODES), name: t.name, expiry: today() + ri(60, 400) };
      t.intro = ['罗德岛医疗部。', '我们在龙门开了临时诊所，收治感染者。', '如果你认识需要帮助的人，可以带他们来。'];
      t.react = { approve: '谢谢。诊所在下城区，门口挂着罗德岛的标志。', deny: '……好吧。我们会想别的办法。' };
      t.onDecide = (dec) => { if (dec === 'approve') S.flags.rhodesDoc = true; };
      return t;
    },
  },
};

// 剧情角色的出场顺序不变，但位置在原序号后浮动 0–2 位；
// 快下班还没轮到的，会插到队伍最前面，保证当天一定出场。
const SPECIAL_SEC = 40;          // 给每位还没出场的剧情角色预留的秒数
function planSpecials(day) {
  const sp = SPECIALS[day] || {};
  let prev = -1;
  return Object.keys(sp).map(Number).sort((a, b) => a - b).map((i) => {
    const at = Math.max(prev + 1, day === 1 && i === 0 ? 0 : i + ri(0, 2));
    prev = at;
    return { at, make: sp[i] };
  });
}
function specialDue(n) {
  const q = D && D.specials;
  if (!q || !q.length) return false;
  const left = (DAY_END - DAY_START) / MIN_PER_SEC - D.t;
  return n >= q[0].at || left < q.length * SPECIAL_SEC;
}
function nextTraveler(n) {
  return specialDue(n) ? D.specials.shift().make() : randomTraveler();
}

// —— 判定 ——
function expected(t) {
  if (t.expect) return t.expect;
  if (!t.flaws.length) return 'approve';
  return t.detain ? 'detain' : 'deny';
}

function okSet(t) {
  if (t.ok) return t.ok;
  return { approve: ['approve'], deny: ['deny'], detain: ['detain', 'deny'] }[expected(t)];
}

function citeReason(t, dec) {
  if (okSet(t).includes(dec)) return '';
  const why = t.flaws.slice(0, 2).map((f) => REASON[f]).filter(Boolean).join('、');
  const exp = expected(t);
  if (dec === 'approve') return '放行了不合规的旅客：' + why;
  if (exp === 'approve') return dec === 'detain' ? '无故拘留了证件齐全的旅客' : '拒绝了证件齐全的旅客';
  return '不应拘留：' + why + '，应拒绝入境';
}

const ASK = {
  expired: '你的证件过期了。',
  race: '你证件上的种族，和你本人对不上。',
  photo: '证件上的照片不像你。',
  name: '几份证件上的名字不一样。',
  idno: '证件号对不上。',
  nation: '你的国籍对不上。',
  permit_missing: '你的入境许可呢？',
  health_missing: '你的体检报告呢？',
  infected: '你是感染者。',
  health_incons: '报告上写着非感染者，可融合率不是 0。',
  health_lie: '探测仪显示你身上有源石结晶。',
  sarkaz_noguar: '萨卡兹旅客需要担保函。',
  smuggle: '包里的源石是怎么回事？',
  reunion: '这个面具是怎么回事？',
  ursus: '乌萨斯籍旅客今天起禁止入境。',
};

const KIND_LABEL = { name: '姓名', idno: '证件号', nation: '国籍' };

function fieldVal(t, f) {
  const [d, k] = f.split('.');
  return t.docs[d] ? t.docs[d][k] : undefined;
}

// 两个字段对比：null 没矛盾；{hint}；{kind, text}
function analyze(a, b, t, hatOn) {
  if (!a || !b || a === b || !t) return null;
  const has = (x) => a === x || b === x;
  const other = (x) => (a === x ? b : a);
  const docOf = (f) => f.split('.')[0];
  const keyOf = (f) => f.split('.')[1];
  const isDoc = (f) => f.includes('.') && !!DOCNAME[docOf(f)];
  const d = t.docs;
  const HAT_HINT = { hint: '旅客戴着帽子，看不清种族特征。可以请旅客摘帽。' };

  // 同类字段跨证件
  if (isDoc(a) && isDoc(b) && docOf(a) !== docOf(b) && keyOf(a) === keyOf(b) && KIND_LABEL[keyOf(a)]) {
    const va = fieldVal(t, a), vb = fieldVal(t, b);
    if (va === undefined || vb === undefined || va === vb) return null;
    return { kind: keyOf(a), text: `${DOCNAME[docOf(a)]}和${DOCNAME[docOf(b)]}上的${KIND_LABEL[keyOf(a)]}不一致。` };
  }

  // 日期 + 有效期
  if (has('date')) {
    const f = other('date');
    if (isDoc(f) && keyOf(f) === 'expiry') {
      const v = fieldVal(t, f);
      if (v !== undefined && v < today()) return { kind: 'expired', text: `${DOCNAME[docOf(f)]}已经过期了。` };
    }
    return null;
  }

  // 旅客本人
  if (has('face')) {
    const f = other('face');
    if (f === 'id.race') {
      if (hatOn) return HAT_HINT;
      if (t.race !== d.id.race) return { kind: 'race', text: `证件写着${RACES[d.id.race].name}，可旅客本人的特征不是。` };
      return null;
    }
    if (f === 'id.photo') {
      if (t.photoDiff) return { kind: 'photo', text: '证件照片和旅客本人不是同一个人。' };
      return null;
    }
    if (f === 'rule.sarkaz') {
      if (S.day < 3 || t.race !== 'sarkaz' || d.guar) return null;
      if (hatOn) return HAT_HINT;
      return { kind: 'sarkaz_noguar', text: '旅客是萨卡兹，但没有出示担保函。' };
    }
    return null;
  }

  // 证件照 + 种族
  if (has('id.photo') && has('id.race')) {
    if (t.photo.race !== d.id.race) return { kind: 'race', text: `证件写着${RACES[d.id.race].name}，可照片上的人不是。` };
    return null;
  }

  // 规则
  const r = a.startsWith('rule.') ? a : b.startsWith('rule.') ? b : null;
  if (r) {
    const f = other(r);
    switch (r) {
      case 'rule.permit':
        if (docOf(f) === 'id' && d.id.nation !== 'lungmen' && !d.permit) return { kind: 'permit_missing', text: '非龙门籍旅客，却没有入境许可。' };
        return null;
      case 'rule.health':
        if (S.day >= 2 && docOf(f) === 'id' && d.id.nation !== 'lungmen' && !d.health) return { kind: 'health_missing', text: '非龙门籍旅客，却没有体检报告。' };
        return null;
      case 'rule.sarkaz':
        if (S.day >= 3 && docOf(f) === 'id' && d.id.race === 'sarkaz' && !d.guar) return { kind: 'sarkaz_noguar', text: '萨卡兹旅客没有出示担保函。' };
        return null;
      case 'rule.infected':
        if (S.day < 2 || rhodesOK(t)) return null;
        if (f === 'health.status' && d.health && d.health.status === '感染者') return { kind: 'infected', text: '体检报告显示旅客是感染者。' };
        if (f === 'scan.crystal' && t.crystals.length) return { kind: 'infected', text: '探测仪显示旅客身上有源石结晶，是感染者。' };
        return null;
      case 'rule.smuggle':
        if (f === 'scan.contraband' && t.items.includes('contraband')) return { kind: 'smuggle', text: '旅客携带了未申报的源石。' };
        return null;
      case 'rule.reunion':
        if (f === 'scan.reunion' && t.items.includes('reunion')) return { kind: 'reunion', text: '旅客身上藏着整合运动的面具。' };
        return null;
      case 'rule.ursus':
        if (S.day >= 5 && (f === 'id.nation' || f === 'permit.nation') && fieldVal(t, f) === 'ursus') return { kind: 'ursus', text: '旅客是乌萨斯籍，今天起禁止入境。' };
        return null;
      default:
        return null;
    }
  }

  // 体检报告自相矛盾 / 隐瞒感染
  if (has('health.status') && d.health) {
    const f = other('health.status');
    if (f === 'health.fusion' && d.health.status === '非感染者' && d.health.fusion > 0) {
      return { kind: 'health_incons', text: `融合率是 ${d.health.fusion}%，结论却写着非感染者。` };
    }
    if (f === 'scan.crystal' && d.health.status === '非感染者' && t.crystals.length) {
      return { kind: 'health_lie', text: '报告写着非感染者，探测仪却找到了源石结晶。' };
    }
  }
  return null;
}
