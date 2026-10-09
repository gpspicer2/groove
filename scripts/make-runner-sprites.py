"""Renders the runner's stride as a vertical strip of frames
(public/runner-sprites.png and runner-sprites-dark.png).

The runner is drawn from round-capped limbs whose pose was fitted to match
public/wordmark-runner.png (about 93% overlap with the artwork), then bent at
the hip, knee and shoulder through a stride cycle. Wordmark.jsx flips through
the frames with plain CSS and fades to/from the real artwork at the start and
end of each stride. Needs pillow only. Run from the repo root:
    python3 scripts/make-runner-sprites.py
"""
import math
from PIL import Image, ImageDraw

W, H = 186, 231          # the runner image's own pixels
N = 12                   # frames per stride cycle
SS = 4                   # supersampling for smooth edges
OUT = 1                  # output pixels per runner pixel (he's only ~35-60 px tall on screen,
                         # and phones scale big images down roughly, so keep the strip small)
MX, MY = 70, 40          # margin around the runner box (limbs swing outside it)
FW, FH = W + 2 * MX, H + 2 * MY
COLORS = {'': (96, 106, 66), '-dark': (150, 255, 90)}

HIP = (82, 140)
HEAD = (119.55, 28.85, 22)
CHEST = [(97.5, 63.5), (125, 62), (150, 101.5), (139, 110), (108.5, 94)]
TORSO = [(100.5, 71.5), (74.9, 135.8)]; TORSO_W = 37.5
SHOULDER = [(54.9, 62.1), (107.5, 62.4)]; SHOULDER_W = 18.4
ARM_B = [(87.5, 65.5), (50.0, 68.5), (34.5, 90.1)]; ARM_B_W = 18.5   # shoulder, elbow, hand
ARM_F = [(114.0, 69.0), (139.5, 110.25), (163.6, 87.0)]; ARM_F_W = 20.5
LEG_B = [(48.5, 177.7), (16.9, 211.6)]; LEG_B_W = 24.4        # knee, ankle
LEG_F = [(128.5, 161.0), (127.0, 208.0), (149.75, 211.5)]; LEG_F_W = 25.0   # knee, ankle, toe

def rot(p, c, deg):
    a = math.radians(deg); dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))

def smooth(keys, t):
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            u = (t - t0) / (t1 - t0); u = (1 - math.cos(math.pi * u)) / 2
            return v0 + (v1 - v0) * u
    return keys[-1][1]

def K(a, b, c, d, e): return [(0, a), (.25, b), (.5, c), (.75, d), (1, e)]
THIGH_B = K(0, -55, -110, -55, 0); SHIN_B = K(0, 37, 72, -30, 0)
THIGH_F = K(0, 55, 110, 55, 0);    SHIN_F = K(0, -30, -72, 37, 0)
# Arms swap front/back like the legs: the upper arm swings about the shoulder and
# the forearm bends at the elbow.
UPPER_B = K(0, -42, -85, -42, 0); FORE_B = K(0, -25, -40, -15, 0)
UPPER_F = K(0, 42, 85, 42, 0);   FORE_F = K(0, 22, 40, 18, 0)
BOB = K(0, -9, 0, -9, 0);          LEAN = K(0, 3, 0, 3, 0)

def frame(color, t):
    img = Image.new('RGBA', (FW * SS, FH * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    bob = smooth(BOB, t); lean = smooth(LEAN, t)
    def tf(p):  # lean about the hip, then bob, then into the frame
        q = rot(p, HIP, lean)
        return ((q[0] + MX) * SS, (q[1] + bob + MY) * SS)
    def line(pts, w):
        P = [tf(p) for p in pts]; r = w * SS / 2
        for a, b in zip(P, P[1:]): d.line([a, b], fill=color, width=int(w * SS))
        for x, y in P: d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    cx, cy = tf(HEAD[:2]); r = HEAD[2] * SS; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    d.polygon([tf(p) for p in CHEST], fill=color)
    line(TORSO, TORSO_W); line(SHOULDER, SHOULDER_W)
    def arm(pts, upper, fore, w):
        sh, el, hand = pts
        u, f = smooth(upper, t), smooth(fore, t)
        elbow = rot(el, sh, u); wrist = rot(rot(hand, el, f), sh, u)
        line([sh, elbow, wrist], w)
    arm(ARM_B, UPPER_B, FORE_B, ARM_B_W)
    arm(ARM_F, UPPER_F, FORE_F, ARM_F_W)
    # back leg: thigh swings from the hip, shin from the knee
    tb, sbn = smooth(THIGH_B, t), smooth(SHIN_B, t)
    knee_b = rot(LEG_B[0], HIP, tb); ankle_b = rot(rot(LEG_B[1], LEG_B[0], sbn), HIP, tb)
    line([HIP, knee_b, ankle_b], LEG_B_W)
    # front leg (shin and foot swing from the knee)
    tfw, sfn = smooth(THIGH_F, t), smooth(SHIN_F, t)
    knee_f = rot(LEG_F[0], HIP, tfw)
    low = [rot(rot(p, LEG_F[0], sfn), HIP, tfw) for p in LEG_F[1:]]
    line([HIP, knee_f], LEG_F_W); line([knee_f] + low, LEG_F_W)
    return img.resize((FW * OUT, FH * OUT), Image.LANCZOS)

for sfx, color in COLORS.items():
    sheet = Image.new('RGBA', (FW * OUT, FH * OUT * N), (0, 0, 0, 0))
    for i in range(N):
        sheet.paste(frame(color + (255,), i / N), (0, i * FH * OUT))
    path = f'public/runner-sprites{sfx}.png'
    sheet.save(path, optimize=True); print(path, sheet.size)
