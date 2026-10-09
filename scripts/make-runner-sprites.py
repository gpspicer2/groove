"""Renders the runner's stride as a vertical strip of frames
(public/runner-sprites.png and runner-sprites-dark.png).

Wordmark.jsx flips through these frames with plain CSS (no transforms on SVG
parts, nothing browser-specific). The pose is traced to match
public/wordmark-runner.png; joints bend with the same keyframes the old SVG
version used. Needs pillow only. Run from the repo root:  python3 scripts/make-runner-sprites.py
"""
import math
from PIL import Image, ImageDraw

W, H = 186, 231          # the runner image's own pixels
N = 12                   # frames per stride cycle
SS = 3                   # supersampling for smooth edges
OUT = 2                  # output pixels per runner pixel
MX, MY = 70, 40          # margin around the runner box (limbs swing outside it)
FW, FH = W + 2 * MX, H + 2 * MY
COLORS = {'': (96, 106, 66), '-dark': (150, 255, 90)}

HIP = (82, 140); KNEE_B = (48, 177); ANKLE_B = (21, 211)
KNEE_F = (127, 158); ANKLE_F = (127, 209); TOE_F = (153, 211)
SH_B = (86, 64); SH_F = (110, 72)

def rot(p, c, deg):
    a = math.radians(deg); dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))

def smooth(keys, t):
    """keys: list of (t, value) sorted; cosine ease between neighbours."""
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            u = (t - t0) / (t1 - t0); u = (1 - math.cos(math.pi * u)) / 2
            return v0 + (v1 - v0) * u
    return keys[-1][1]

def K(a, b, c, d, e): return [(0, a), (.25, b), (.5, c), (.75, d), (1, e)]
THIGH_B = K(0, -55, -110, -55, 0); SHIN_B = K(0, 37, 72, -30, 0)
THIGH_F = K(0, 55, 110, 55, 0);    SHIN_F = K(0, -30, -72, 37, 0)
ARM_B = K(0, -21, -42, -21, 0);    ARM_F = K(0, 20, 40, 20, 0)
BOB = K(0, -9, 0, -9, 0);          LEAN = K(2, 4, 2, 4, 2)

def frame(color, t):
    img = Image.new('RGBA', (FW * SS, FH * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    ox, oy = MX, MY
    bob = smooth(BOB, t); lean = smooth(LEAN, t)
    def tf(p):  # lean about the hip, then bob, then into the frame
        q = rot(p, HIP, lean)
        return ((q[0] + ox) * SS, (q[1] + bob + oy) * SS)
    def line(pts, w):
        P = [tf(p) for p in pts]; r = w * SS / 2
        for a, b in zip(P, P[1:]): d.line([a, b], fill=color, width=int(w * SS))
        for x, y in P: d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    def poly(pts): d.polygon([tf(p) for p in pts], fill=color)
    cx, cy = tf((119, 28.5)); r = 22 * SS; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    poly([(96, 62), (122, 64), (143, 104), (136, 116), (104, 100)])
    line([(99, 70), (80, 128)], 36); line([(53, 63), (118, 63)], 19)
    ab = smooth(ARM_B, t); af = smooth(ARM_F, t)
    line([rot(p, SH_B, ab) for p in [(86, 64), (47, 67), (32, 95)]], 17)
    line([rot(p, SH_F, af) for p in [(110, 72), (138, 112), (169, 87)]], 19)
    # back leg
    tb = smooth(THIGH_B, t); sb = smooth(SHIN_B, t)
    knee_b = rot(KNEE_B, HIP, tb); ankle_b = rot(rot(ANKLE_B, KNEE_B, sb), HIP, tb)
    line([HIP, knee_b], 25); line([knee_b, ankle_b], 25)
    # front leg (shin and foot swing from the knee)
    tf_ = smooth(THIGH_F, t); sf = smooth(SHIN_F, t)
    knee_f = rot(KNEE_F, HIP, tf_)
    ankle_f = rot(rot(ANKLE_F, KNEE_F, sf), HIP, tf_); toe_f = rot(rot(TOE_F, KNEE_F, sf), HIP, tf_)
    line([HIP, knee_f], 24); line([knee_f, ankle_f, toe_f], 24)
    return img.resize((FW * OUT, FH * OUT), Image.LANCZOS)

for sfx, color in COLORS.items():
    sheet = Image.new('RGBA', (FW * OUT, FH * OUT * N), (0, 0, 0, 0))
    for i in range(N):
        sheet.paste(frame(color + (255,), i / N), (0, i * FH * OUT))
    path = f'public/runner-sprites{sfx}.png'
    sheet.save(path, optimize=True); print(path, sheet.size)
print('frame box', FW, FH, 'margins', MX, MY)
