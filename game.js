'use strict';
// 界面、流程、主循环：标题、报纸、检查亭、结算、结局。

const LAST_DAY = 5;
const SAVE_KEY = 'lungmen-please-save-v1';
const MIN_PER_SEC = 2;           // 现实 1 秒 = 游戏 2 分钟
const DAY_START = 480, DAY_END = 1080;

let S = null;                    // 存档
let D = null;                    // 当天检查亭状态
let cur = null;                  // 窗口前的旅客
let scene = 'title';
let SCALE = 1;
const stage = document.getElementById('stage');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (s) => esc(s).replace(/\n/g, '<br>');

// 扩展钩子：scene.js（室外场景）、docs.js（证件）、eggs.js（彩蛋）
function hook(name, ...args) {
  try { return window.EGGS && typeof EGGS[name] === 'function' ? EGGS[name](...args) : undefined; } catch (e) { console.error(e); return undefined; }
}

// ———————————————————— 存档 ————————————————————

function newSave() {
  return {
    day: 1, money: 10, cites: 0, served: 0, gift: 0, flags: {},
    fam: { hungry: 0, momSick: false, momSickDays: 0, momLost: false, sisterInfected: false, sisterMiss: 0, sisterLost: false },
  };
}
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 存不了就算了 */ } syncMeta(); }

// 跨周目档案：解锁过的结局、成就、见过的熟面孔。结局清存档时不会动它。
const META_KEY = 'lungmen-please-meta-v1';
function loadMeta() {
  const m = { endings: {}, achv: {}, met: {}, runs: 0 };
  try { Object.assign(m, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) { /* ignore */ }
  return m;
}
function syncMeta(ending) {
  if (!S) return loadMeta();
  const m = loadMeta();
  for (const k in S.flags) if (k.startsWith('achv_') && S.flags[k]) m.achv[k.slice(5)] = true;
  for (const k of (window.EGGS && EGGS.TRAVELERS) || []) if (S.flags['egg_' + k] === true) m.met[k] = true;
  if (ending) { m.endings[ending] = true; m.runs = (m.runs || 0) + 1; }
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
  return m;
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ———————————————————— 缩放 ————————————————————

function fit() {
  const w = window.innerWidth, h = window.innerHeight;
  SCALE = Math.min(w / 640, h / 360);
  stage.style.transformOrigin = '0 0';
  stage.style.transform = `translate(${(w - 640 * SCALE) / 2}px, ${(h - 360 * SCALE) / 2}px) scale(${SCALE})`;
}

// ———————————————————— 小工具 ————————————————————

const ruleText = (r) => (S.day >= 4 && r.text4 ? r.text4 : r.text);
// 第 1 天分两段：上午只查种族，星熊来过之后（D.stage = 1）才启用带 late 标记的规则
const ruleActive = (r) => r.from < S.day || (r.from === S.day && !(r.late && S.day === 1 && !(D && D.stage)));

function paint(cv, pix, ox = 0, oy = 0, bg = null) {
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); }
  pix.draw(cv, ox, oy);
}

const SAMPLE_HAIR = {
  feline: [40, 36, 42], cautus: [236, 234, 228], perro: [134, 80, 46], lupo: [122, 120, 126], vulpo: [208, 122, 62], ursus: [96, 62, 40],
  zalak: [134, 80, 46], sarkaz: [40, 36, 42], vouivre: [62, 72, 112], sankta: [222, 190, 112], liberi: [62, 72, 112],
};
function sampleApp(race) {
  return {
    race, skin: race === 'sarkaz' ? 'pale' : 'light', hair: SAMPLE_HAIR[race], style: race === 'sankta' ? 'bob' : 'short', eye: EYES[1],
    cloth: [70, 80, 102], top: 'coat', hat: null, hatColor: [70, 80, 102], glasses: false, tie: [150, 40, 40], scale: [92, 128, 96], acc: null, badge: false,
  };
}

// 室外场景用的固定伪随机
function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ———————————————————— 标题 ————————————————————

function showTitle() {
  scene = 'title'; D = null; cur = null;
  const sv = load();
  const canCont = sv && sv.day >= 1 && sv.day <= LAST_DAY;
  stage.innerHTML = `<div class="scene" id="title"><div class="panel">
    <h1>龙门，请出示证件</h1>
    <div class="en">LUNGMEN, PLEASE</div>
    <canvas id="tArt" width="480" height="80"></canvas>
    <p class="sub">龙门近卫局 · 边境检查站 · 审查员招聘中</p>
    <div class="btns">
      <button class="btn" id="tNew" type="button">新游戏</button>
      ${canCont ? `<button class="btn" id="tCont" type="button">继续（第 ${sv.day} 天）</button>` : ''}
      <button class="btn alt" id="tArc" type="button">档案</button>
    </div>
  </div></div>`;
  const cv = $('#tArt');
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ['vulpo', 'sarkaz', 'feline', 'sankta', 'ursus'].forEach((r, i) => drawPerson(sampleApp(r), { expr: i === 2 ? 'smile' : 'neutral' }).draw(cv, i * 96, 0));
  hook('scene', 'title');
  $('#tNew').onclick = () => { SFX.init(); SFX.click(); S = newSave(); save(); showNews(); };
  $('#tArc').onclick = () => { SFX.init(); SFX.paper(); showArchive(); };
  if (canCont) $('#tCont').onclick = () => { SFX.init(); SFX.click(); S = Object.assign(newSave(), sv); showNews(); };
}

// ———————————————————— 档案 ————————————————————

const ENDING_ORDER = ['citizen', 'caught', 'rhodes', 'reunion', 'reunion_lost', 'lost', 'evicted'];

function showArchive() {
  scene = 'archive'; D = null; cur = null;
  const m = loadMeta();
  const item = (on, text) => `<div class="arc-item${on ? '' : ' lock'}">${on ? esc(text) : '？？？'}</div>`;
  const achv = (window.EGGS && EGGS.ACHV) || [];
  const faces = (window.EGGS && EGGS.TRAVELERS) || [];
  const met = faces.filter((k) => m.met[k]);
  const got = ENDING_ORDER.filter((k) => m.endings[k]).length;
  stage.innerHTML = `<div class="scene" id="archive"><div class="panel">
    <h2>审查员档案</h2>
    <div class="arc-cols">
      <div class="arc-col"><h3>结局 ${got}/${ENDING_ORDER.length}</h3>${ENDING_ORDER.map((k) => item(m.endings[k], ENDINGS[k][0])).join('')}</div>
      <div class="arc-col"><h3>成就 ${achv.filter((a) => m.achv[a.k]).length}/${achv.length}</h3>${achv.map((a) => item(m.achv[a.k], a.text)).join('')}
        <h3 class="arc-gap">熟面孔 ${met.length}/${faces.length}</h3><div class="arc-met">${met.length ? esc(met.map((k) => EGGS.nameOf(k)).join('、')) : '还没有人来过。'}</div></div>
    </div>
    <div class="arc-runs">已通关 ${m.runs || 0} 次</div>
    <button class="btn" id="aBack" type="button">返回</button>
  </div></div>`;
  $('#aBack').onclick = () => { SFX.click(); showTitle(); };
}

