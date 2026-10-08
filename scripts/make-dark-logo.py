"""Builds the neon dark-mode logo images from the light artwork.

    pip install pillow numpy scipy
    python3 scripts/make-dark-logo.py

Reads public/wordmark.png, wordmark-still.png, wordmark-runner.png and writes
-dark versions next to them. Each letter is snapped to its brand color (which
also drops the pale halo and speckle left from the light background), recolored
neon, and given a soft matching glow (not on the runner pieces, which animate).
"""
import numpy as np
from PIL import Image
from scipy import ndimage

PUBLIC = 'public/'
CREAM = np.array([239, 230, 214], dtype=float)
# light-mode artwork color -> neon replacement
PALETTE = [
    ((72, 50, 82), (196, 118, 255)),    # plum G
    ((104, 124, 62), (150, 255, 90)),   # olive runner
    ((28, 62, 84), (70, 170, 255)),     # navy wheel
    ((236, 158, 42), (255, 196, 40)),   # amber sun
    ((196, 70, 36), (255, 98, 64)),     # rust V
    ((92, 160, 166), (60, 240, 228)),   # teal E
]


def neon(path, out, glow=True):
    im = Image.open(PUBLIC + path).convert('RGBA')
    a = np.asarray(im).astype(float)
    alpha = a[..., 3] / 255.0
    rgb = a[..., :3] * alpha[..., None] + CREAM * (1 - alpha[..., None])  # as seen on the light page
    centers = np.array([p[0] for p in PALETTE], dtype=float)
    dist = np.linalg.norm(rgb[:, :, None, :] - centers[None, None], axis=-1)
    nearest = dist.argmin(-1)
    near_color = dist.min(-1)
    to_cream = np.linalg.norm(rgb - CREAM, axis=-1)
    # Pixels closer to the page color than to any brand color are background.
    mask = (to_cream > near_color * 0.9) & (to_cream > 45) & (alpha > 0.05)
    mask = ndimage.binary_opening(mask, structure=np.ones((2, 2)))
    labels, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, labels, range(1, n + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= 60])
        mask = keep
    colors = np.array([p[1] for p in PALETTE], dtype=float)
    out_rgb = colors[nearest]
    # Outside the letters (glow and soft edges) take the color of the nearest
    # letter pixel instead of whatever palette color happens to be closest.
    # Edge pixels are noisy, so colors are taken from each shape's solid interior.
    interior = ndimage.binary_erosion(mask, iterations=2)
    if interior.any():
        idx = ndimage.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        out_rgb = out_rgb[idx[0], idx[1]]
    soft = ndimage.gaussian_filter(mask.astype(float), 0.4)  # anti-aliased edge
    layer = np.dstack([out_rgb, soft * 255]).astype(np.uint8)
    core = Image.fromarray(layer, 'RGBA')
    if not glow:
        core.save(PUBLIC + out)
        return
    pad = 14
    canvas = Image.new('RGBA', (core.width, core.height), (0, 0, 0, 0))
    wide = Image.fromarray(np.dstack([out_rgb, ndimage.gaussian_filter(mask.astype(float), 4) * 255 * 0.35]).astype(np.uint8), 'RGBA')
    tight = Image.fromarray(np.dstack([out_rgb, ndimage.gaussian_filter(mask.astype(float), 1.6) * 255 * 0.45]).astype(np.uint8), 'RGBA')
    canvas.alpha_composite(wide)
    canvas.alpha_composite(tight)
    canvas.alpha_composite(core)
    canvas.save(PUBLIC + out)


neon('wordmark.png', 'wordmark-dark.png')
neon('wordmark-still.png', 'wordmark-still-dark.png')
neon('wordmark-runner.png', 'wordmark-runner-dark.png', glow=False)
