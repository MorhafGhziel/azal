# AZAL — stroke-based painter (after Hertzmann, "Painterly Rendering with Curved Brush Strokes").
# Paints a graded RGBA layer with real curved brush strokes, coarse to fine, strokes following the form.
# Warm/cool variation per stroke: lit strokes lean apricot, shadow strokes lean lavender.
# uv run --python 3.12 --with numpy --with opencv-python --with pillow python strokes.py in.png out.png <style> [seed]
# style: sky | far | mid | near | front | wine | mist
import sys, math, numpy as np, cv2
from PIL import Image

src, dst, style = sys.argv[1], sys.argv[2], sys.argv[3]
seed = int(sys.argv[4]) if len(sys.argv) > 4 else 1
rng = np.random.default_rng(seed)

im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32) / 255.0
H, W = im.shape[:2]
k = W / 2560 if W > H else H / 1920 * 0.75  # brush sizes scale with the image
k = max(k, 0.25)

# brush radii (px at 2560 wide), stroke length, error threshold, warm/cool strength, final softness
STYLE = {
    'sky':   dict(R=[40, 22, 12], L=(6, 14), T=0.035, wc=0.035, soft=1.2, curv=0.35),
    'far':   dict(R=[16, 9, 6],   L=(3, 8),  T=0.05,  wc=0.04,  soft=1.0, curv=0.5),
    'mid':   dict(R=[22, 12, 7, 4], L=(3, 10), T=0.045, wc=0.06, soft=0.0, curv=0.6),
    'near':  dict(R=[20, 11, 6, 3.5], L=(3, 10), T=0.045, wc=0.06, soft=0.0, curv=0.6),
    'front': dict(R=[30, 16, 9], L=(3, 8),  T=0.05,  wc=0.05,  soft=1.6, curv=0.5),
    'wine':  dict(R=[20, 11, 6], L=(3, 9),  T=0.04,  wc=0.03,  soft=0.4, curv=0.6),
    'mist':  dict(R=[34, 18, 10], L=(4, 10), T=0.04, wc=0.03,  soft=1.0, curv=0.45),
    'ing':   dict(R=[26, 14, 8, 4.5], L=(3, 9), T=0.04, wc=0.07, soft=0.0, curv=0.6),
}[style]

WARM = np.array([1.0, 0.86, 0.66], np.float32)   # apricot light
COOL = np.array([0.66, 0.68, 0.92], np.float32)   # lavender shade

def lum(rgb):
    return rgb[..., 0] * 0.3 + rgb[..., 1] * 0.55 + rgb[..., 2] * 0.15

# un-premultiplied colour, bled outward so edge strokes don't pick up black
alpha = im[..., 3]
rgb = im[..., :3].copy()
if alpha.min() < 0.99:
    w = cv2.GaussianBlur(alpha, (0, 0), 12) + 1e-4
    bled = cv2.GaussianBlur(rgb * alpha[..., None], (0, 0), 12) / w[..., None]
    m = np.clip(alpha * 3, 0, 1)[..., None]
    rgb = rgb * m + bled * (1 - m)

