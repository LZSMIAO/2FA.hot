"""Original pixel-key artwork, rendered without external fonts, images or dependencies."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]

def png(path, width, height, pixel):
    def chunk(kind, value):
        return struct.pack('>I', len(value)) + kind + value + struct.pack('>I', zlib.crc32(kind + value) & 0xffffffff)
    data = b''.join(b'\0' + bytes(channel for x in range(width) for channel in pixel(x, y)) for y in range(height))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(data, 9)) + chunk(b'IEND', b''))

def symbol(x, y):
    # 16-unit original grid: square key bow, horizontal shaft, two downward teeth.
    bow = 3 <= x < 8 and 4 <= y < 10 and not (4 <= x < 7 and 5 <= y < 9)
    shaft = 7 <= x < 13 and 7 <= y < 9
    teeth = (9 <= x < 10 or 12 <= x < 13) and 9 <= y < 11
    return bow or shaft or teeth

def icon(size):
    def pixel(x, y):
        u, v = x * 16 // size, y * 16 // size
        if not (2 <= u < 14 and 2 <= v < 14): return (0, 0, 0, 0)
        if symbol(u, v): return (245, 248, 242, 255)
        return (49, 114, 36, 255)
    return pixel

for size in (16, 32, 48, 128):
    png(ROOT / f'static/icons/icon{size}.png', size, size, icon(size))
png(ROOT / 'store/assets/logo300.png', 300, 300, icon(300))

def promo(x, y):
    u, v = (x - 92) // 16, (y - 12) // 16
    if 0 <= u < 16 and 0 <= v < 16 and symbol(u, v): return (245, 248, 242, 255)
    return (49, 114, 36, 255)
png(ROOT / 'store/assets/promo440.png', 440, 280, promo)
print('Original extension icons, 300px logo and 440×280 promotional image generated.')
