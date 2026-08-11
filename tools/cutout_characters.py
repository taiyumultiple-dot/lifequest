# -*- coding: utf-8 -*-
"""角色去背：把白底的角色立繪轉成透明背景 PNG，並額外輸出圓形頭像。

用法（在 lifequest 資料夾底下執行）：
    python tools/cutout_characters.py

作法說明（給之後要維護的人）：
    不是「把所有白色都變透明」——那樣會把白襯衫、白瀏海反光一起吃掉。
    這裡用的是「從四個邊界往內漫延（flood fill）」：只有跟畫布邊緣相連的
    白色才算背景。角色身上被線稿包住的白色因為連不到邊緣，會被完整保留。

    邊緣再做一次羽化（把半透明的過渡帶算出來），髮絲才不會有白邊。

已存在的輸出檔會跳過，所以中斷可以直接重跑；要重做某一張，把輸出的 png 刪掉即可。
"""
import os
import sys
from collections import deque

from PIL import Image, ImageDraw, ImageFilter

# ---- 路徑設定 ---------------------------------------------------------------

# lifequest 專案根目錄
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 素材總目錄（lifequest 的上上層，也就是「07宛容(電腦)」）
MATERIALS = os.path.dirname(os.path.dirname(HERE))

# 角色立繪來源資料夾
SRC_DIR = os.path.join(
    MATERIALS, "0717生命教育", "0717生命教育 章首動畫影片 教材課本", "人物",
)

# 輸出到網站的 assets
OUT_DIR = os.path.join(HERE, "assets", "characters")

# 檔名對照：來源檔名 -> 輸出用的英文代號
CHARACTERS = {
    "陳可華.png": "kehua",       # 主角，班長
    "王小文.png": "xiaowen",     # 引路人，博士
    "王博鈞.png": "bojun",       # 好麻吉，籃球隊長
    "張曉萍.png": "xiaoping",    # 好友
    "可華爸爸.png": "dad",       # 父親
    "可華爺爺.png": "grandpa",   # 祖父
}

# 立繪最長邊縮到這個大小（原圖 1000~2000px，網頁用不到那麼大）
PORTRAIT_MAX = 900
# 圓形頭像尺寸
AVATAR_SIZE = 256

# 背景判定：亮度高於這個值、且彩度很低，才算「白背景」
BG_LUMA = 236
BG_CHROMA = 18


def is_background(px):
    """判斷一個像素是不是白底背景（夠亮且夠沒有顏色）。"""
    r, g, b = px[0], px[1], px[2]
    if r < BG_LUMA or g < BG_LUMA or b < BG_LUMA:
        return False
    return (max(r, g, b) - min(r, g, b)) <= BG_CHROMA


def build_alpha(img):
    """從四邊 flood fill，回傳一張 L 模式的 alpha 遮罩（255 保留、0 透明）。"""
    w, h = img.size
    px = img.load()

    # visited 用 bytearray 存，比 set 省記憶體也快得多
    bg = bytearray(w * h)
    q = deque()

    def push(x, y):
        i = y * w + x
        if bg[i]:
            return
        if not is_background(px[x, y]):
            return
        bg[i] = 1
        q.append((x, y))

    # 種子：上、左、右三邊，**故意不含最底下那一列**。
    # 這些都是半身像，衣服一定是被畫布下緣切斷的；如果從底邊下種，
    # 漫延會沿著白襯衫一路往上灌，把衣服蝕出破洞。
    for x in range(w):
        push(x, 0)
    for y in range(h - 1):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        if x > 0:
            push(x - 1, y)
        if x < w - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < h - 1:
            push(x, y + 1)

    alpha = Image.new("L", (w, h), 255)
    alpha.putdata([0 if v else 255 for v in bg])
    return alpha


def feather(alpha):
    """把硬邊變成柔邊，消掉髮絲周圍的白色鋸齒。"""
    # 先往內縮一點點（讓殘留的白邊被吃掉），再模糊出過渡帶
    shrunk = alpha.filter(ImageFilter.MinFilter(3))
    return shrunk.filter(ImageFilter.GaussianBlur(0.8))


def trim(img):
    """裁掉四周多餘的透明區域，讓立繪在版面上好對齊。"""
    box = img.getbbox()
    return img.crop(box) if box else img


def fit(img, max_side):
    """等比縮到最長邊不超過 max_side。"""
    w, h = img.size
    if max(w, h) <= max_side:
        return img
    scale = max_side / float(max(w, h))
    return img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)


def make_avatar(portrait):
    """從立繪上半部裁一個正方形，做成圓形頭像。"""
    w, h = portrait.size
    # 臉大致在上方，取寬度為邊長的正方形，從頂端往下一小段開始
    side = min(w, h)
    top = int(h * 0.02)
    if top + side > h:
        top = max(0, h - side)
    left = (w - side) // 2
    face = portrait.crop((left, top, left + side, top + side))
    face = face.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)

    # 圓形遮罩（4 倍超取樣後再縮，邊緣才平滑）
    mask = Image.new("L", (AVATAR_SIZE * 4, AVATAR_SIZE * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, AVATAR_SIZE * 4 - 1, AVATAR_SIZE * 4 - 1), fill=255)
    mask = mask.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)

    out = Image.new("RGBA", (AVATAR_SIZE, AVATAR_SIZE), (0, 0, 0, 0))
    out.paste(face, (0, 0))
    # 和原本的 alpha 相乘，避免把去背掉的地方又補回來
    combined = Image.new("L", (AVATAR_SIZE, AVATAR_SIZE), 0)
    combined.putdata([min(a, b) for a, b in zip(out.getchannel("A").getdata(), mask.getdata())])
    out.putalpha(combined)
    return out


def save(img, path):
    """存成帶透明度的 WebP。同樣畫質下大約是 PNG 的十分之一，手機載入快很多。"""
    img.save(path, "WEBP", quality=88, method=6)


def process(src_name, key):
    src = os.path.join(SRC_DIR, src_name)
    portrait_out = os.path.join(OUT_DIR, key + ".webp")
    avatar_out = os.path.join(OUT_DIR, key + "-avatar.webp")

    if os.path.exists(portrait_out) and os.path.exists(avatar_out):
        print("  跳過（已存在）:", key)
        return True
    if not os.path.exists(src):
        print("  找不到來源:", src)
        return False

    img = Image.open(src).convert("RGB")
    alpha = feather(build_alpha(img))

    rgba = img.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = fit(trim(rgba), PORTRAIT_MAX)

    save(rgba, portrait_out)
    save(make_avatar(rgba), avatar_out)

    print("  完成: %-9s 立繪 %sx%s" % (key, rgba.size[0], rgba.size[1]))
    return True


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("來源:", SRC_DIR)
    print("輸出:", OUT_DIR)
    ok = 0
    for src_name, key in CHARACTERS.items():
        if process(src_name, key):
            ok += 1
    print("\n共處理 %d / %d 位角色。" % (ok, len(CHARACTERS)))
    return 0 if ok == len(CHARACTERS) else 1


if __name__ == "__main__":
    sys.exit(main())
