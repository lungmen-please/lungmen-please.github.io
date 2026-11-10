"""把 Fusion Pixel 12px 字体裁成只含游戏用到的字符，输出 px.ttf。

用法（在仓库任意位置运行均可）：
    pip install fonttools brotli
    python tools/subset_font.py [源字体路径]

会扫描仓库里所有 .js / .html / .css 文件里出现的字符，外加 ASCII 和常用中文标点。
改了游戏文字后重新运行一次即可。
"""
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = pathlib.Path(__file__).resolve().parent
GAME = HERE.parent
DEFAULT_SRC = HERE / "fonts" / "fusion-pixel-12px-zh_hans.ttf"
OUT = GAME / "px.ttf"

PUNCT = "，。、；：？！…—～·“”‘’（）《》〈〉【】「」『』〔〕％＋－×÷＝／＜＞０１２３４５６７８９　·•→←↑↓★☆○●□■◇◆△▲▽▼✓✗"


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    if not src.exists():
        sys.exit(f"找不到源字体：{src}")
    chars = set(chr(c) for c in range(0x20, 0x7F)) | set(PUNCT)
    for p in sorted(GAME.rglob("*")):
        if p.suffix in (".js", ".html", ".css") and not ({"tools", ".git", "node_modules"} & set(p.relative_to(GAME).parts)):
            chars |= set(p.read_text(encoding="utf-8"))
    chars = {c for c in chars if c.isprintable() or c == "　"}

    font = TTFont(src)
    cmap = font.getBestCmap()
    have = {c for c in chars if ord(c) in cmap}
    missing = sorted(c for c in chars - have if ord(c) > 0x7F)

    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[ord(c) for c in have])
    sub.subset(font)
    font.save(OUT)
    print(f"{OUT.name}: {len(have)} 个字符, {OUT.stat().st_size // 1024} KB")
    # 网页优先加载 woff2（体积约一半），px.ttf 留作后备
    try:
        import brotli  # noqa: F401
        font.flavor = "woff2"
        w2 = OUT.with_suffix(".woff2")
        font.save(w2)
        print(f"{w2.name}: {w2.stat().st_size // 1024} KB")
    except ImportError:
        print("没装 brotli，跳过 px.woff2（pip install brotli）")
    if missing:
        print("字体里没有这些字符（会用后备字体显示）：", "".join(missing))


if __name__ == "__main__":
    main()
