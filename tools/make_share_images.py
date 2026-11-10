"""生成 favicon.png 和分享预览图 og.png（用 art.js 现画，改了立绘后重新运行一次）。

用法：
    pip install pillow
    python tools/make_share_images.py
需要本机有 node。
"""
import json
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
GAME = HERE.parent
FONT = HERE / "fonts" / "fusion-pixel-12px-zh_hans.ttf"

JS = r"""
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8').replace(/^'use strict';/, '');
const tail = `
;(function () {
  const HAIR = { vulpo: [234, 142, 74], sarkaz: [54, 48, 70], feline: [122, 80, 58], sankta: [242, 208, 124], ursus: [142, 138, 152] };
  const app = (race, style, i) => ({ race, skin: race === 'sarkaz' ? 'pale' : 'light', hair: HAIR[race], style, eye: EYES[[1, 3, 4, 2, 5][i]], cloth: CLOTHES[[0, 6, 3, 8, 1][i]], top: ['coat', 'jacket', 'suit', 'uniform', 'hoodie'][i],
    hat: null, hatColor: CLOTHES[0], glasses: false, tie: [150, 40, 40], scale: [92, 128, 96], acc: null, badge: false });
  const list = [['vulpo', 'long'], ['sarkaz', 'messy'], ['feline', 'bob'], ['sankta', 'twin'], ['ursus', 'short']];
  globalThis.__OUT = list.map(([r, s], i) => { const M = drawPerson(app(r, s, i), { expr: i === 2 ? 'smile' : 'neutral' }); return { w: M.w, h: M.h, c: M.c }; });
})();`;
(0, eval)(src + tail);
process.stdout.write(JSON.stringify(globalThis.__OUT));
"""


def sprite(d):
    im = Image.new("RGBA", (d["w"], d["h"]), (0, 0, 0, 0))
    px = im.load()
    for i, c in enumerate(d["c"]):
        if c:
            px[i % d["w"], i // d["w"]] = (c[0], c[1], c[2], 255)
    return im


def main():
    out = subprocess.run(["node", "-e", JS, str(GAME / "art.js")], capture_output=True, text=True, check=True).stdout
    people = [sprite(d) for d in json.loads(out)]

    # favicon：菲林的脸，96x96
    fav = Image.new("RGBA", (48, 48), (43, 36, 33, 255))
    fav.alpha_composite(people[2].crop((24, 2, 72, 50)))
    fav.resize((96, 96), Image.NEAREST).save(GAME / "favicon.png")

    # og.png：1200x630
    W, H, S = 1200, 630, 4
    og = Image.new("RGBA", (W, H), (22, 19, 19, 255))
    dr = ImageDraw.Draw(og)
    for y in range(0, H, 8):
        dr.rectangle([0, y, W, y + 3], fill=(18, 15, 15, 255))
    dr.rectangle([0, 0, W, 11], fill=(232, 184, 74, 255))
    for x in range(0, W, 48):
        dr.polygon([(x, 0), (x + 24, 0), (x + 12, 11), (x - 12, 11)], fill=(27, 23, 20, 255))
    step = 204
    x0 = (W - (step * 4 + 96 * S)) // 2
    for i in range(5):  # 从左到右叠，尾巴被右边的人挡住
        og.alpha_composite(people[i].resize((96 * S, 80 * S), Image.NEAREST), (x0 + i * step, H - 80 * S))
    big, mid = ImageFont.truetype(str(FONT), 96), ImageFont.truetype(str(FONT), 36)

    def text(s, y, font, fill):
        w = dr.textlength(s, font=font)
        x = (W - w) // 2
        dr.text((x + 6, y + 6), s, font=font, fill=(0, 0, 0, 255))
        dr.text((x, y), s, font=font, fill=fill)

    text("龙门，请出示证件", 48, big, (232, 184, 74, 255))
    text("LUNGMEN, PLEASE  ·  边境检查站 · 审查员招聘中", 170, mid, (63, 167, 160, 255))
    og.convert("RGB").save(GAME / "og.png", optimize=True)
    print("favicon.png, og.png 已生成")


if __name__ == "__main__":
    main()
