// 旅客模拟测试：每天随机生成一批旅客，检查
//   1) 有问题的旅客，每个问题都至少能被一组“检查”对比查出来（不会出现无解旅客）；
//   2) 证件齐全的旅客，任何对比都不会报矛盾（不会冤枉好人）；
//   3) 剧情角色当天全部出场。
// 用法：node tools/sim_test.js [每天人数，默认 4000]
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/^'use strict';/, '');
const N = +(process.argv[2] || 4000);
const harness = `
var S = { day: 1, flags: {}, fam: { sisterLost: false }, gift: 0 };
var window = globalThis;
var D = null;
const DAY_START = 480, DAY_END = 1080, MIN_PER_SEC = 2;
globalThis.__run = function (N) {
  const RULE_KEYS = RULES.map((r) => r.key);
  const fieldsOf = (t) => {
    const f = ['face', 'date', 'scan.crystal', 'scan.contraband', 'scan.reunion', ...RULE_KEYS];
    for (const k in t.docs) for (const x in t.docs[k]) f.push(k + '.' + x);
    f.push('id.photo');
    return f;
  };
  // 每种问题允许由哪些“矛盾类型”查出来
  const KIND = {
    id_expired: ['expired'], permit_expired: ['expired'], guar_expired: ['expired'], rhodes_expired: ['expired', 'infected'],
    race: ['race'], photo: ['photo'], permit_missing: ['permit_missing'], permit_name: ['name'], permit_idno: ['idno'], permit_nation: ['nation'],
    health_missing: ['health_missing'], infected: ['infected'], health_incons: ['health_incons'], health_name: ['name'], health_lie: ['health_lie', 'infected'],
    sarkaz_noguar: ['sarkaz_noguar'], guar_name: ['name'], smuggle: ['smuggle'], reunion: ['reunion'], rhodes_name: ['name', 'infected'], ursus: ['ursus'],
  };
  const fails = [], stats = {};
  const check = (t, label) => {
    const fs_ = fieldsOf(t), found = new Set();
    for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) {
      const r = analyze(fs_[i], fs_[j], t, false);
      if (r && r.kind) found.add(r.kind);
    }
    if (!t.flaws.length) {
      // 罗德岛干员是合规的感染者：不应报任何矛盾
      if (found.size) fails.push(label + ' 第' + S.day + '天 合规旅客被报矛盾: ' + [...found].join(',') + ' ' + JSON.stringify(t.docs));
    } else {
      for (const f of t.flaws) {
        stats[f] = (stats[f] || 0) + 1;
        const ok = (KIND[f] || []).some((k) => found.has(k));
        if (!ok) fails.push(label + ' 第' + S.day + '天 查不出: ' + f + '（查到 ' + [...found].join(',') + '）');
      }
    }
  };
  for (let day = 1; day <= 5; day++) {
    S.day = day;
    for (let i = 0; i < N; i++) {
      D = day === 1 ? { stage: i % 2, t: 0, specials: [] } : null;   // 第 1 天上午 / 下午各一半
      const t = randomTraveler();
      if (day === 1 && !D.stage && (t.nation !== 'lungmen' || t.flaws.some((f) => f !== 'race'))) fails.push('第1天上午出现了种族以外的问题: ' + t.nation + ' ' + t.flaws);
      check(t, '随机');
    }
    // 剧情角色：模拟一个只叫了 6 个人的慢玩家
    for (let rep = 0; rep < 200; rep++) {
      D = { t: 0, specials: planSpecials(day) };
      const total = D.specials.length;
      let seen = 0;
      for (let n = 0; n < 6; n++) {
        D.t = 50 * (n + 1);
        const before = D.specials.length;
        const t = nextTraveler(n);
        if (D.specials.length < before) { seen++; if (t.onDecide) t.onDecide('approve'); if (D.stagePending) { D.stagePending = false; D.stage = 1; } if (!t.expect && !t.ok) check(t, '剧情'); }
      }
      if (seen < total) { fails.push('第' + day + '天 剧情角色只出场 ' + seen + '/' + total); break; }
    }
    D = null;
  }
  return { fails, stats };
};`;
(0, eval)(read('data.js') + read('art.js') + read('gen.js') + harness);
const { fails, stats } = globalThis.__run(N);
console.log('各类问题出现次数:', JSON.stringify(stats));
if (fails.length) {
  const uniq = [...new Set(fails.map((f) => f.replace(/\{.*$/, '')))];
  console.log('失败 ' + fails.length + ' 次，' + uniq.length + ' 类：');
  for (const u of uniq.slice(0, 20)) console.log('  ' + u);
  console.log('示例: ' + fails[0].slice(0, 600));
  process.exit(1);
}
console.log('全部通过：5 天 × ' + N + ' 名随机旅客 + 剧情角色。');
