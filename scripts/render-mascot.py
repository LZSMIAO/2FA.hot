"""Murasame standing and waving, for the new visitor's welcome.

The same skin and projection as scripts/render-desert.py, but every face of
each box is known, so a raised arm shows the sides that face the viewer. The
skin is embedded once and each face crops it, which keeps the file small.
"""
from pathlib import Path
import base64, math

root = Path(__file__).resolve().parents[1]
skin = 'data:image/png;base64,' + base64.b64encode((root / 'public/skins/congyu.png').read_bytes()).decode()
# The camera looks along -(1, 1, 1): a face shows when its normal points back at it.
view = (1, 1, 1)


def project(p):
    x, y, z = p
    return ((x - z) * math.sqrt(3) / 2, (x + z) * .5 - y)


def rotate(p, pivot, axis, angle):
    if not angle:
        return p
    t = math.radians(angle)
    c, s = math.cos(t), math.sin(t)
    dx, dy, dz = p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]
    if axis == 'z':
        dx, dy = dx * c - dy * s, dx * s + dy * c
    elif axis == 'y':
        dx, dz = dx * c + dz * s, -dx * s + dz * c
    else:
        dy, dz = dy * c - dz * s, dy * s + dz * c
    return (pivot[0] + dx, pivot[1] + dy, pivot[2] + dz)


faces = []


def box(x, y, z, w, h, d, u, v, inflate=0, joint=None):
    """A Minecraft skin box: (u, v) is the part's corner in the 64 by 64 skin."""
    x0, x1 = x - inflate, x + w + inflate
    y0, y1 = y - inflate, y + h + inflate
    z0, z1 = z - inflate, z + d + inflate
    # Each face: its corners from the texture's top left, top right, bottom
    # right, bottom left, and the part of the skin it shows.
    parts = [
        ([(x0, y1, z1), (x1, y1, z1), (x1, y0, z1), (x0, y0, z1)], (u + d, v + d, w, h), (0, 0, 1)),
        ([(x1, y1, z1), (x1, y1, z0), (x1, y0, z0), (x1, y0, z1)], (u + d + w, v + d, d, h), (1, 0, 0)),
        ([(x0, y1, z0), (x0, y1, z1), (x0, y0, z1), (x0, y0, z0)], (u, v + d, d, h), (-1, 0, 0)),
        ([(x1, y1, z0), (x0, y1, z0), (x0, y0, z0), (x1, y0, z0)], (u + 2 * d + w, v + d, w, h), (0, 0, -1)),
        ([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (u + d, v, w, d), (0, 1, 0)),
        ([(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)], (u + d + w, v, w, d), (0, -1, 0)),
    ]
    for points, uv, normal in parts:
        if joint:
            pivot, axis, angle = joint
            points = [rotate(p, pivot, axis, angle) for p in points]
            normal = rotate(normal, (0, 0, 0), axis, angle)
        if sum(n * c for n, c in zip(normal, view)) <= 1e-6:
            continue
        faces.append((points, uv, normal))


def limb(x, y, z, w, u, v, lu, lv, joint=None):
    box(x, y, z, w, 12, 4, u, v, 0, joint)
    box(x, y, z, w, 12, 4, lu, lv, .25, joint)


# LittleSkin 513373 (Alex/slim): legs, body, three-pixel arms, head, each with
# its outer layer.
limb(0, 0, 0, 4, 0, 16, 0, 32)
limb(4, 0, 0, 4, 16, 48, 0, 48)
box(0, 12, 0, 8, 12, 4, 16, 16)
box(0, 12, 0, 8, 12, 4, 16, 32, .25)
# Her right arm hangs; the left is raised to wave, swung out about the shoulder.
limb(-3, 12, 0, 3, 40, 16, 40, 32)
limb(8, 12, 0, 3, 32, 48, 48, 48, ((9.5, 22.5, 2), 'z', 150))
# The head turns a little towards the wave.
head = ((4, 24, 2), 'y', 12)
box(0, 24, -2, 8, 8, 8, 0, 0, 0, head)
box(0, 24, -2, 8, 8, 8, 32, 0, .5, head)

shades = {(0, 0, 1): .9, (1, 0, 0): .72, (-1, 0, 0): .72, (0, 0, -1): .6, (0, 1, 0): 1, (0, -1, 0): .55}


def shade(normal):
    # Nearest of the six directions after a joint turns the face.
    return max(shades, key=lambda n: sum(a * b for a, b in zip(n, normal)))


points = [project(p) for f in faces for p in f[0]]
minx = min(p[0] for p in points) - 1
miny = min(p[1] for p in points) - 1
maxx = max(p[0] for p in points) + 1
maxy = max(p[1] for p in points) + 1
out = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx:.3f} {miny:.3f} {maxx - minx:.3f} {maxy - miny:.3f}" fill="none">',
    f'<defs><image id="skin" href="{skin}" width="64" height="64" style="image-rendering:pixelated"/>',
]
for key, slope in {f'{n[0]}{n[1]}{n[2]}': s for n, s in shades.items() if s != 1}.items():
    out.append(
        f'<filter id="s{key.replace("-", "m")}" color-interpolation-filters="sRGB"><feComponentTransfer>'
        + ''.join(f'<feFunc{c} type="linear" slope="{slope}"/>' for c in 'RGB')
        + '</feComponentTransfer></filter>'
    )
out.append('</defs>')
# Far faces first.
for ps, (u, v, w, h), normal in sorted(faces, key=lambda f: sum(sum(p) for p in f[0])):
    p0, p1, _, p3 = map(project, ps)
    a, b = (p1[0] - p0[0]) / w, (p1[1] - p0[1]) / w
    c, d = (p3[0] - p0[0]) / h, (p3[1] - p0[1]) / h
    n = shade(normal)
    key = f'{n[0]}{n[1]}{n[2]}'.replace('-', 'm')
    filt = '' if shades[n] == 1 else f' filter="url(#s{key})"'
    out.append(
        f'<g transform="matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {p0[0]:.3f} {p0[1]:.3f})"{filt}>'
        f'<svg width="{w}" height="{h}" viewBox="{u} {v} {w} {h}" overflow="hidden"><use href="#skin"/></svg></g>'
    )
out.append('</svg>\n')
(root / 'public/art/murasame-wave.svg').write_text(''.join(out))
print(f'{len(faces)} faces')