// ———————————————————— 报纸 ————————————————————

function showNews() {
  scene = 'news'; D = null; cur = null;
  const n = NEWS[S.day];
  const rules = RULES.filter((r) => (r.from === S.day && ruleActive(r)) || (S.day === 4 && r.key === 'rule.infected'));
  stage.innerHTML = `<div class="scene" id="news"><div class="panel paper">
    <div class="mast">龙门日报 <small>LUNGMEN DAILY</small></div>
    <div class="dateline">${fmtDate(today())} · 第 ${S.day} 天 · 定价 2 龙门币</div>
    <h2>${esc(n.h1)}</h2>
    <div class="sub">${esc(n.sub)}</div>
    <div class="h2">${esc(n.h2)}</div>
    <div class="newrules"><b>今日起执行</b><ul>${rules.map((r) => `<li>${esc(ruleText(r))}</li>`).join('')}</ul></div>
    <button class="btn" id="nGo" type="button">上班</button>
  </div></div>`;
  SFX.paper();
  $('#nGo').onclick = () => { SFX.click(); showBooth(); };
  hook('scene', 'news');
}

// ———————————————————— 检查亭 ————————————————————

const RACE_KEYS = Object.keys(RACES);

function newLook(rand = Math.random) {
  if (window.SCENE && SCENE.newLook) return SCENE.newLook(rand);
  return { c: CLOTHES[Math.floor(rand() * CLOTHES.length)], h: HAIRS[Math.floor(rand() * HAIRS.length)], r: RACE_KEYS[Math.floor(rand() * RACE_KEYS.length)] };
}

function showBooth() {
  scene = 'booth'; cur = null;
  D = {
    t: S.fam.hungry > 0 ? LATE_SEC : 0, minute: -1, n: 0, paused: true, stage: 0, over: false, ended: false,
    insp: false, scan: false, sel: [], lastIssue: null, drag: null, z: 20,
    correct: 0, total: 0, detainBonus: 0, findBonus: 0, bribe: 0, fines: 0, cites: 0,
    queue: Array.from({ length: ri(10, 14) }, () => newLook()),
    book: { tab: 'rules', race: 'feline', el: null, shown: true },
    timers: [], specials: planSpecials(S.day),
  };
  stage.innerHTML = `<div class="scene" id="booth">
    <canvas id="out" width="320" height="36"></canvas>
    <div id="hud"><span id="hDay">第 ${S.day} 天</span><span class="f" data-f="date" id="hDate">${fmtDate(today())}</span><span id="hClock">08:00</span><span id="hMoney"></span></div>
    <div id="left">
      <div id="win"><div id="pwrap" data-f="face"><canvas id="pc" width="96" height="80"></canvas><div id="hot"></div></div><div id="winEmpty">窗口空着</div></div>
      <div id="log"></div>
      <div id="acts">
        <button id="bCall" type="button" title="快捷键：空格">叫号</button>
        <button id="bHat" type="button" title="快捷键：H">请摘帽</button>
        <button id="bDetain" type="button" title="快捷键：3">拘留</button>
      </div>
    </div>
    <div id="desk">
      <div id="docs"></div>
      <div id="banner"></div>
      <div id="tools">
        <button id="bInsp" type="button" title="快捷键：E">检查</button>
        <button id="bScan" type="button" title="快捷键：R">源石探测</button>
        <button id="bBook" type="button" title="快捷键：F">手册</button>
      </div>
      <div id="stamps">
        <button id="bApprove" type="button" title="快捷键：1">批准</button>
        <button id="bDeny" type="button" title="快捷键：2">拒绝</button>
      </div>
      <div id="tip"></div>
    </div>
  </div>`;
  $('#win').style.overflow = 'hidden';
  const hot = $('#hot');
  Object.assign(hot.style, { position: 'absolute', left: '0', top: '0', width: '192px', height: '160px' });

  $('#bCall').onclick = callNext;
  $('#bHat').onclick = removeHat;
  $('#bDetain').onclick = () => decide('detain');
  $('#bApprove').onclick = () => decide('approve');
  $('#bDeny').onclick = () => decide('deny');
  $('#bInsp').onclick = () => { SFX.click(); setInspect(!D.insp); };
  $('#bScan').onclick = () => setScan(!D.scan);
  $('#bBook').onclick = () => { SFX.paper(); toggleBook(); };

  makeBook();
  renderPortrait();
  drawOutside();
  updateHud();
  updateButtons();
  banner(null);
  showTip();
  hook('scene', 'booth');
}

function showTip(hd, body, onOk) {
  const tip = $('#tip');
  tip.style.display = 'block';
  tip.innerHTML = `<div class="tiphd">${esc(hd || `第 ${S.day} 天 · 值班须知`)}</div><div class="tipbody">${br(body || TIPS[S.day] || '')}</div><button type="button" id="tipOk">知道了</button>`;
  D.paused = true;
  $('#tipOk').onclick = () => {
    SFX.click();
    tip.style.display = 'none';
    D.paused = false;
    updateButtons();
    if (onOk) onOk();
    else say('n', D.t > 0 ? '（昨晚没吃上饭，你起晚了。赶到检查站时，队伍已经排得很长。）' : '（检查站开门了。外面排起了长队。）');
  };
  updateButtons();
}

// 第 1 天下半场：星熊捎来的通知生效，手册多出几条规则
function nextStage() {
  if (!D || D.stage) return;
  D.stage = 1;
  renderBook();
  if (!D.book.shown) toggleBook();
  SFX.paper();
  showTip('近卫局通知 · 即刻执行', TIP_STAGE, () => say('n', '（手册里多了几条规则。）'));
}

// —— HUD / 按钮 ——

const FIND_BONUS = 2;             // 先查实矛盾、再正确拒绝/拘留的奖金
const LATE_SEC = 45;              // 饿着肚子上班：迟到 45 秒（游戏里一个半小时）
const dayIncome = (d) => d.correct * 5 + d.detainBonus + (d.findBonus || 0) + d.bribe - d.fines;
function todayIncome() { return D ? dayIncome(D) : 0; }

