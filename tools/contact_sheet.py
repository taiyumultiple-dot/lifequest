# -*- coding: utf-8 -*-
"""把一堆分鏡素材拼成一張聯絡表（contact sheet），方便一次看完並挑圖。

用法：
    python tools/contact_sheet.py <來源資料夾> <輸出png> [每張最多幾格]

每一格左上角會標上編號，編號對應印出來的檔名清單，挑好圖之後
把檔名填進 tools/art_manifest.json 即可。
"""
import os
import sys

from PIL import Image, ImageDraw

EXT = (".png", ".jpg", ".jpeg", ".webp")
CELL = 320          # 每格邊長
COLS = 5            # 每列幾格
PAD = 6


def collect(root):
    """遞迴收集圖片，回傳 [(顯示名稱, 完整路徑)]，依資料夾與檔名排序。"""
    items = []
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in sorted(filenames):
            if fn.lower().endswith(EXT):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root)
                items.append((rel, full))
    items.sort(key=lambda t: t[0])
    return items


def build(items, out_path, base=0):
    rows = (len(items) + COLS - 1) // COLS
    w = COLS * (CELL + PAD) + PAD
    h = rows * (CELL + PAD) + PAD
    sheet = Image.new("RGB", (w, h), (24, 26, 32))
    draw = ImageDraw.Draw(sheet)

    for i, (rel, full) in enumerate(items):
        try:
            im = Image.open(full).convert("RGB")
        except Exception:
            continue
        im.thumbnail((CELL, CELL), Image.LANCZOS)
        cx = PAD + (i % COLS) * (CELL + PAD)
        cy = PAD + (i // COLS) * (CELL + PAD)
        # 置中貼入格子
        sheet.paste(im, (cx + (CELL - im.size[0]) // 2, cy + (CELL - im.size[1]) // 2))
        # 左上角編號（畫個底色方塊，數字才看得見）
        label = str(base + i)
        draw.rectangle([cx, cy, cx + 14 + 9 * len(label), cy + 22], fill=(0, 0, 0))
        draw.text((cx + 6, cy + 5), label, fill=(255, 214, 120))

    sheet.save(out_path, "PNG", optimize=True)
    return sheet.size


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    root, out = sys.argv[1], sys.argv[2]
    start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    count = int(sys.argv[4]) if len(sys.argv) > 4 else 0

    items = collect(root)
    items = items[start:start + count] if count else items[start:]
    if not items:
        print("找不到圖片:", root)
        return 1

    size = build(items, out, base=start)
    print("聯絡表:", out, size, "共 %d 張（編號 %d 起）" % (len(items), start))
    return 0


if __name__ == "__main__":
    sys.exit(main())
