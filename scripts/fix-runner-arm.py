"""Redraws the running man's back arm in the LIGHT runner picture (public/wordmark-runner.png).

The artwork's back arm is a slab (flat shoulder pad plus a shelf where it meets the torso) that reads
as a dislocated shoulder. This erases it and draws one straight round-ended limb hanging from the
shoulder, blended into the torso, with a clean anti-aliased edge. The dark picture gets the same
arm from make-dark-logo.py. Reads the original runner from scripts/art/, then run
make-dark-logo.py and make-runner-sprites.py:
    pip install pillow numpy scipy
    python3 scripts/fix-runner-arm.py
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = 'scripts/art/wordmark-runner-orig.png'   # the original 186x231 runner artwork
PATH = 'public/wordmark-runner.png'
im = Image.open(SRC).convert('RGBA')
W, H = im.size
a = np.asarray(im).astype(float)
solid = a[..., 3] > 127
Z = 4


def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(x / 4, y / 4) for x, y in pts], fill=255)
    return np.asarray(m) > 0


solid &= ~poly([(80, 190), (318, 190), (318, 296), (300, 352), (270, 420), (80, 420)])
SX, SY, HX, HY, R = 276, 268, 150, 378, 34
for (x, y) in ((SX, SY), (HX, HY)):
    solid |= poly([(x + R * math.cos(t), y + R * math.sin(t)) for t in np.linspace(0, 6.2832, 40)])
d = math.hypot(SX - HX, SY - HY); nx, ny = -(SY - HY) / d * R, (SX - HX) / d * R
solid |= poly([(HX + nx, HY + ny), (SX + nx, SY + ny), (SX - nx, SY - ny), (HX - nx, HY - ny)])
solid |= poly([(SX, SY - R + 2), (322, 221), (330, 300), (SX + 40, SY + 40)])
# shave the little hump on the shoulder line
ys, xs = np.mgrid[0:H, 0:W]
solid &= ~((xs >= 50) & (xs <= 112) & (ys < 54.0 + (xs - 54) / 56.0) & (ys > 51))

big = np.clip(ndimage.zoom(ndimage.gaussian_filter(solid.astype(float), 0.5), Z, order=3), 0, 1)
big = ndimage.gaussian_filter(big, 9.5)
t = np.clip((big - 0.5) / 0.22 + 0.5, 0, 1)
alpha = t * t * (3 - 2 * t)
color = np.array([96, 106, 66], dtype=np.uint8)
out = Image.fromarray(np.dstack([np.broadcast_to(color, (H * Z, W * Z, 3)), alpha * 255]).astype(np.uint8), 'RGBA')
out.save(PATH)
print(PATH, out.size)
# the full light logo (used by the loader) carries the runner too: swap the new one in (the runner sits at x 204-390)
logo = Image.open('public/wordmark.png').convert('RGBA')
arr = np.asarray(logo).copy()
arr[:, 200:392, 3] = 0
logo = Image.fromarray(arr, 'RGBA')
logo.alpha_composite(out.resize((W, H), Image.LANCZOS), (204, 0))
logo.save('public/wordmark.png')