function updateHud() {
  if (!D) return;
  const m = DAY_START + Math.floor(D.t * MIN_PER_SEC);
  const mm = Math.min(m, 23 * 60 + 59);
  $('#hClock').textContent = `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`;
  const inc = todayIncome();
  $('#hMoney').textContent = `龙门币 ${S.money}（今日 ${inc >= 0 ? '+' : ''}${inc}）`;
}

function show(el, on) { el.style.display = on ? '' : 'none'; }

function updateButtons() {
  if (!D || scene !== 'booth') return;
  const here = cur && cur.phase === 'here' && !cur.decided;
  $('#bCall').disabled = !!cur || D.over || D.paused || D.ended;
  show($('#bHat'), !!(cur && cur.phase === 'here' && cur.app.hat && !cur.hatOff && !cur.decided));
  show($('#bDetain'), S.day >= 3);
  $('#bDetain').disabled = !here;
  show($('#bScan'), S.day >= 3);
  $('#bApprove').disabled = !here;
  $('#bDeny').disabled = !here;
  $('#bInsp').classList.toggle('on', D.insp);
  $('#bScan').classList.toggle('on', D.scan);
  $('#bBook').classList.toggle('on', D.book.shown);
  show($('#winEmpty'), !cur);
}

// —— 室外：天际线、城墙、排队的人 ——

function drawOutside() {
  const cv = $('#out');
  if (!cv) return;
  if (window.SCENE && SCENE.draw) { try { SCENE.draw(cv, D ? D.queue : [], performance.now() / 1000, D); return; } catch (e) { console.error(e); } }
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  for (let y = 0; y < H; y++) {
    const k = y / H;
    ctx.fillStyle = rgb([Math.round(38 + 70 * k), Math.round(32 + 34 * k), Math.round(52 + 8 * k)]);
    ctx.fillRect(0, y, W, 1);
  }
  const rand = lcg(97);
  // 远处的龙门
  for (let x = 0; x < W;) {
    const w = 6 + Math.floor(rand() * 14), h = 8 + Math.floor(rand() * 20);
    ctx.fillStyle = rand() < 0.5 ? '#231e2a' : '#2a2430';
    ctx.fillRect(x, 28 - h, w, h);
    ctx.fillStyle = '#e8b84a';
    for (let i = 0; i < 4; i++) if (rand() < 0.6) ctx.fillRect(x + 1 + Math.floor(rand() * (w - 2)), 28 - h + 2 + Math.floor(rand() * (h - 4)), 1, 1);
    x += w + Math.floor(rand() * 3);
  }
  // 城墙
  ctx.fillStyle = '#4a423c'; ctx.fillRect(0, 26, W, 10);
  ctx.fillStyle = '#6a6058'; ctx.fillRect(0, 26, W, 1);
  for (let x = 2; x < W; x += 12) { ctx.fillStyle = '#3e3732'; ctx.fillRect(x, 29, 6, 1); }
  // 检查亭
  ctx.fillStyle = '#2b2421'; ctx.fillRect(0, 12, 54, 24);
  ctx.fillStyle = '#e8b84a'; ctx.fillRect(0, 12, 54, 2);
  for (let x = 0; x < 54; x += 6) { ctx.fillStyle = '#1b1714'; ctx.fillRect(x, 12, 3, 2); }
  ctx.fillStyle = '#5a7f8a'; ctx.fillRect(6, 17, 20, 8);
  ctx.fillStyle = '#b33a2e'; ctx.fillRect(40, 16, 2, 20);
  // 排队
  const n = Math.min(D ? D.queue.length : 0, 26);
  for (let i = 0; i < n; i++) {
    const p = D.queue[i], x = 62 + i * 10, y = 35;
    ctx.fillStyle = rgb(p.c); ctx.fillRect(x, y - 6, 4, 6);
    ctx.fillStyle = '#e0b894'; ctx.fillRect(x, y - 9, 4, 3);
    ctx.fillStyle = rgb(p.h); ctx.fillRect(x, y - 10, 4, 1);
    const r = p.r;
    if (r === 'cautus') { ctx.fillRect(x, y - 13, 1, 3); ctx.fillRect(x + 3, y - 13, 1, 3); }
    else if (['feline', 'lupo', 'vulpo', 'zalak', 'ursus'].includes(r)) { ctx.fillRect(x, y - 11, 1, 1); ctx.fillRect(x + 3, y - 11, 1, 1); }
    else if (r === 'perro') { ctx.fillRect(x - 1, y - 10, 1, 2); ctx.fillRect(x + 4, y - 10, 1, 2); }
    else if (r === 'sarkaz') { ctx.fillStyle = '#423440'; ctx.fillRect(x - 1, y - 11, 1, 2); ctx.fillRect(x + 4, y - 11, 1, 2); }
    else if (r === 'vouivre') { ctx.fillStyle = '#e4d6b6'; ctx.fillRect(x, y - 12, 1, 2); ctx.fillRect(x + 3, y - 12, 1, 2); }
    else if (r === 'sankta') { ctx.fillStyle = '#fcd85c'; ctx.fillRect(x, y - 12, 4, 1); }
    else if (r === 'liberi') { ctx.fillRect(x - 1, y - 9, 1, 1); ctx.fillRect(x + 4, y - 9, 1, 1); }
  }
}

// —— 立绘 ——

const hatOn = () => !!(cur && cur.app.hat && !cur.hatOff);

function renderPortrait() {
  const cv = $('#pc');
  if (!cv) return;
  const hot = $('#hot');
  hot.innerHTML = '';
  if (!cur) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); return; }
  const o = { hatOff: cur.hatOff, expr: cur.expr };
  const person = cur.drawFn ? cur.drawFn(o) : drawPerson(cur.app, o);
  if (D.scan) {
    paint(cv, drawScan(person, cur), 0, 0, '#0c1c20');
    const add = (key, x, y, w, h) => {
      const d = document.createElement('div');
      d.className = 'hot f';
      d.dataset.f = key;
      Object.assign(d.style, { position: 'absolute', left: `${x * 2}px`, top: `${y * 2}px`, width: `${w * 2}px`, height: `${h * 2}px` });
      hot.appendChild(d);
    };
    for (const [x, y] of cur.crystals) add('scan.crystal', x - 3, y - 4, 6, 8);
    for (const it of cur.items) if (SCAN_BOX[it]) add(`scan.${it}`, ...SCAN_BOX[it]);
    markSel();
  } else {
    paint(cv, person);
  }
}

