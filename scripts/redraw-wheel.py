"""Redraws the bike wheel's spokes in the light logo artwork (public/wordmark.png
and wordmark-still.png) so it reads as a bicycle, not a wagon: many thin spokes
that cross each other (laced from a small hub to the rim) instead of 12 straight
radial ones and a big hub. The rim is untouched. Safe to run more than once.
Needs pillow and numpy. Run from the repo root, then scripts/make-dark-logo.py:
    python3 scripts/redraw-wheel.py
"""
import math
import numpy as np
from PIL import Image, ImageDraw

# The wheel is a slightly tall ellipse in the artwork (pixels of the 1135 px wide image).
CX, CY = 487.5, 116.0
OUT_RX, OUT_RY = 89.5, 97.0
RIM = 15.5                    # rim thickness
IN_RX, IN_RY = OUT_RX - RIM, OUT_RY - RIM
NAVY = (28, 62, 84)
SPOKES = 32                   # a real wheel has 32-36
FLANGE = 7.5                  # spokes start on a small circle around the hub
CROSS_DEG = 22                # how far around the rim each spoke lands: a gentle lean so spokes cross, like a laced wheel
SPOKE_W = 1.5
HUB_R = 5.5
SS = 4

def redraw(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    inside = ((xx - CX) / (IN_RX - 0.5)) ** 2 + ((yy - CY) / (IN_RY - 0.5)) ** 2 < 1
    # clear the old spokes and hub (navy-ish pixels inside the rim), leaving anything else alone
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    navyish = (abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2]) < 110) & (a[..., 3] > 0)
    a[inside & navyish] = 0
    # draw the new spokes and hub, supersampled
    box = (int(CX - OUT_RX - 4), int(CY - OUT_RY - 4), int(CX + OUT_RX + 4), int(CY + OUT_RY + 4))
    bw, bh = box[2] - box[0], box[3] - box[1]
    layer = Image.new('L', (bw * SS, bh * SS), 0)
    d = ImageDraw.Draw(layer)
    ox, oy = CX - box[0], CY - box[1]
    for i in range(SPOKES):
        phi = 2 * math.pi * i / SPOKES
        sgn = 1 if i % 2 == 0 else -1                        # alternate leading and trailing spokes
        theta = phi + sgn * math.radians(CROSS_DEG)
        x0, y0 = ox + FLANGE * math.cos(phi), oy + FLANGE * math.sin(phi)
        x1 = ox + (IN_RX + 1.0) * math.cos(theta); y1 = oy + (IN_RY + 1.0) * math.sin(theta)
        d.line([(x0 * SS, y0 * SS), (x1 * SS, y1 * SS)], fill=255, width=int(round(SPOKE_W * SS)))
    d.ellipse([(ox - HUB_R) * SS, (oy - HUB_R) * SS, (ox + HUB_R) * SS, (oy + HUB_R) * SS], fill=255)
    cover = np.array(layer.resize((bw, bh), Image.BOX)).astype(float) / 255.0
    # keep the spokes inside the rim only
    sub_in = inside[box[1]:box[3], box[0]:box[2]]
    cover = cover * sub_in
    spoke = np.zeros((bh, bw, 4)); spoke[..., 0], spoke[..., 1], spoke[..., 2] = NAVY; spoke[..., 3] = cover * 255
    region = a[box[1]:box[3], box[0]:box[2]].astype(float)
    # "over" composite of the spokes onto what is there (nothing, inside the rim)
    ca = spoke[..., 3:4] / 255.0; ba = region[..., 3:4] / 255.0
    oa = ca + ba * (1 - ca)
    ocol = np.where(oa > 0, (spoke[..., :3] * ca + region[..., :3] * ba * (1 - ca)) / np.maximum(oa, 1e-6), 0)
    a[box[1]:box[3], box[0]:box[2]] = np.dstack([ocol, oa * 255]).astype(np.uint8)
    Image.fromarray(a, 'RGBA').save(path, optimize=True)
    print('redrew wheel spokes in', path)

for name in ('wordmark.png', 'wordmark-still.png'):
    redraw('public/' + name)