canvas = np.zeros((H, W, 4), np.float32)
first = True
for R0 in STYLE['R']:
    R = max(1.5, R0 * k)
    sig = max(0.6, R * 0.5)
    ref_rgb = cv2.GaussianBlur(rgb, (0, 0), sig)
    ref_a = cv2.GaussianBlur(alpha, (0, 0), sig * 0.8)
    L = lum(ref_rgb)
    gx = cv2.Sobel(L, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(L, cv2.CV_32F, 0, 1, ksize=3)
    gx = cv2.GaussianBlur(gx, (0, 0), R); gy = cv2.GaussianBlur(gy, (0, 0), R)
    gmag = np.sqrt(gx * gx + gy * gy) + 1e-6
    # alpha-edge normals drive stroke direction near silhouettes (strokes wrap the form)
    ax = cv2.Sobel(ref_a, cv2.CV_32F, 1, 0, ksize=3); ay = cv2.Sobel(ref_a, cv2.CV_32F, 0, 1, ksize=3)
    ax = cv2.GaussianBlur(ax, (0, 0), R); ay = cv2.GaussianBlur(ay, (0, 0), R)
    amag = np.sqrt(ax * ax + ay * ay) + 1e-6

    diff = np.abs(canvas[..., :3] - ref_rgb).sum(-1) / 3 + np.abs(canvas[..., 3] - ref_a)
    grid = max(1, int(R))
    ys, xs = np.mgrid[grid // 2:H:grid, grid // 2:W:grid]
    cells = list(zip(ys.ravel(), xs.ravel()))
    rng.shuffle(cells)
    strokes = []
    for (cy, cx) in cells:
        y0, y1 = max(0, cy - grid // 2), min(H, cy + grid // 2 + 1)
        x0, x1 = max(0, cx - grid // 2), min(W, cx + grid // 2 + 1)
        region = diff[y0:y1, x0:x1]
        if not first and region.mean() < STYLE['T']:
            continue
        if ref_a[cy, cx] < 0.015 and canvas[cy, cx, 3] < 0.015:
            continue
        iy, ix = np.unravel_index(np.argmax(region), region.shape)
        y, x = y0 + iy, x0 + ix
        col = ref_rgb[y, x].copy(); a0 = ref_a[y, x]
        pts = [(x, y)]
        dx0, dy0 = 0.0, 0.0
        nmax = rng.integers(STYLE['L'][0], STYLE['L'][1] + 1)
        px, py = float(x), float(y)
        for _ in range(nmax):
            iy2, ix2 = int(min(max(py, 0), H - 1)), int(min(max(px, 0), W - 1))
            if len(pts) > 2 and np.abs(ref_rgb[iy2, ix2] - col).sum() > 0.14:
                break
            # direction: along the isophote (perpendicular to gradient); near silhouettes, along the edge
            e = min(1.0, amag[iy2, ix2] * R * 0.8)
            tx, ty = -gy[iy2, ix2] / gmag[iy2, ix2], gx[iy2, ix2] / gmag[iy2, ix2]
            sx, sy = -ay[iy2, ix2] / amag[iy2, ix2], ax[iy2, ix2] / amag[iy2, ix2]
            dx, dy = tx * (1 - e) + sx * e, ty * (1 - e) + sy * e
            if gmag[iy2, ix2] < 1e-3 and e < 0.05:
                dx, dy = 1.0, rng.normal(0, 0.25)  # flat areas: soft horizontal strokes
            if dx0 * dx + dy0 * dy < 0:
                dx, dy = -dx, -dy
            c = STYLE['curv']
            dx, dy = c * dx + (1 - c) * dx0 if dx0 or dy0 else dx, c * dy + (1 - c) * dy0 if dx0 or dy0 else dy
            n = math.hypot(dx, dy) + 1e-6; dx, dy = dx / n, dy / n
            px, py = px + R * dx, py + R * dy
            if not (0 <= px < W and 0 <= py < H):
                break
            pts.append((px, py)); dx0, dy0 = dx, dy
        # warm / cool variation within the cloud
        l = float(lum(col[None])[0])
        t = np.clip((l - 0.35) / 0.5, 0, 1)
        tint = WARM * t + COOL * (1 - t)
        amt = STYLE['wc'] * rng.uniform(0.4, 1.6)
        col2 = col * (1 - amt) + col * tint * amt / max(float((tint * [0.3, 0.55, 0.15]).sum()), 1e-3)
        col2 = col2 * rng.uniform(0.975, 1.03)
        strokes.append((np.array(pts, np.float32), np.clip(col2, 0, 1), a0, R))
    first = False
    # draw this layer of strokes
    layer = (canvas * 255).astype(np.uint8)
    for pts, col, a0, R in strokes:
        c = (float(col[0] * 255), float(col[1] * 255), float(col[2] * 255), float(np.clip(a0, 0, 1) * 255))
        th = max(1, int(round(R * rng.uniform(1.6, 2.2))))
        if len(pts) == 1:
            cv2.circle(layer, (int(pts[0][0]), int(pts[0][1])), max(1, th // 2), c, -1, lineType=cv2.LINE_AA)
        else:
            cv2.polylines(layer, [np.round(pts).astype(np.int32)], False, c, th, lineType=cv2.LINE_AA)
    canvas = layer.astype(np.float32) / 255.0
    print(f'R={R:.1f} strokes={len(strokes)}', flush=True)

# keep the original silhouette as a soft limit so strokes don't spill far into empty sky
lim = cv2.GaussianBlur(alpha, (0, 0), max(1.0, 4 * k))
canvas[..., 3] = np.minimum(canvas[..., 3], np.clip(lim * 1.25, 0, 1))
if STYLE['soft'] > 0:
    s = STYLE['soft'] * k * 2
    canvas = cv2.GaussianBlur(canvas, (0, 0), s)
Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8), 'RGBA').save(dst)
print('saved', dst)