function slidePortrait(dir, done) {
  const w = $('#pwrap');
  if (!w) return;
  if (dir === 'in') {
    w.style.transition = 'none';
    w.style.transform = 'translateX(-210px)';
    void w.offsetWidth;
    w.style.transition = 'transform .45s ease-out';
    w.style.transform = 'translateX(0)';
  } else {
    w.style.transition = 'transform .45s ease-in';
    w.style.transform = 'translateX(220px)';
  }
  if (done) later(470, done);
}

// —— 计时器（离开检查亭时一并作废） ——

function later(ms, fn) {
  const day = D;
  const id = setTimeout(() => { if (D === day && scene === 'booth') fn(); }, ms);
  D.timers.push(id);
}

// —— 对话 ——

function say(who, text) {
  const log = $('#log');
  if (!log) return;
  if (text.startsWith('（')) who = 'n';
  const d = document.createElement('div');
  d.className = `ln ${who}`;
  d.innerHTML = who === 'e' ? `<b>旅客：</b>${esc(text)}` : who === 'c' ? `<b>你：</b>${esc(text)}` : esc(text);
  log.appendChild(d);
  while (log.children.length > 40) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
  if (who === 'e' && cur) SFX.mumble(text, cur.voice || 160);
  else if (who === 'c') SFX.mumble(text, 190);
}

// steps: [[who, text], ...]；返回总时长（毫秒）
function talk(steps, delay = 0) {
  const t = cur;
  let ms = delay;
  for (const [who, text] of steps) {
    later(ms, () => { if (cur === t) say(who, text); });
    ms += Math.max(800, 350 + 70 * text.length);
  }
  return ms;
}

// —— 叫号 / 旅客进出 ——

function callNext() {
  if (cur || D.over || D.paused || D.ended) return;
  SFX.init();
  SFX.click();
  const t = hook('traveler', D.n) || nextTraveler(D.n);
  D.n++;
  D.queue.shift();
  if (!D.over && Math.random() < 0.75) D.queue.push(newLook());
  if (!D.over && D.queue.length < 3) D.queue.push(newLook(), newLook());
  drawOutside();
  cur = t;
  t.phase = 'enter';
  t.decided = null;
  t.expr = t.expr || 'neutral';
  D.lastIssue = null;
  D.sel = [];
  banner(D.insp ? '检查模式：依次点两处信息进行对比。' : null);
  renderPortrait();
  slidePortrait('in');
  updateButtons();
  const intro = t.intro || [pick(HELLO)];
  const ms = talk(intro.map((s) => ['e', s]), 500);
  later(800, () => { if (cur === t) placeDocs(t); });
  later(Math.max(900, Math.min(ms, 1600)), () => {
    if (cur !== t) return;
    t.phase = 'here';
    updateButtons();
  });
}

function leave() {
  const t = cur;
  if (!t) return;
  t.phase = 'leave';
  updateButtons();
  slidePortrait('out', () => {
    if (cur !== t) return;
    cur = null;
    D.lastIssue = null;
    D.sel = [];
    $$('.f.bad').forEach((e) => e.classList.remove('bad'));
    renderPortrait();
    const w = $('#pwrap');
    w.style.transition = 'none';
    w.style.transform = 'translateX(-210px)';
    banner(D.insp ? '检查模式：依次点两处信息进行对比。' : null);
    updateButtons();
    if (D.over) later(900, endDay);
    else if (D.stagePending) { D.stagePending = false; nextStage(); }
  });
}

// ———————————————————— 证件 ————————————————————

function row(label, f, value) {
  return `<div class="row"><span class="lb">${esc(label)}</span><span class="f" data-f="${f}">${esc(value)}</span></div>`;
}

function docHTML(kind, d) {
  if (window.DOCS && DOCS.html) { const h = DOCS.html(kind, d); if (h) return h; }
  switch (kind) {
    case 'id': {
      const N = NATIONS[d.nation];
      return `<div class="hd" style="background:${N.color}">${esc(N.name)} · 身份证件</div>
        <div class="idbody"><div class="photo f" data-f="id.photo"><canvas width="56" height="64"></canvas></div><div class="fields">
        ${row('姓名', 'id.name', d.name)}${row('种族', 'id.race', RACES[d.race] ? RACES[d.race].name : d.race)}${row('国籍', 'id.nation', N.name)}
        ${row('签发', 'id.city', d.city)}${row('证号', 'id.idno', d.idno)}${row('期限', 'id.expiry', fmtDate(d.expiry))}</div></div>`;
    }
    case 'permit':
      return `<div class="hd" style="background:#8c3b2e">龙门入境许可</div>
        ${row('姓名', 'permit.name', d.name)}${row('证件号', 'permit.idno', d.idno)}${row('国籍', 'permit.nation', NATIONS[d.nation].name)}
        ${row('目的', 'permit.purpose', d.purpose)}${row('有效期至', 'permit.expiry', fmtDate(d.expiry))}<div class="seal">近卫局</div>`;
    case 'health':
      return `<div class="hd" style="background:#3fa7a0">体检报告 · 边境医疗站</div>
        ${row('姓名', 'health.name', d.name)}${row('检查日期', 'health.date', fmtDate(d.date))}${row('融合率', 'health.fusion', `${d.fusion}%`)}
        ${row('结晶密度', 'health.density', `${d.density}u/L`)}${row('结论', 'health.status', d.status)}`;
    case 'guar':
      return `<div class="hd" style="background:#7a6230">担保函</div>
        ${row('被担保人', 'guar.name', d.name)}${row('担保单位', 'guar.company', d.company)}${row('有效期至', 'guar.expiry', fmtDate(d.expiry))}<div class="seal">担保</div>`;
    case 'rhodes':
      return `<div class="hd" style="background:#1d1d22">罗德岛 · 干员证</div>
        ${row('代号', 'rhodes.code', d.code)}${row('姓名', 'rhodes.name', d.name)}${row('有效期至', 'rhodes.expiry', fmtDate(d.expiry))}<div class="seal rhodes">RI</div>`;
    default: return '';
  }
}

const DOC_ORDER = ['id', 'permit', 'health', 'guar', 'rhodes'];

function addDoc(kind, html, x, y, cls = '') {
  const el = document.createElement('div');
  el.className = `doc ${cls}`.trim();
  el.dataset.doc = kind;
  el.innerHTML = html;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.zIndex = ++D.z;
  $('#docs').appendChild(el);
  return el;
}

