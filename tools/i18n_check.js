// 英文覆盖率检查：node tools/i18n_check.js
// 把各个 .js 里带中文的字符串字面量拆成屏幕上的一段段文字，逐段查 lang-en.js。
// 带 ${...} 的模板字符串用数字 3 代入后再查（走 I18N.rules）。查不到的列出来。
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, navigator: { language: 'en' }, URLSearchParams, location: { search: '' } };
vm.createContext(ctx);
for (const f of ['i18n.js', 'lang-en.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^'use strict';/, '').replace(/^const (LANG_KEY|I18N|CJK_RE|tr|trPart) /gm, 'var $1 ').replace(/^let LANG /m, 'var LANG ').replace(/^function /gm, 'this.$& '.replace('this.$& ', 'function ')), ctx, { filename: f });
vm.runInContext("LANG = 'en';", ctx);
const CJK = /[⺀-鿿＀-￯…“”‘’]/, HAN = /[一-鿿]/;
const FILES = ['data.js', 'gen.js', 'docs.js', 'game.js', 'eggs.js', 'scene.js', 'sfx.js', 'index.html'];
// 不会显示在屏幕上的字符串（姓名用字、正则、判断用的片段）
const SKIP = [/存不了就算了/, /'放行了不合规的旅客：' \+|'不应拘留：' \+/, /const hungry = /, /^\s*(first|last): \[/, /NAME_SWAP|^\s+'[^']':/, /pick\(\['某'/, /=== '安'/, /replace\(\/\^成就：\//, /includes\('苹果派'\)/];
let miss = 0, total = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!HAN.test(line) || /^\s*(\/\/|\*|\/\*|<!--)/.test(line) || SKIP.some((r) => r.test(line))) return;
    const code = f.endsWith('.html') ? line : line.replace(/(^|[^:'"`])\/\/.*$/, '$1');
    const lits = [];
    if (f.endsWith('.html')) {
      if (/<meta|<title/.test(code)) return;
      lits.push(code);
    } else {
      const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
      let m;
      while ((m = re.exec(code))) lits.push((m[1] ?? m[2] ?? m[3]));
      // 多行模板字符串中间的行：整行当作一段 HTML
      if (!lits.some((x) => HAN.test(x))) lits.push(code.replace(/`/g, ''));
    }
    for (let s of lits) {
      if (!HAN.test(s)) continue;
      // ${ ... } → 占位；里面嵌套的引号字符串另行处理
      const inner = [];
      s = s.replace(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, e) => { const r = /'((?:[^'\\]|\\.)*)'/g; let k; while ((k = r.exec(e))) if (HAN.test(k[1])) inner.push(k[1]); return '\u0001'; });
      for (const part of [s, ...inner]) {
        const frags = part.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').split(/<[^>]*>|\n/);
        for (let fr of frags) {
          fr = fr.trim();
          if (!CJK.test(fr) || !HAN.test(fr)) continue;
          total++;
          const probe = fr.replace(/\u0001/g, '3');
          if (/^放他过去|^明天，一个戴白围巾|^我们把她带出来|^阿米娅的抑制剂我们包了/.test(fr)) continue;   // 这几段在页面上拼成一句
          if (ctx.trCore(probe) == null) { miss++; console.log(`${f}:${i + 1}: ${fr.replace(/\u0001/g, '${…}')}`); }
        }
      }
    }
  });
}
console.log(`\n${total} 段文字，${miss} 段没有英文。`);
process.exit(miss ? 1 : 0);
