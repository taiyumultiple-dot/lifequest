# -*- coding: utf-8 -*-
"""把分鏡素材轉成網頁能用的尺寸，輸出到 assets/scenes/。

用法（在 lifequest 資料夾底下執行）：
    python tools/build_assets.py

要用哪些圖、叫什麼名字，全部寫在 tools/art_manifest.json，
改那個檔就好，不用動這支程式。

原始分鏡圖一張常常 2~4MB，直接放上網頁會很慢；
這裡統一縮到最寬 1280px 並轉成 JPEG，一張大概 100~250KB。
已經轉好的檔會跳過，中斷可以直接重跑；要重轉某一張，把輸出的 jpg 刪掉即可。
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))       # lifequest/
MATERIALS = os.path.dirname(os.path.dirname(HERE))                       # 07宛容(電腦)/
MANIFEST = os.path.join(HERE, "tools", "art_manifest.json")


def load_manifest():
    with open(MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)


def convert(src_path, dst_path, max_width, quality):
    im = Image.open(src_path)
    # 有些素材帶 alpha，貼到黑底再存 JPEG，避免透明處變成純白
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (10, 14, 24))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")

    if im.size[0] > max_width:
        h = int(im.size[1] * max_width / float(im.size[0]))
        im = im.resize((max_width, h), Image.LANCZOS)

    # 用 WebP：同畫質下大約只有 JPEG 的三分之一，手機在教室裡載入快很多
    im.save(dst_path, "WEBP", quality=quality, method=6)
    return im.size, os.path.getsize(dst_path)


def main():
    mf = load_manifest()
    out_dir = os.path.join(HERE, *mf["output"].split("/"))
    os.makedirs(out_dir, exist_ok=True)

    max_width = mf.get("maxWidth", 1280)
    quality = mf.get("quality", 82)
    sources = mf["sources"]

    done = skipped = missing = 0
    total_bytes = 0

    for entry in mf["images"]:
        dst = os.path.join(out_dir, entry["id"] + ".webp")
        if os.path.exists(dst):
            skipped += 1
            total_bytes += os.path.getsize(dst)
            continue

        root = os.path.join(MATERIALS, *sources[entry["src"]].split("/"))
        src = os.path.join(root, *entry["file"].split("/"))
        if not os.path.exists(src):
            print("  ✗ 找不到來源:", entry["id"], "->", entry["file"])
            missing += 1
            continue

        size, nbytes = convert(src, dst, max_width, quality)
        total_bytes += nbytes
        done += 1
        print("  ✓ %-16s %4dx%-4d %6.0f KB  %s"
              % (entry["id"], size[0], size[1], nbytes / 1024.0, entry.get("note", "")))

    print("\n新轉 %d 張、跳過 %d 張、缺 %d 張；scenes 總大小 %.1f MB"
          % (done, skipped, missing, total_bytes / 1024.0 / 1024.0))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