function placeDocs(t) {
  SFX.paper();
  let i = 0;
  for (const k of DOC_ORDER) {
    const d = t.docs[k];
    if (!d) continue;
    const [x, y] = i === 0 ? [4, 6] : [4 + (i - 1) * 46, 126 + (i - 1) * 4];
    const el = addDoc(k, docHTML(k, d), x, y, 'traveler');
    if (k === 'id') {
      const cv = el.querySelector('.photo canvas');
      paint(cv, t.photoFn ? t.photoFn() : drawPerson(t.photo || t.app, { hatOff: true }), -20, -4, '#aab4be');
    }
    i++;
  }
  if (t.bribe) addDoc('money', `<div class="hd" style="background:#3f7d3a">龙门币</div><div class="money">× ${t.bribe}</div>`, 120, 176, 'traveler');
  if (t.note) {
    S.flags.note = true;
    addDoc('note', `<div class="notebody">致审查员：<br>${S.fam.sisterLost ? '我们知道小雅被关在哪里。' : '我们知道小雅的事。'}<br>明天，一个戴白围巾的人会来到你的窗口。放他过去，${S.fam.sisterLost ? '我们把她带出来。' : '小雅的抑制剂我们包了。'}<br><span class="sig">——整合运动</span></div>`, 140, 120);
  }
  markSel();
}

function clearTravelerDocs() {
  for (const el of $$('#docs .doc.traveler')) {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }
}

// —— 规则手册 ——

function makeBook() {
  const el = addDoc('book', `<div class="hd">龙门近卫局 · 检查手册</div>
    <div class="tabs"><span class="tab" data-tab="rules">规则</span><span class="tab" data-tab="races">种族</span><span class="tab" data-tab="nations">地区</span></div>
    <div class="page"></div>`, 212, 4, 'book');
  D.book.el = el;
  renderBook();
}

function toggleBook() {
  D.book.shown = !D.book.shown;
  show(D.book.el, D.book.shown);
  if (D.book.shown) D.book.el.style.zIndex = ++D.z;
  updateButtons();
}

function renderBook() {
  const el = D.book.el, page = el.querySelector('.page');
  $$('.tab', el).forEach((tb) => tb.classList.toggle('on', tb.dataset.tab === D.book.tab));
  if (D.book.tab === 'rules') {
    page.innerHTML = `<ol class="rules">${RULES.filter(ruleActive)
      .map((r) => `<li class="f${r.from === S.day ? ' new' : ''}" data-f="${r.key}">${esc(ruleText(r))}</li>`).join('')}</ol>`;
  } else if (D.book.tab === 'races') {
    const k = D.book.race;
    page.innerHTML = `<div class="races"><div class="rlist">${RACE_ORDER.map((r) => `<span class="racebtn${r === k ? ' on' : ''}" data-race="${r}">${RACES[r].name}</span>`).join('')}</div>
      <div class="rview"><canvas width="96" height="80"></canvas><div class="rname">${RACES[k].name}</div><div class="rdesc">${esc(RACES[k].desc)}</div></div></div>
      <div class="note">头饰（如猫耳发箍）不算种族特征。旅客戴帽时，可请其摘帽。</div>`;
    paint(page.querySelector('canvas'), drawPerson(sampleApp(k)), 0, 0, '#cfc4ac');
  } else {
    page.innerHTML = `<div class="nats">${Object.keys(NATIONS).map((k) => `<div class="nat"><i style="background:${NATIONS[k].color}"></i>${esc(NATIONS[k].name)} <span>${NATIONS[k].code}</span></div>`).join('')}</div>
      <div class="note">龙门籍旅客只需出示身份证件。</div>`;
  }
  markSel();
}

// —— 拖动与点击 ——

function onDown(ev) {
  SFX.init();
  if (scene !== 'booth' || !D) return;
  const tgt = ev.target;
  if (tgt.closest('button') || tgt.closest('#tip')) return;
  const tab = tgt.closest('.tab');
  if (tab) { SFX.paper(); D.book.tab = tab.dataset.tab; renderBook(); bringFront(D.book.el); return; }
  const rb = tgt.closest('.racebtn');
  if (rb) { SFX.click(); D.book.race = rb.dataset.race; renderBook(); return; }
  if (D.insp) {
    const f = tgt.closest('[data-f]');
    if (f) { ev.preventDefault(); selectField(f.dataset.f); return; }
  }
  const doc = tgt.closest('.doc');
  if (doc) {
    ev.preventDefault();
    bringFront(doc);
    D.drag = { el: doc, ox: ev.clientX / SCALE - parseFloat(doc.style.left), oy: ev.clientY / SCALE - parseFloat(doc.style.top) };
    doc.classList.add('dragging');
    SFX.paper();
  }
}

function bringFront(el) { el.style.zIndex = ++D.z; }

function onMove(ev) {
  if (!D || !D.drag) return;
  const { el, ox, oy } = D.drag;
  const w = el.offsetWidth, h = el.offsetHeight;
  const x = Math.max(-w + 30, Math.min(424 - 30, ev.clientX / SCALE - ox));
  const y = Math.max(0, Math.min(288 - 20, ev.clientY / SCALE - oy));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  void h;
}

function onUp() {
  if (!D || !D.drag) return;
  D.drag.el.classList.remove('dragging');
  D.drag = null;
}

// ———————————————————— 检查模式 ————————————————————

const INSP_HINT = '检查模式：依次点两处信息进行对比。';

function setInspect(on) {
  D.insp = on;
  stage.classList.toggle('inspecting', on);
  D.sel = [];
  markSel();
  if (on) banner(D.lastIssue ? `发现矛盾：${D.lastIssue.text}` : INSP_HINT, D.lastIssue ? 'bad' : 'info', !!D.lastIssue && !!cur && cur.phase === 'here');
  else banner(null);
  updateButtons();
}

function markSel() {
  $$('.f.sel').forEach((e) => e.classList.remove('sel'));
  if (!D) return;
  for (const f of D.sel) $$(`[data-f="${f}"]`).forEach((e) => e.classList.add('sel'));
  if (D.lastIssue && D.lastIssue.fields) for (const f of D.lastIssue.fields) $$(`[data-f="${f}"]`).forEach((e) => e.classList.add('bad'));
}

