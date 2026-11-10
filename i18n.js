'use strict';
// 中英双语。游戏源码里的文字一律写中文；英文集中放在 lang-en.js。
// 页面上出现的每一段中文（文本节点、title 提示）都会在显示前查词典换成英文：
//   1. 整段完全匹配 I18N.en；
//   2. 带数字、名字的句子走 I18N.rules 里的正则；
//   3. 用顿号连起来的列表逐项翻译。
// 查不到的原样显示中文，并记进 I18N.miss（控制台里看 [...I18N.miss]）。
// 随机生成的姓名不走词典：gen.js 的 genName 会直接按当前语言取名。

const LANG_KEY = 'lungmen-please-lang';
let LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') return q;
    const s = localStorage.getItem(LANG_KEY);
    if (s === 'en' || s === 'zh') return s;
  } catch (e) { /* ignore */ }
  return /^zh\b/i.test((typeof navigator !== 'undefined' && navigator.language) || 'zh') ? 'zh' : 'en';
})();

const I18N = { en: {}, rules: [], names: {}, miss: new Set() };
// 汉字、全角标点、中文引号和省略号
const CJK_RE = /[⺀-鿿＀-￯…“”‘’]/;

function trCore(c) {
  if (!CJK_RE.test(c)) return c;
  if (Object.prototype.hasOwnProperty.call(I18N.en, c)) return I18N.en[c];
  for (const [re, fn] of I18N.rules) {
    const m = re.exec(c);
    if (m) { const r = fn(m); if (r != null) return r; }
  }
  if (c.includes('、')) {
    const parts = c.split('、').map(trCore);
    if (parts.every((p) => p != null)) return parts.join(', ');
  }
  return null;
}
// 翻译一段文字（保留首尾空白）；查不到返回原文
function trText(s) {
  if (LANG !== 'en' || !s || !CJK_RE.test(s)) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  const r = trCore(m[2]);
  if (r == null) { I18N.miss.add(m[2]); return s; }
  return m[1] + r + m[3];
}
const tr = (s) => trText(String(s));
// 规则里用：翻译一个片段，查不到就原样返回
const trPart = (s) => { const r = trCore(s); return r == null ? s : r; };

// —— 页面 ——
if (typeof document !== 'undefined') {
  const ORIG = new WeakMap();            // 文本节点 → { zh, en }
  const trNode = (n) => {
    const s = n.nodeValue;
    if (LANG !== 'en') return;
    const r = trText(s);
    if (r !== s) { ORIG.set(n, { zh: s, en: r }); n.nodeValue = r; }
  };
  const trAttr = (el) => {
    if (LANG !== 'en' || !el.hasAttribute('title')) return;
    const s = el.getAttribute('title'), r = trText(s);
    if (r !== s) { el.dataset.zhTitle = s; el.setAttribute('title', r); }
  };
  const walk = (root, fn, el) => {
    if (root.nodeType === 3) { fn(root); return; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    if (el) { el(root); for (const e of root.querySelectorAll('[title]')) el(e); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fn);
  };
  const restore = (n) => {
    const o = ORIG.get(n);
    if (o && n.nodeValue === o.en) n.nodeValue = o.zh;
    ORIG.delete(n);
  };
  const restoreAttr = (el) => {
    if (el.dataset && el.dataset.zhTitle) { el.setAttribute('title', el.dataset.zhTitle); delete el.dataset.zhTitle; }
  };

  const syncButton = () => {
    const b = document.getElementById('lang');
    if (b) b.textContent = LANG === 'en' ? '中文' : 'EN';
    document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  };

  // 切换语言：已经在屏幕上的文字原地换。证件上随机生成的姓名要等下一位旅客才会换。
  window.setLang = function (l) {
    LANG = l === 'en' ? 'en' : 'zh';
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* ignore */ }
    syncButton();
    if (LANG === 'en') walk(document.body, trNode, trAttr);
    else walk(document.body, restore, restoreAttr);
  };

  const start = () => {
    syncButton();
    walk(document.body, trNode, trAttr);
    new MutationObserver((ms) => {
      if (LANG !== 'en') return;
      for (const m of ms) {
        if (m.type === 'characterData') trNode(m.target);
        else if (m.type === 'attributes') trAttr(m.target);
        else for (const n of m.addedNodes) walk(n, trNode, trAttr);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title'] });
    const b = document.getElementById('lang');
    if (b) b.addEventListener('click', () => window.setLang(LANG === 'en' ? 'zh' : 'en'));
  };
  // 等所有脚本（包括 lang-en.js）都加载完再开始
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { I18N.miss.clear(); start(); }); else start();
}
