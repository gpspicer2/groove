"""Sharpens the G in the light logo artwork (public/wordmark.png and
wordmark-still.png). The original G had soft, fuzzy edges next to the crisp
sun, wheel and V. The G is one flat color, so its edge is rebuilt: the
edge is upscaled, smoothed, snapped hard, and averaged back down, which gives a clean
one-pixel anti-aliased outline. Safe to run more than once. Needs pillow, numpy and
scipy. Run from the repo root, then run scripts/make-dark-logo.py:
    python3 scripts/crisp-logo-g.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage

G_COLOR = np.array([68, 51, 73], dtype=float)
G_RIGHT = 197     # the G touches the wheel at x~200; leave the last few columns alone
UP = 4

def crisp(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im).astype(float)
    region = a[:, :G_RIGHT]
    alpha = Image.fromarray(region[..., 3].astype(np.uint8))
    big = np.array(alpha.resize((alpha.width * UP, alpha.height * UP), Image.BICUBIC)).astype(float) / 255.0
    big = ndimage.gaussian_filter(big, 3.0)                              # smooth the noisy outline first
    snapped = np.clip((big - 0.5) * 7 + 0.5, 0, 1)                      # then a hard, clean edge
    small = np.array(Image.fromarray((snapped * 255).astype(np.uint8)).resize(alpha.size, Image.BOX)).astype(float)
    out = a.copy()
    out[:, :G_RIGHT, 3] = small
    covered = small > 0
    out[:, :G_RIGHT, :3] = np.where(covered[..., None], G_COLOR, region[..., :3])   # flat color, no fringe
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(path, optimize=True)
    print('sharpened G in', path)

for name in ('wordmark.png', 'wordmark-still.png'):
    crisp('public/' + name)