function selectField(f) {
  const travelerField = !(f === 'date' || f.startsWith('rule.'));
  if (travelerField && !(cur && cur.phase !== 'leave')) return;
  SFX.click();
  if (D.sel.includes(f)) { D.sel = D.sel.filter((x) => x !== f); markSel(); return; }
  D.sel.push(f);
  markSel();
  if (D.sel.length < 2) return;
  const [a, b] = D.sel;
  const r = cur ? analyze(a, b, cur, hatOn()) : null;
  if (r && r.kind) {
    $$('.f.bad').forEach((e) => e.classList.remove('bad'));
    D.lastIssue = { kind: r.kind, text: r.text, fields: [a, b] };
    SFX.alarm();
    banner(`发现矛盾：${r.text}`, 'bad', !!cur && cur.phase === 'here' && !cur.decided);
  } else if (r && r.hint) {
    banner(r.hint, 'warn');
  } else {
    banner('没有发现矛盾。', 'info');
  }
  const sel = D.sel;
  later(650, () => { if (D.sel === sel) { D.sel = []; markSel(); } });
}

function banner(text, cls = 'info', ask = false) {
  const b = $('#banner');
  if (!b) return;
  if (!text) { b.className = ''; b.style.display = 'none'; b.innerHTML = ''; return; }
  b.style.display = 'block';
  b.className = cls;
  b.innerHTML = esc(text) + (ask ? ' <button id="bAsk" type="button">质询</button>' : '');
  if (ask) $('#bAsk').onclick = interrogate;
}

function interrogate() {
  if (!cur || cur.phase !== 'here' || cur.decided || !D.lastIssue) return;
  SFX.click();
  const k = D.lastIssue.kind;
  const pool = (cur.answers && cur.answers[k]) || ANSWERS[k] || ['……'];
  cur.expr = ['infected', 'ursus', 'sarkaz_noguar'].includes(k) ? 'sad' : k === 'reunion' ? 'angry' : 'shock';
  renderPortrait();
  talk([['c', ASK[k] || '这是怎么回事？'], ['e', pick(pool)]]);
  const b = $('#bAsk');
  if (b) b.remove();
}

// —— 摘帽 / 探测 ——

function removeHat() {
  if (!cur || cur.phase !== 'here' || !cur.app.hat || cur.hatOff) return;
  SFX.click();
  const t = cur;
  t.hatOff = true;
  updateButtons();
  const ms = talk([['c', '请摘下帽子。'], ['e', t.hatLine || pick(['……好吧。', '有必要吗？', '行吧行吧。', '我的发型……算了。'])]]);
  later(Math.min(ms, 1100), () => { if (cur === t) renderPortrait(); });
}

function setScan(on) {
  if (S.day < 3) return;
  D.scan = on;
  SFX.scan(on);
  renderPortrait();
  $('#pwrap').classList.toggle('scan', on);
  updateButtons();
}

// ———————————————————— 盖章与判定 ————————————————————

const STAMP_TXT = { approve: '准予入境', deny: '拒绝入境', detain: '拘留' };

function decide(dec) {
  if (!cur || cur.phase !== 'here' || cur.decided) return;
  if (dec === 'detain' && S.day < 3) return;
  const t = cur;
  t.decided = dec;
  SFX.stamp();
  const idEl = $('#docs .doc[data-doc="id"]') || $('#docs .doc.traveler');
  if (idEl) {
    const m = document.createElement('div');
    m.className = `stampmark ${dec}`;
    m.textContent = STAMP_TXT[dec];
    m.style.transform = `translate(-50%, -50%) rotate(${(Math.random() * 16 - 14).toFixed(1)}deg)`;
    idEl.appendChild(m);
    bringFront(idEl);
  }
  if (D.insp) setInspect(false);
  if (D.scan) setScan(false);
  updateButtons();
  later(900, () => finish(t, dec));
}

function finish(t, dec) {
  if (cur !== t) return;
  const ok = okSet(t).includes(dec);
  D.total++;
  if (ok) {
    D.correct++;
    if (dec === 'detain') D.detainBonus += 5;
    if (dec !== 'approve' && D.lastIssue) D.findBonus += FIND_BONUS;
    SFX.good();
  } else {
    citation(t, dec);
  }
  if (dec === 'approve' && t.bribe) D.bribe += t.bribe;
  if (t.onDecide) t.onDecide(dec);
  hook('decide', t, dec);
  t.expr = dec === 'approve' ? 'smile' : dec === 'detain' ? 'shock' : (t.expr === 'sad' ? 'sad' : 'angry');
  renderPortrait();
  const line = (t.react && t.react[dec]) || pick(dec === 'approve' ? THANKS : dec === 'deny' ? DENIED : DETAINED);
  const steps = [['e', line]];
  if (dec === 'detain') steps.push(['n', '（近卫局干员把旅客带走了。）']);
  const ms = talk(steps);
  updateHud();
  later(600, clearTravelerDocs);
  later(Math.max(1500, ms), leave);
}

function citation(t, dec) {
  D.cites++;
  S.cites++;
  SFX.buzz();
  const why = citeReason(t, dec);
  const fine = D.cites > 2 ? 5 : 0;
  D.fines += fine;
  const el = addDoc('cite', `<div class="hd" style="background:#b33a2e">违规通知 · 近卫局</div>
    <div class="citebody">${esc(why)}<br><b>${fine ? '罚款 5 龙门币' : `警告（${D.cites}/2）`}</b></div>`, 100, 150);
  later(7000, () => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 420);
  });
  updateHud();
}

// ———————————————————— 下班 ————————————————————

function endDay() {
  if (!D || D.ended) return;
  D.ended = true;
  if (D.insp) setInspect(false);
  updateButtons();
  banner('下班了。', 'info');
  say('n', '（你拉下窗口的卷帘，今天的工作结束了。）');
  SFX.bell();
  later(1800, showSummary);
}

// ———————————————————— 结算 ————————————————————

const STORY = {
  1: () => '回到家，小雅咳了一整晚。母亲说，是龙门的风太干了。',
  2: () => '你发现小雅的手背上长出了一小块黑色的晶体。\n她哭着求你别告诉任何人——感染者会被赶出龙门。\n黑市上的抑制剂，一支 15 龙门币。',
  3: () => (S.flags.pie === 3 ? '那位拉特兰旅客送的苹果派，让全家吃了顿好的。小雅说，这是她来龙门以后吃过最甜的东西。' : '晚间新闻在播下城区的源石走私案。小雅把袖子往下拉了拉。'),
  4: () => (S.flags.note ? (S.fam.sisterLost ? '那张纸条在你口袋里沉甸甸的。\n他们真的能把小雅带出来吗？' : '那张纸条在你口袋里沉甸甸的。\n他们怎么会知道小雅的事？') : '听说切尔诺伯格已经烧成了一片废墟。母亲一晚上没说话。'),
  5: () => (S.flags.reunion ? (S.fam.sisterLost ? '你回家时，门缝里塞着一张字条：“三天后，隔离区北门。”没有署名。' : '你回家时，门口放着一个小盒子，里面是三支抑制剂。没有署名。')
    : S.flags.caught ? '近卫局的人把那个戴白围巾的人押走了。他回头看了你一眼。' : '城外传来了隐约的炮声。'),
};

