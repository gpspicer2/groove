"""Sharpens the G in the light logo artwork (public/wordmark.png and
wordmark-still.png). The original G had soft, fuzzy edges next to the crisp
sun, wheel and V. The G is one flat color, so its edge is rebuilt: the
edge is upscaled, smoothed, snapped hard, and averaged back down, which gives a clean
one-pixel anti-aliased outline. Run it on the original artwork (git history has it), not on an already processed file. Needs pillow, numpy and
scipy. Run from the repo root, then run scripts/make-dark-logo.py:
    python3 scripts/crisp-logo-g.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage

G_COLOR = np.array([68, 51, 73], dtype=float)
G_RIGHT = 197     # the G touches the wheel at x~200; leave the last few columns alone
CONTEXT = 8       # extra columns read (not changed) so the edge there stays continuous
UP = 4
THIN = 1.6        # shave this many pixels off the G's stroke (everywhere), so it reads as crisp as the other letters

def crisp(path):
    """Run on the ORIGINAL artwork (not on an already processed file)."""
    im = Image.open(path).convert('RGBA')
    a = np.array(im).astype(float)
    cols = G_RIGHT + CONTEXT
    region = a[:, :cols]
    alpha = Image.fromarray(region[..., 3].astype(np.uint8))
    big = np.array(alpha.resize((alpha.width * UP, alpha.height * UP), Image.BICUBIC)).astype(float) / 255.0
    big = ndimage.gaussian_filter(big, 3.0)                              # smooth the noisy outline first
    solid = big > 0.5
    # shave the stroke: erode by THIN pixels (in original pixel units), then re-smooth for a clean edge
    dist = ndimage.distance_transform_edt(np.pad(solid, 1, constant_values=True))[1:-1, 1:-1]
    shaved = np.clip((dist - THIN * UP) / 1.5 + 0.5, 0, 1)
    shaved = np.where(solid, shaved, 0)
    small = np.array(Image.fromarray((shaved * 255).astype(np.uint8)).resize(alpha.size, Image.BOX)).astype(float)
    out = a.copy()
    out[:, :G_RIGHT, 3] = small[:, :G_RIGHT]
    covered = small[:, :G_RIGHT] > 0
    out[:, :G_RIGHT, :3] = np.where(covered[..., None], G_COLOR, region[:, :G_RIGHT, :3])   # flat color, no fringe
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(path, optimize=True)
    print('sharpened and thinned G in', path)

for name in ('wordmark.png', 'wordmark-still.png'):
    crisp('public/' + name)
