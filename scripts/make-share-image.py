# Makes public/og-image.png: the picture that shows in a link preview (iMessage, WhatsApp, Facebook...) when someone
# shares the Groove link. Run: python3 scripts/make-share-image.py   (needs pillow; uses the Outfit font if installed)
from PIL import Image, ImageDraw, ImageFont
import glob

W, H = 1200, 630
BG = (239, 230, 214)       # --c-ink, the app's sand
TEXT = (62, 50, 40)
SOFT = (125, 108, 92)

def font(size):
    # Any installed Outfit file will do (fall back to a plain font so the script still runs elsewhere).
    for p in sorted(glob.glob('/root/.fonts/*.ttf') + glob.glob('/usr/share/fonts/**/*.ttf', recursive=True)):
        try:
            f = ImageFont.truetype(p, size)
        except Exception:
            continue
        if f.getname()[0] == 'Outfit':
            return f
    return ImageFont.load_default(size)

img = Image.new('RGB', (W, H), BG)
logo = Image.open('public/wordmark.png').convert('RGBA')
lw = 940
logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
img.paste(logo, ((W - lw) // 2, 130), logo)

d = ImageDraw.Draw(img)
def centered(text, y, f, fill):
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)

centered('Movement mentorship and education', 370, font(58), TEXT)
centered('Find movement you will keep doing', 450, font(38), SOFT)
img.save('public/og-image.png', optimize=True)
print('saved', img.size)