function famStatus() {
  const f = S.fam;
  const mom = f.momLost ? '已离开' : f.momSick ? '生病' : f.hungry > 0 ? '饥饿' : '健康';
  const sis = f.sisterLost ? '被带走了' : !f.sisterInfected ? (S.day === 1 ? '咳嗽' : '健康') : f.sisterMiss > 0 ? '病情加重' : '病情稳定';
  const hungry = f.hungry > 0 && !f.sisterLost ? '，饥饿' : '';
  return [['母亲', mom], ['小雅（妹妹）', sis + (f.sisterLost ? '' : hungry)]];
}

function showSummary() {
  scene = 'summary';
  const d = D;
  D = null; cur = null;
  stage.classList.remove('inspecting');
  if (S.day === 2) S.fam.sisterInfected = true;
  const income = dayIncome(d);
  S.money += income;
  S.served = (S.served || 0) + d.total;
  const f = S.fam;
  const exps = [{ k: 'rent', name: '房租', cost: 20, must: true }];
  if (S.flags.pie === S.day) exps.push({ k: 'food', name: '食物（苹果派）', cost: 0, must: true });
  else exps.push({ k: 'food', name: '食物', cost: 10 });
  if (f.sisterInfected && !f.sisterLost) {
    if (S.gift > 0) exps.push({ k: 'supp', name: `抑制剂（没署名的小盒子，剩 ${S.gift} 支）`, cost: 0, must: true });
    else exps.push({ k: 'supp', name: '抑制剂（黑市）', cost: 15 });
  }
  if (f.momSick && !f.momLost) exps.push({ k: 'med', name: '母亲的药', cost: 10 });

  const lines = [
    ['处理旅客', `${d.total} 人（正确 ${d.correct} 人）`],
    ['工资', `+${d.correct * 5}`],
  ];
  if (d.detainBonus) lines.push(['拘留奖金', `+${d.detainBonus}`]);
  if (d.findBonus) lines.push(['查证奖金', `+${d.findBonus}`]);
  if (d.bribe) lines.push(['“土特产”', `+${d.bribe}`]);
  if (d.fines) lines.push(['罚款', `-${d.fines}`]);
  lines.push(['存款', `${S.money}`]);

  const hints = [];
  if (exps.some((e) => e.k === 'food' && e.cost)) hints.push('不买食物：明天上班迟到。');
  if (exps.some((e) => e.k === 'supp' && e.cost)) hints.push(f.sisterMiss > 0 ? '小雅已经断过一次药，不能再断了。' : '抑制剂断一次病情加重，断两次……');
  if (exps.some((e) => e.k === 'med')) hints.push('母亲的药最多拖一晚。');
  const broke = S.money < 20;
  stage.innerHTML = `<div class="scene" id="summary"><div class="panel">
    <h2>第 ${S.day} 天 · 下班</h2>
    <div class="cols">
      <div class="col">
        <table class="sum">${lines.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
        <div class="fam">${famStatus().map(([a, b]) => `<div><span>${esc(a)}</span>${esc(b)}</div>`).join('')}</div>
      </div>
      <div class="col">
        <div class="exps">${exps.map((e) => `<label class="exp"><input type="checkbox" data-k="${e.k}" data-c="${e.cost}"${e.must ? ' checked disabled' : ''}> ${esc(e.name)} <span>${e.cost ? `-${e.cost}` : '0'}</span></label>`).join('')}</div>
        <div class="remain" id="remain"></div>
        <div class="exphint">${hints.map(esc).join('<br>')}</div>
      </div>
    </div>
    <p class="story">${br(broke ? '你数了数口袋里的龙门币——连房租都不够。' : (STORY[S.day] ? STORY[S.day]() : ''))}</p>
    <button class="btn" id="sGo" type="button">${S.day >= LAST_DAY ? '……' : '睡觉'}</button>
  </div></div>`;

  const boxes = $$('#summary input[type=checkbox]');
  const spent = () => boxes.filter((b) => b.checked).reduce((s, b) => s + Number(b.dataset.c), 0);
  const upd = () => { $('#remain').textContent = `剩余：${S.money - spent()} 龙门币`; };
  // 默认勾上买得起的
  for (const b of boxes) {
    if (b.disabled) continue;
    if (S.money - spent() - Number(b.dataset.c) >= 0) b.checked = true;
    b.addEventListener('change', () => {
      if (b.checked && S.money - spent() < 0) { b.checked = false; SFX.buzz(); }
      else SFX.click();
      upd();
    });
  }
  upd();
  hook('scene', 'summary');
  $('#sGo').onclick = () => {
    SFX.click();
    if (broke) { S.money -= 20; showEnding('evicted'); return; }
    const bought = {};
    for (const b of boxes) bought[b.dataset.k] = b.checked;
    S.money -= spent();
    nightly(bought);
    S.day++;
    if (S.day > LAST_DAY) { showEnding(endingKind()); return; }
    save();
    showNews();
  };
}

function nightly(bought) {
  const f = S.fam;
  if (bought.food) f.hungry = 0; else f.hungry++;
  if (!f.momLost) {
    if (f.momSick) {
      if (bought.med) { f.momSick = false; f.momSickDays = 0; } else if (++f.momSickDays >= 2) f.momLost = true;
    } else if (f.hungry >= 2) f.momSick = true;
  }
  if (f.sisterInfected && !f.sisterLost) {
    // 断药是累计的：第一次病情加重，第二次就会被带走
    if (S.gift > 0) S.gift--;
    else if (!bought.supp && ++f.sisterMiss >= 2) f.sisterLost = true;
  }
}

function endingKind() {
  if (S.flags.reunion) return S.fam.sisterLost ? 'reunion_lost' : 'reunion';
  if (S.fam.sisterLost) return 'lost';
  if (S.flags.rhodes && S.flags.rhodesDoc) return 'rhodes';
  if (S.flags.caught) return 'caught';
  return 'citizen';
}

// 结局正文后面追加的段落：把没写进主线的选择也交代一下
function endingExtra(kind) {
  const f = S.fam, out = [];
  if (kind === 'evicted') return '';
  if (kind === 'rhodes' && S.flags.caught) out.push('至于那个戴白围巾的人——近卫局说，多亏了你。罗德岛的医生听完，只是点了点头。');
  if (kind === 'lost' && S.flags.caught) out.push('你抓住了那个戴白围巾的人。嘉奖令寄到家里的那天，小雅的床已经空了。');
  if (!f.sisterLost && f.sisterInfected && f.sisterMiss > 0 && kind !== 'rhodes') out.push('断过药之后，小雅手背上的晶体又长大了一圈。');
  if (f.momLost) out.push('母亲的病一直没有好起来。她回了乡下老家，说不想再拖累你们。');
  else if (f.hungry > 0) out.push('最后那天晚上，家里的锅是空的。');
  return out.length ? '\n\n' + out.join('\n') : '';
}

