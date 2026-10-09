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
TORSO = [(100.5, 71.5), (74.9, 135.8)]; TORSO_W = 37.5
# One smooth shoulder/neck shape that stays inside the body, so the rounded arm joints never poke out as bumps.
SHOULDERS = [(80, 68), (86, 57), (100, 52.5), (115, 55), (124, 63), (123, 76), (100, 86), (82, 82)]
ARM_B = [(87.5, 65.5), (50.0, 68.5), (34.5, 90.1)]; ARM_B_W = 18.5   # shoulder, elbow, hand
ARM_F = [(114.0, 69.0), (139.5, 110.25), (163.6, 87.0)]; ARM_F_W = 20.5
LEG_B = [(48.5, 177.7), (16.9, 211.6)]; LEG_B_W = 24.4        # knee, ankle
LEG_F = [(128.5, 161.0), (127.0, 208.0), (149.75, 211.5)]; LEG_F_W = 25.0   # knee, ankle, toe

import numpy as np

def pt(c, length, theta):
    """Point `length` away from c, at angle theta from straight down (degrees, forward = +x)."""
    a = math.radians(theta)
    return (c[0] + length * math.sin(a), c[1] + length * math.cos(a))

# ---- A real run cycle -------------------------------------------------------
# One cycle = two steps. Frame 0 is exactly the logo's pose: the front leg in its
# knee-drive (thigh 68 deg forward, knee bent 68 deg) and the back leg at toe-off
# (thigh 42 deg back, straight). The leg's journey, then, over a full cycle:
# knee-drive -> reach -> support -> toe-off -> kick up behind -> knee-drive.
# The other leg runs the same cycle half a cycle later. Arms pump against the
# legs through their hanging position.
LEG_T = [0, .17, .33, .5, .75, 1.0]
LEG_THIGH = [68, 50, 10, -42, -5, 68]     # thigh angle from straight down, forward +
LEG_FLEX = [68, 25, 5, 0, 105, 68]        # knee bend (shin falls behind the thigh)
LEG_FOOT = [81, 75, 81, 0, 40, 81]        # foot angle relative to the shin (0 = straight on)
THIGH_LEN, SHIN_LEN, FOOT_LEN = 50.7, 46.7, 23.0
HIP_X = HIP

def leg_pose(u):
    u %= 1.0
    th = float(np.interp(u, LEG_T, LEG_THIGH)); fl = float(np.interp(u, LEG_T, LEG_FLEX)); ft = float(np.interp(u, LEG_T, LEG_FOOT))
    knee = pt(HIP, THIGH_LEN, th)
    ankle = pt(knee, SHIN_LEN, th - fl)
    toe = pt(ankle, FOOT_LEN, th - fl + ft)
    return knee, ankle, toe

def arm_pose(shoulder, upper_len, fore_len, u, base_phase):
    # upper-arm angle swings between 31.7 (forward) and -85.4 (back); elbow flexes
    # more on the forward swing. base_phase 0 = front arm, 0.5 = back arm.
    ph = 2 * math.pi * (u + base_phase)
    theta = -26.85 + 58.55 * math.cos(ph)
    bend = 76.0 + 26.3 * math.cos(ph)
    elbow = pt(shoulder, upper_len, theta)
    hand = pt(elbow, fore_len, theta + bend)
    return elbow, hand

def frame(color, t):
    img = Image.new('RGBA', (FW * SS, FH * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    bob = -6.0 * (1 - math.cos(4 * math.pi * t)) / 2 ; lean = 2.0 * (1 - math.cos(4 * math.pi * t)) / 2
    def rot(p, c, deg):
        a = math.radians(deg); dx, dy = p[0] - c[0], p[1] - c[1]
        return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))
    def tf(p):  # lean about the hip, then bob, then into the frame
        q = rot(p, HIP, lean)
        return ((q[0] + MX) * SS, (q[1] + bob + MY) * SS)
    def line(pts, w):
        P = [tf(p) for p in pts]; r = w * SS / 2
        for a, b in zip(P, P[1:]): d.line([a, b], fill=color, width=int(w * SS))
        for x, y in P: d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    line(TORSO, TORSO_W); d.polygon([tf(p) for p in SHOULDERS], fill=color)
    # The logo's shoulder line is flat; the round top of the torso made a hump beside the neck, so slice it flat.
    d.polygon([tf(p) for p in [(30, 0), (150, 0), (150, 54.5), (30, 54.5)]], fill=(0, 0, 0, 0))
    cx, cy = tf(HEAD[:2]); r = HEAD[2] * SS; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    # arms (back arm half a cycle behind the front arm)
    elbow, hand = arm_pose(ARM_B[0], 37.6, 26.6, t, 0.5); line([ARM_B[0], elbow, hand], ARM_B_W)
    elbow, hand = arm_pose(ARM_F[0], 48.5, 33.5, t, 0.0); line([ARM_F[0], elbow, hand], ARM_F_W)
    # legs: the front leg starts at knee-drive, the back leg half a cycle later
    kb, ab, tb = leg_pose(t + 0.5); line([HIP, kb, ab, tb], LEG_B_W)
    kf, af, tf_ = leg_pose(t);      line([HIP, kf, af, tf_], LEG_F_W)
    return img.resize((FW * OUT, FH * OUT), Image.LANCZOS)

for sfx, color in COLORS.items():
    sheet = Image.new('RGBA', (FW * OUT, FH * OUT * N), (0, 0, 0, 0))
    for i in range(N):
        sheet.paste(frame(color + (255,), i / N), (0, i * FH * OUT))
    path = f'public/runner-sprites{sfx}.png'
    sheet.save(path, optimize=True); print(path, sheet.size)
