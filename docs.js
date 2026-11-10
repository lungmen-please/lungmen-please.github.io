'use strict';
// 证件外观：每种证件各自一套设计（身份证 / 入境许可 / 体检报告 / 担保函 / 罗德岛干员证）。
// game.js 的 docHTML() 会先调用 DOCS.html(kind, d)。字段一律是 <span class="f" data-f="...">，键名不能改。

(function () {
  const E = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // 字符画 → 像素 SVG
  function pix(rows, pal, s = 1, cls = 'px') {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    let r = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        let n = 1;
        while (x + n < row.length && row[x + n] === c) n++;
        if (pal[c]) r += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${pal[c]}"/>`;
        x += n;
      }
    });
    return `<svg class="${cls}" width="${w * s}" height="${h * s}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }

  // 各国纹章
  const EMBLEM = {
    pagoda: ['....X....', '...XXX...', '..XXXXX..', '....X....', '.XXXXXXX.', '..XoXoX..', 'XXXXXXXXX', '.XoXoXoX.', '.XXXXXXX.'],
    crown: ['X...X...X', 'XX.XXX.XX', 'XXXXXXXXX', 'XoXoXoXoX', 'XXXXXXXXX', '.XXXXXXX.'],
    star: ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXoXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'],
    shield: ['XXXXXXXXX', 'XoooXoooX', 'XoooXoooX', 'XXXXXXXXX', 'XoooXoooX', '.XooXooX.', '..XoXoX..', '...XXX...', '....X....'],
    halo: ['.XXXXXXX.', 'X.......X', '.XXXXXXX.', '....X....', '..XXXXX..', '....X....', '....X....', '....X....'],
    wolf: ['X.......X', 'XX.....XX', 'XXXXXXXXX', 'XX.XXX.XX', 'XXXXXXXXX', '.XXXXXXX.', '..XXoXX..', '...XXX...'],
    pipes: ['.X.X.X.X.', '.X.X.X.X.', 'XXXXXXXXX', 'XoXoXoXoX', 'XoXoXoXoX', 'XXXXXXXXX', 'X.......X', 'XXXXXXXXX'],
    eagle: ['....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XXX.XXX.', '.X.....X.'],
    horns: ['X.......X', 'X.......X', 'XX.....XX', '.XX...XX.', '..XXXXX..', '..XoXoX..', '..XXXXX..', '...XXX...'],
    peak: ['....X....', '...XXX...', '..XoXoX..', '.XXXXXXX.', 'XXX.X.XXX', 'XXXXXXXXX'],
  };
  const NATION_EMBLEM = {
    lungmen: 'pagoda', victoria: 'crown', ursus: 'star', kazimierz: 'shield', laterano: 'halo',
    siracusa: 'wolf', leithanien: 'pipes', columbia: 'eagle', kazdel: 'horns', kjerag: 'peak',
  };
  const emblem = (nat, col, dark, s = 1, cls) => pix(EMBLEM[NATION_EMBLEM[nat] || 'shield'], { X: col, o: dark }, s, cls);

  const ICON = {
    cross: ['..XXX..', '..XXX..', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '..XXX..', '..XXX..'],
    crystal: ['..X..', '.XoX.', 'XooOX', 'XoooX', '.XoX.', '..X..'],
    rhodes: ['....X....', '...X.X...', '..X.X.X..', '.X.XXX.X.', 'X.XXXXX.X', '.X.XXX.X.', '..X.X.X..', '...X.X...', '....X....'],
    house: ['....X....', '...XXX...', '..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', '.XoXXXoX.', '.XXXoXXX.', '.XXXoXXX.'],
  };

  // 条码：由字符串决定，同一张证件每次都一样
  function barcode(seed, w = 84, h = 9, col = '#f2f2ef') {
    let s = hash(seed) || 1, x = 0, r = '', black = true;
    const next = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) >>> 16);
    while (x < w) {
      const bw = 1 + (next() % 3);
      if (black) r += `<rect x="${x}" y="0" width="${Math.min(bw, w - x)}" height="${h}" fill="${col}"/>`;
      x += bw; black = !black;
    }
    return `<svg class="bar" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }

  // 签名：像素波浪线
  function signature(seed, col = '#2b3a78') {
    const s = hash(seed), w = 44, h = 10;
    let r = '';
    for (let x = 0; x < w; x++) {
      const y = Math.round(4.5 + 3.2 * Math.sin(x * 0.42 + (s % 7)) * (x < 6 ? x / 6 : 1) + (((s >> (x % 16)) & 1) ? 0.6 : 0));
      r += `<rect x="${x}" y="${Math.max(0, Math.min(h - 1, y))}" width="1" height="1" fill="${col}"/>`;
    }
    r += `<rect x="${w - 10}" y="${h - 2}" width="10" height="1" fill="${col}"/>`;
    return `<svg class="sig" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }

  const row = (label, key, value, cls = '') =>
    `<div class="dr${cls ? ' ' + cls : ''}"><span class="dl">${label}</span><span class="f" data-f="${key}">${E(value)}</span></div>`;
  const nat = (k) => (NATIONS[k] ? NATIONS[k].name : k);
  const raceName = (k) => (RACES[k] ? RACES[k].name : k);
  const ymd = (n) => fmtDate(n).replace(/\./g, '').slice(2);

  function idCard(d) {
    const N = NATIONS[d.nation] || { color: '#555', code: 'XX' };
    const digits = String(d.idno).replace(/\D/g, '');
    let mrz = `ID${N.code}<<${digits}<<${ymd(d.expiry)}<${String(d.race).slice(0, 3).toUpperCase()}`;
    mrz = (mrz + '<'.repeat(32)).slice(0, 32);
    return `<div class="dx dx-id" style="--nc:${N.color}">
      <div class="dh">${emblem(d.nation, '#f1d27a', 'rgba(0,0,0,.35)')}<span class="dt">${E(N.name)} · 身份证件</span><span class="dc">${E(N.code)}</span></div>
      ${emblem(d.nation, 'var(--nc)', 'transparent', 6, 'wm')}
      <div class="idb">
        <div class="pf"><div class="photo f" data-f="id.photo"><canvas width="56" height="64"></canvas></div><div class="holo"></div></div>
        <div class="flds">
          ${row('姓名', 'id.name', d.name)}${row('种族', 'id.race', raceName(d.race))}${row('国籍', 'id.nation', nat(d.nation))}
          ${row('签发', 'id.city', d.city)}${row('证号', 'id.idno', d.idno)}${row('期限', 'id.expiry', fmtDate(d.expiry))}
        </div>
      </div>
      <div class="mrz">${E(mrz)}</div>
    </div>`;
  }

  function permit(d) {
    const no = String(hash(`${d.idno}|${d.name}`) % 1000000).padStart(6, '0');
    return `<div class="dx dx-permit">
      <div class="dh">${pix(EMBLEM.pagoda, { X: '#f6e3b0', o: '#8c3b2e' })}<span class="dt">龙门入境许可</span></div>
      <div class="sub"><span>龙门近卫局</span><span class="no">No.${no}</span></div>
      ${row('姓名', 'permit.name', d.name)}${row('证件号', 'permit.idno', d.idno)}${row('国籍', 'permit.nation', nat(d.nation))}
      ${row('目的', 'permit.purpose', d.purpose)}${row('有效期至', 'permit.expiry', fmtDate(d.expiry))}
      <div class="seal">近卫<br>局印</div>
      <div class="qf"></div>
    </div>`;
  }

  function health(d) {
    const inf = d.status === '感染者';
    return `<div class="dx dx-health">
      <div class="dh">${pix(ICON.cross, { X: '#ffffff' })}<span class="dt">体检报告</span><span class="dc">MED</span></div>
      <div class="sub">龙门边境医疗站</div>
      <div class="tb">
        ${row('姓名', 'health.name', d.name)}${row('检查日期', 'health.date', fmtDate(d.date))}
        <div class="dr"><span class="dl">融合率</span><span class="f" data-f="health.fusion">${E(d.fusion)}%</span>${pix(ICON.crystal, { X: '#7a3a12', o: '#f0922e', O: '#ffe0a0' }, 2, 'px ic')}</div>
        ${row('结晶密度', 'health.density', `${d.density}u/L`)}
        ${row('结论', 'health.status', d.status, inf ? 'st inf' : 'st ok')}
      </div>
    </div>`;
  }

  function guar(d) {
    const two = String(d.company).slice(0, 2);
    return `<div class="dx dx-guar">
      <div class="lh">${pix(ICON.house, { X: '#5a3d1e', o: '#e8d2a4' })}<span class="f" data-f="guar.company">${E(d.company)}</span></div>
      <div class="ttl">担 保 函</div>
      ${row('被担保人', 'guar.name', d.name)}
      <div class="txt">本公司愿为其在龙门期间的一切行为担保。</div>
      ${row('有效期至', 'guar.expiry', fmtDate(d.expiry))}
      <div class="sg"><span>负责人</span>${signature(d.company)}</div>
      <div class="seal">${E(two)}<br>公章</div>
    </div>`;
  }

  function rhodes(d) {
    const no = String(hash(`${d.code}|${d.name}`) % 100000).padStart(5, '0');
    return `<div class="dx dx-rhodes"><div class="rs"></div><div class="rc">
      <div class="ry"></div>
      <div class="dh">${pix(ICON.rhodes, { X: '#f2f2ef' })}<span class="dt">RHODES ISLAND</span></div>
      <div class="sub">罗德岛制药 · 干员证</div>
      ${row('代号', 'rhodes.code', d.code, 'cd')}${row('姓名', 'rhodes.name', d.name)}${row('有效期至', 'rhodes.expiry', fmtDate(d.expiry))}
      <div class="bc">${barcode(d.code + d.name)}<span>RI-${no}</span></div>
    </div></div>`;
  }

  const MAKERS = { id: idCard, permit, health, guar, rhodes };
  window.DOCS = { html: (kind, d) => (MAKERS[kind] && d ? MAKERS[kind](d) : '') };
})();