// ———————————————————— 结局 ————————————————————

const ENDINGS = {
  reunion_lost: ['北门', '那个戴白围巾的人走进了龙门。\n三天后，下城区燃起了火光，隔离区的北门在混乱中被人打开了。\n小雅瘦了很多，手背上的晶体已经爬到了手腕。她身后站着几个戴面具的人，谁也没有说话。\n你带着她连夜离开了龙门。那座城市和那份工作，你都回不去了。'],
  caught: ['白围巾', '近卫局从那个戴白围巾的人身上搜出了下城区的布防图。魏长官亲自签了嘉奖令，奖金够买两个月的抑制剂。\n可整合运动知道小雅的事，也知道是谁抓了他们的人。\n你开始每天接送小雅上下学。每次转过街角，你都会回头看一眼。'],
  reunion: ['整合运动的夜晚', '那个戴白围巾的人走进了龙门。\n三天后，下城区燃起了火光。\n小雅用上了小盒子里的抑制剂，手背上的晶体不再蔓延。可近卫局开始挨个调查那一周的值班记录。\n某个没有月亮的夜里，你带着家人离开了龙门。身后那座城市，你再也回不去了。'],
  lost: ['隔离区的围墙', '抑制剂断了两晚之后，小雅在学校昏倒了。\n近卫局的车把她带去了城外的隔离区。你隔着铁丝网见过她一次，她笑着说那里的人对她很好。\n第二天，你照常回到检查站，在一位感染者的证件上盖下了拒绝章。'],
  rhodes: ['罗德岛的方舟', '一周后，一位戴兜帽的罗德岛医生敲响了你家的门。\n“那天在检查站，你放我们的人过去了。”\n他看了看小雅的手背：“我们可以治疗她。如果你愿意，罗德岛也需要一个懂得看证件的人。”\n那天晚上，小雅第一次没有把手藏进袖子里。'],
  citizen: ['模范审查员', '近卫局给你记了一次嘉奖，奖状挂在家里最显眼的地方。\n小雅还是每天穿着长袖。抑制剂越来越贵，黑市的人越来越难找。\n你每天照常上班，照常核对证件上的种族和融合率。\n只是每次盖下拒绝章的时候，你都会想起小雅的手。'],
  evicted: ['流落街头', '你付不起房租了。\n房东把你们的行李扔到了楼下。那天晚上，一家人挤在下城区的屋檐下躲雨。\n第二天，近卫局通知你：不用再来上班了。'],
};

function showEnding(kind) {
  scene = 'ending'; D = null; cur = null;
  clearSave();
  const meta = syncMeta(ENDINGS[kind] ? kind : 'citizen');
  const got = ENDING_ORDER.filter((k) => meta.endings[k]).length;
  const [title, text] = ENDINGS[kind] || ENDINGS.citizen;
  const extra = endingExtra(kind);
  stage.innerHTML = `<div class="scene" id="ending"><div class="panel">
    <div class="endtag">结局 · 已解锁 ${got}/${ENDING_ORDER.length}</div>
    <h2>${esc(title)}</h2>
    <p class="story">${br(text + extra)}</p>
    <div class="stats">共处理旅客 ${S.served || 0} 人 · 违规 ${S.cites} 次 · 存款 ${S.money} 龙门币</div>
    <p class="credit">泰拉的检查站按种族和感染状态区别对待旅客。现实中，请只看证件，不看脸。</p>
    <button class="btn" id="eBack" type="button">回到标题</button>
  </div></div>`;
  SFX.bell();
  $('#eBack').onclick = () => { SFX.click(); showTitle(); };
  hook('scene', 'ending', kind);
}

// ———————————————————— 主循环 ————————————————————

let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.1, Math.max(0, (ts - lastTs) / 1000));
  lastTs = ts;
  if (scene === 'booth' && D && !D.paused && !D.ended && !document.hidden) tick(dt);
  if (scene === 'booth' && D && window.SCENE && ts - (loop.outT || 0) > 66) { loop.outT = ts; drawOutside(); }
  requestAnimationFrame(loop);
}

function tick(dt) {
  D.t += dt;
  const m = DAY_START + Math.floor(D.t * MIN_PER_SEC);
  if (m !== D.minute) { D.minute = m; updateHud(); }
  if (m >= DAY_END && !D.over) {
    D.over = true;
    SFX.bell();
    say('n', cur ? '（下班铃响了。处理完这一位就可以下班。）' : '（下班铃响了。）');
    D.queue.length = Math.min(D.queue.length, 4);
    drawOutside();
    updateButtons();
    if (!cur) later(1200, endDay);
  }
}

// ———————————————————— 启动 ————————————————————

// 键盘快捷键（避开彩蛋用到的方向键和 A/B）
const KEYS = { ' ': '#bCall', 1: '#bApprove', 2: '#bDeny', 3: '#bDetain', e: '#bInsp', r: '#bScan', f: '#bBook', h: '#bHat', q: '#bAsk' };
function onKey(ev) {
  if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey || scene !== 'booth' || !D) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  const tip = $('#tipOk');
  const sel = tip && tip.offsetParent ? ((k === ' ' || k === 'Enter') ? '#tipOk' : null) : KEYS[k];
  const b = sel && $(sel);
  if (!b || b.disabled || !b.offsetParent) return;
  ev.preventDefault();
  // 让之前点过的按钮失焦，否则空格松开时会再触发它一次
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  b.click();
}

function boot() {
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 200));
  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  document.addEventListener('keydown', onKey);
  const mute = document.getElementById('mute');
  if (mute) {
    mute.addEventListener('click', () => {
      SFX.init();
      SFX.muted = !SFX.muted;
      mute.textContent = SFX.muted ? '声音：关' : '声音：开';
    });
  }
  const full = document.getElementById('full');
  if (full) {
    const root = document.documentElement;
    if (!root.requestFullscreen && !root.webkitRequestFullscreen) full.style.display = 'none';
    full.addEventListener('click', () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      const p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    });
  }
  document.addEventListener('visibilitychange', () => { lastTs = performance.now(); });
  showTitle();
  requestAnimationFrame(loop);
}

boot();
