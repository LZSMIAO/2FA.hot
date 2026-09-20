"""Project a textured Minecraft scene to static SVG; no runtime 3D engine."""
from pathlib import Path
import base64, math
root = Path(__file__).resolve().parents[1]
faces = []
textures = {}
for key, rel in {'sand':'textures/sand.png','side':'textures/cactus-side.png','top':'textures/cactus-top.png','skin':'skins/congyu.png'}.items():
    textures[key] = 'data:image/png;base64,' + base64.b64encode((root/'public'/rel).read_bytes()).decode()

def project(p):
    x,y,z=p
    return ((x-z)*math.sqrt(3)/2, (x+z)*.5-y)

def face(points, texture, uv, shade):
    depth=sum(x+y+z for x,y,z in points)/4
    faces.append((depth,points,texture,uv,shade))

def box(x,y,z,w,h,d,texture,uv=None,outer=0):
    # Standard Minecraft UV mapping, projected front, left side, and top.
    uv=uv or {'front':(0,0,16,16),'right':(0,0,16,16),'top':(0,0,16,16)}
    x0,x1=x-outer,x+w+outer; y0,y1=y-outer,y+h+outer; z0,z1=z-outer,z+d+outer
    face([(x0,y1,z1),(x1,y1,z1),(x1,y0,z1),(x0,y0,z1)],texture,uv['front'],'front')
    face([(x1,y1,z1),(x1,y1,z0),(x1,y0,z0),(x1,y0,z1)],texture,uv['right'],'right')
    face([(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],texture,uv['top'],'top')

# Four by three full sand blocks, not an extruded illustration slab.
for x in range(4):
    for z in range(3): box(x*16,0,z*16,16,16,16,'sand')

def cactus(x,z,blocks):
    for i in range(blocks):
        y=16+i*16
        # Vanilla cactus.json: top spans 16x16; side planes inset one pixel.
        face([(x,y+16,z+15),(x+16,y+16,z+15),(x+16,y,z+15),(x,y,z+15)],'side',(0,0,16,16),'front')
        face([(x+15,y+16,z+16),(x+15,y+16,z),(x+15,y,z),(x+15,y,z+16)],'side',(0,0,16,16),'right')
        if i==blocks-1:
            face([(x,y+16,z),(x+16,y+16,z),(x+16,y+16,z+16),(x,y+16,z+16)],'top',(0,0,16,16),'top')
cactus(0,0,2)
cactus(48,0,1)

# LittleSkin 513373 (Alex/slim): 3px arms, with original outer layers.
# Six-pixel thighs rest on the sand, lower legs hang over its front edge.
x,z=28,42
head={'front':(8,8,8,8),'right':(16,8,8,8),'top':(8,0,8,8)}
hat={'front':(40,8,8,8),'right':(48,8,8,8),'top':(40,0,8,8)}
body={'front':(20,20,8,12),'right':(28,20,4,12),'top':(20,16,8,4)}
jacket={'front':(20,36,8,12),'right':(28,36,4,12),'top':(20,32,8,4)}
box(x,18,z,8,12,4,'skin',body)
box(x,18,z,8,12,4,'skin',jacket,.125)
head_start = len(faces)
box(x,30,z-2,8,8,8,'skin',head)
box(x,30,z-2,8,8,8,'skin',hat,.25)
moving_parts = {id(f): ('head', (x+4, 30, z+2)) for f in faces[head_start:]}
for armx,ox,oy,lx,ly in [(x-3,40,16,40,32),(x+8,32,48,48,48)]:
    arm_start = len(faces)
    for u,v,inflate in [(ox,oy,0),(lx,ly,.125)]:
        uv={'front':(u+4,v+4,3,12),'right':(u+7,v+4,4,12),'top':(u+4,v,3,4)}
        box(armx,18,z,3,12,4,'skin',uv,inflate)
    if armx == x+8:
        moving_parts.update({id(f): ('arm', (armx+1.5, 29, z+2)) for f in faces[arm_start:]})
for legx,ox,oy,lx,ly in [(x,0,16,0,32),(x+4,16,48,0,48)]:
    for u,v,inflate in [(ox,oy,0),(lx,ly,.125)]:
        # Upper leg front runs along the top of a bent thigh.
        uv={'front':(u+4,v+8,4,4),'right':(u+8,v+4,4,6),'top':(u+4,v+4,4,6)}
        box(legx,16,z+4,4,4,6,'skin',uv,inflate)
        uv={'front':(u+4,v+10,4,6),'right':(u+8,v+10,4,6),'top':(u+4,v+8,4,4)}
        shin_start = len(faces)
        box(legx,10,z+6,4,6,4,'skin',uv,inflate)
        # The near shin swings around its knee; the thigh stays seated on the sand.
        if legx == x+4:
            moving_parts.update({id(f): ('shin', (legx+2, 16, z+8)) for f in faces[shin_start:]})

def pose_matrix(points, uv, pivot, axis, angle):
    theta = math.radians(angle)
    cosine, sine = math.cos(theta), math.sin(theta)
    rotated = []
    for px,py,pz in points:
        dx,dy,dz = px-pivot[0],py-pivot[1],pz-pivot[2]
        if axis == 'y':
            dx,dz = dx*cosine+dz*sine,-dx*sine+dz*cosine
        elif axis == 'z':
            dx,dy = dx*cosine-dy*sine,dx*sine+dy*cosine
        else:
            dy,dz = dy*cosine-dz*sine,dy*sine+dz*cosine
        rotated.append((pivot[0]+dx, pivot[1]+dy, pivot[2]+dz))
    q0,q1,_,q3 = map(project,rotated)
    _,_,w,h = uv
    return f'matrix({(q1[0]-q0[0])/w},{(q1[1]-q0[1])/w},{(q3[0]-q0[0])/h},{(q3[1]-q0[1])/h},{q0[0]},{q0[1]})'

# Small joint rotations preserve the visible front/right/top faces. Every sequence
# begins and ends in exactly the same rest pose; none loops or moves the scenery.
motions = {
    'head': {
        'look': ('y', [(0,0),(35,14),(60,14),(100,0)]),
        'nod': ('x', [(0,0),(30,-10),(55,0),(75,-6),(100,0)]),
        'shake': ('y', [(0,0),(25,12),(55,-10),(78,7),(100,0)]),
        'angry': ('y', [(0,0),(15,-16),(30,12),(45,-16),(60,12),(80,-18),(100,0)]),
        'ciallo': ('x', [(0,0),(30,-6),(65,-6),(100,0)]),
    },
    'shin': {'swing': ('x', [(0,0),(30,-18),(58,0),(78,-10),(100,0)])},
    'arm': {'ciallo': ('z', [(0,0),(25,24),(45,9),(65,24),(100,0)])},
}

allp=[project(p) for _,ps,*_ in faces for p in ps]
minx=min(p[0] for p in allp)-2; miny=min(p[1] for p in allp)-2
maxx=max(p[0] for p in allp)+2; maxy=max(p[1] for p in allp)+2
out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="544" height="440" viewBox="{minx} {miny} {maxx-minx} {maxy-miny}" fill="none"><defs>']
for name,slope in [('front',.9),('right',.72)]:
    out.append(f'<filter id="{name}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="{slope}"/><feFuncG type="linear" slope="{slope}"/><feFuncB type="linear" slope="{slope}"/></feComponentTransfer></filter>')
out.append('</defs>')
# A continuous sand silhouette prevents subpixel cracks between adjacent tiles
# from exposing the page background. Individual textured faces retain their shading.
sand_outline = [(0,16,0),(64,16,0),(64,0,0),(64,0,48),(0,0,48),(0,16,48)]
sand_points = ' '.join(f'{px},{py}' for px,py in map(project,sand_outline))
out.append(f'<polygon points="{sand_points}" fill="#c9c29a"/>')
background = out.copy()
character = out[:-1].copy()
interactive_header = out.copy()
interactive_faces = []
for face_index, item in enumerate(sorted(faces,key=lambda f:f[0])):
    _,ps,tex,uv,shade = item
    p0,p1,_,p3=map(project,ps)
    u,v,w,h=uv
    a=(p1[0]-p0[0])/w; b=(p1[1]-p0[1])/w
    c=(p3[0]-p0[0])/h; d=(p3[1]-p0[1])/h
    filt=f' filter="url(#{shade})"' if shade!='top' else ''
    dim=64 if tex=='skin' else 16
    markup = f'<g transform="matrix({a} {b} {c} {d} {p0[0]} {p0[1]})"{filt}><svg width="{w}" height="{h}" viewBox="{u} {v} {w} {h}" overflow="hidden"><image href="{textures[tex]}" width="{dim}" height="{dim}" style="image-rendering:pixelated"/></svg></g>'
    interactive_markup = markup
    if id(item) in moving_parts:
        part,pivot = moving_parts[id(item)]
        name = f'desert-joint-{face_index}'
        styles = []
        for motion,(axis,keyframes) in motions[part].items():
            animation = f'{name}-{motion}'
            frames = ''.join(f'{at}%{{transform:{pose_matrix(ps,uv,pivot,axis,angle)}}}' for at,angle in keyframes)
            selector = f'.desert-scene.is-reacting[data-motion="{motion}"] .{name}'
            styles.append(f'@keyframes {animation}{{{frames}}}{selector}{{animation:{animation} var(--desert-motion-duration,1200ms) ease-in-out both;}}@media(prefers-reduced-motion:reduce){{{selector}{{animation:none;}}}}')
        interactive_markup = '<style>' + ''.join(styles) + '</style>' + markup.replace('<g ', f'<g class="{name}" data-joint="{part}" ', 1)
    interactive_faces.append(interactive_markup)
    out.append(markup)
    (character if tex == 'skin' else background).append(markup)
out.append('</svg>')
(root/'public/art').mkdir(exist_ok=True)
(root/'public/art/desert-scene.svg').write_text(''.join(out))

for name, layer in [('desert-background', background), ('desert-character', character)]:
    (root/'public/art'/f'{name}.svg').write_text(''.join(layer) + '</svg>')

# Painted-face hit targets exclude all transparent image padding.
hits = ''.join('<polygon points="' + ' '.join(f'{px},{py}' for px,py in map(project,ps)) + '" />' for _,ps,*_ in faces)
interactive = ''.join(interactive_header + interactive_faces).replace('<svg ', '<svg class="desert-svg" ', 1) + '<g class="desert-hit">' + hits + '</g></svg>'
(root/'app/assets/art').mkdir(exist_ok=True)
(root/'app/assets/art/desert-interactive.svg').write_text(interactive)
