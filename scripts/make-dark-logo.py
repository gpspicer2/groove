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
    # The bike wheel (an ellipse, centre (487.5, 116), radii 89.5 x 97): its thin spokes would be
    # lost by the clean-up below, so they are kept as-is and always colored the wheel's blue.
    yy, xx = np.mgrid[0:alpha.shape[0], 0:alpha.shape[1]]
    wheel = ((xx - 487.5) / 93.0) ** 2 + ((yy - 116.0) / 100.5) ** 2 < 1
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
    mask = np.where(wheel, alpha > 0.5, mask)
    colors = np.array([p[1] for p in PALETTE], dtype=float)
    out_rgb = colors[nearest]
    out_rgb[wheel] = np.array(PALETTE[2][1], dtype=float)
    # Outside the letters (glow and soft edges) take the color of the nearest
    # letter pixel instead of whatever palette color happens to be closest.
    # Edge pixels are noisy, so colors are taken from each shape's solid interior.
    interior = ndimage.binary_erosion(mask, iterations=2)
    if interior.any():
        idx = ndimage.distance_transform_edt(~interior, return_distances=False, return_indices=True)
        keep_wheel = wheel.copy()
        out_rgb = np.where(keep_wheel[..., None], out_rgb, out_rgb[idx[0], idx[1]])
    # Built at 2x so phones (which show the logo at 2-3x pixel density) get smooth edges instead of
    # the stair-steps of a small, hard-edged mask: the mask is enlarged, softened, then re-sharpened
    # with a narrow smoothstep, which rounds the staircase into a clean anti-aliased contour.
    Z = 2
    def up(arr, order=3):
        return ndimage.zoom(arr, (Z, Z) + (1,) * (arr.ndim - 2), order=order, mode='nearest')
    big = np.clip(up(ndimage.gaussian_filter(mask.astype(float), 0.5)), 0, 1)
    big = ndimage.gaussian_filter(big, 3.0)
    t = np.clip((big - 0.5) / 0.22 + 0.5, 0, 1)
    soft_big = t * t * (3 - 2 * t)
    wheel_big = np.kron(wheel, np.ones((Z, Z), dtype=bool))
    alpha_big = np.clip(up(alpha), 0, 1)
    # the wheel's rim gets the same clean edge; its thin spokes and hub keep their own softness
    # (the rim is what survives an opening that is wider than a spoke)
    solid = alpha > 0.5
    rim_only = wheel & ndimage.binary_opening(solid, structure=np.ones((5, 5))) & (((xx - 487.5) / 55.0) ** 2 + ((yy - 116.0) / 60.0) ** 2 > 1)
    rim_big = np.clip(up(ndimage.gaussian_filter(rim_only.astype(float), 0.5)), 0, 1)
    rim_big = ndimage.gaussian_filter(rim_big, 3.0)
    rt = np.clip((rim_big - 0.5) / 0.22 + 0.5, 0, 1)
    rim_big = rt * rt * (3 - 2 * rt)
    far_from_rim = ~np.kron(ndimage.binary_dilation(rim_only, iterations=2), np.ones((Z, Z), dtype=bool))
    soft_big = np.where(wheel_big, np.maximum(rim_big, alpha_big * far_from_rim), soft_big)
    rgb_big = np.clip(up(out_rgb, order=0), 0, 255)
    core = Image.fromarray(np.dstack([rgb_big, soft_big * 255]).astype(np.uint8), 'RGBA')
    if not glow:
        core.save(PUBLIC + out)
        return
    mask_big = (soft_big > 0.5) & ~wheel_big | (wheel_big & (alpha_big > 0.5))
    canvas = Image.new('RGBA', core.size, (0, 0, 0, 0))
    wide = Image.fromarray(np.dstack([rgb_big, ndimage.gaussian_filter(mask_big.astype(float), 4 * Z) * 255 * 0.16]).astype(np.uint8), 'RGBA')
    tight = Image.fromarray(np.dstack([rgb_big, ndimage.gaussian_filter(mask_big.astype(float), 1.2 * Z) * 255 * 0.22]).astype(np.uint8), 'RGBA')
    inner_wheel = np.kron(((xx - 487.5) / 76.0) ** 2 + ((yy - 116.0) / 83.0) ** 2 < 1, np.ones((Z, Z), dtype=bool))
    for glow_img in (wide, tight):
        arr = np.array(glow_img); arr[inner_wheel, 3] = 0
        canvas.alpha_composite(Image.fromarray(arr, 'RGBA'))
    canvas.alpha_composite(core)
    canvas.save(PUBLIC + out)


neon('wordmark.png', 'wordmark-dark.png')
neon('wordmark-still.png', 'wordmark-still-dark.png')
neon('wordmark-runner.png', 'wordmark-runner-dark.png', glow=False)
