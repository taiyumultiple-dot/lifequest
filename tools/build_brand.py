# -*- coding: utf-8 -*-
"""
把外部素材轉成網站要用的圖檔。

  1. 泰宇出版 LOGO —— 原檔是「黑字 + 黃色人形」，網站是深色底，
     黑字會看不見，所以把黑的部分改成站上的主文字色 (--ink #EAF2FF)，
     黃色人形保留（跟站上的金色 #E9C877 很接近，不用動）。
     另外裁一份「只有人形」的小圖，給窄螢幕的頂列用。

  2. 角色 12 星座海報 —— 縮到網頁用得到的尺寸，轉 webp。

用法：python tools/build_brand.py
來源路徑寫死在下面，換素材時改 SRC_* 就好。
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC_LOGO = r"C:\Users\User\Documents\TO詩芸：求救協助資料夾呵呵\04_搞簡報\公司LOGO\泰宇出版LOGO.png"
SRC_ZODIAC = r"C:\Users\User\Downloads\632f96e5-bb1c-4579-8ae0-efa00fb57e5b.png"

INK = (234, 242, 255)          # --ink，深色底上的主文字色

BRAND_DIR = os.path.join(ROOT, "assets", "brand")
SCENE_DIR = os.path.join(ROOT, "assets", "scenes")


def ensure(d):
    if not os.path.isdir(d):
        os.makedirs(d)


def trim(im):
    """去掉四周全透明的邊，讓圖能貼齊排版。"""
    box = im.getbbox()
    return im.crop(box) if box else im


def build_logo():
    im = Image.open(SRC_LOGO).convert("RGBA")
    px = im.load()
    w, h = im.size

    # 黑字 → 主文字色。黃色人形的 R、G 很高，不會被這個條件掃到。
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r < 130 and g < 130 and b < 130:
                px[x, y] = (INK[0], INK[1], INK[2], a)

    im = trim(im)

    # 完整的字標：給登入畫面與較寬的頂列用
    full = im.copy()
    full.thumbnail((900, 900), Image.LANCZOS)
    full.save(os.path.join(BRAND_DIR, "taiyu-logo.webp"), "WEBP", quality=92, method=6)

    # 只有人形的圖標：窄螢幕的頂列用。人形大約佔左邊 17%
    mark = im.crop((0, 0, int(im.width * 0.175), im.height))
    mark = trim(mark)
    mark.thumbnail((256, 256), Image.LANCZOS)
    mark.save(os.path.join(BRAND_DIR, "taiyu-mark.webp"), "WEBP", quality=92, method=6)

    print("logo  ", full.size, "->", "assets/brand/taiyu-logo.webp")
    print("mark  ", mark.size, "->", "assets/brand/taiyu-mark.webp")


def build_zodiac():
    im = Image.open(SRC_ZODIAC).convert("RGB")
    im.thumbnail((1000, 1000), Image.LANCZOS)
    im.save(os.path.join(SCENE_DIR, "zodiac-wheel.webp"), "WEBP", quality=86, method=6)
    print("zodiac", im.size, "->", "assets/scenes/zodiac-wheel.webp")


if __name__ == "__main__":
    ensure(BRAND_DIR)
    ensure(SCENE_DIR)
    build_logo()
    build_zodiac()
