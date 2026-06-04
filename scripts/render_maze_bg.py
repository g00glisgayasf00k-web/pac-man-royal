"""Render classic Pac-Man maze to PNG for use as game background."""
from PIL import Image, ImageDraw

ROWS = [
  '____________________________',
  '____________________________',
  '____________________________',
  '||||||||||||||||||||||||||||',
  '|............||............|',
  '|.||||.|||||.||.|||||.||||.|',
  '|o||||.|||||.||.|||||.||||o|',
  '|.||||.|||||.||.|||||.||||.|',
  '|..........................|',
  '|.||||.||.||||||||.||.||||.|',
  '|.||||.||.||||||||.||.||||.|',
  '||||||.||....||....||....|||',
  '||||||.||||| || |||||.||||||',
  '_____|.||||| || |||||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||--||| ||.|_____',
  '||||||.|| |______| ||.||||||',
  '||||||.||          ||.||||||',
  '||||||.|| |______| ||.||||||',
  '_____|.|| |||||||| ||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||||||| ||.|_____',
  '||||||.|| |||||||| ||.||||||',
  '|............||............|',
  '|.||||.|||||.||.|||||.||||.|',
  '|.||||.|||||.||.|||||.||||.|',
  '|o..||.......  .......||..o|',
  '|||.||.||.||||||||.||.||.|||',
  '|||.||.||.||||||||.||.||.|||',
  '|.||||.||....||....||.||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|..........................|',
  '||||||||||||||||||||||||||||',
  '____________________________',
  '____________________________',
]

TS = 16
W, H = 28 * TS, 36 * TS
img = Image.new('RGB', (W, H), (0, 0, 0))
draw = ImageDraw.Draw(img)
WALL = (33, 33, 222)
PELLET = (255, 184, 174)

def is_wall(c, r):
    if r < 0 or r >= len(ROWS) or c < 0 or c >= 28:
        return True
    return ROWS[r][c] in '|_'

def is_path(c, r):
    if r < 0 or r >= len(ROWS) or c < 0 or c >= 28:
        return False
    return ROWS[r][c] in ' .o-'

for row in range(len(ROWS)):
    for col in range(28):
        t = ROWS[row][col]
        cx, cy = col * TS + TS // 2, row * TS + TS // 2
        if t != '|':
            continue
        x, y = col * TS, row * TS
        pad, gap = 2, 3
        segs = []
        if is_path(col, row - 1):
            segs += [(x + pad, y + pad, x + TS - pad, y + pad), (x + pad, y + pad + gap, x + TS - pad, y + pad + gap)]
        if is_path(col, row + 1):
            segs += [(x + pad, y + TS - pad, x + TS - pad, y + TS - pad), (x + pad, y + TS - pad - gap, x + TS - pad, y + TS - pad - gap)]
        if is_path(col - 1, row):
            segs += [(x + pad, y + pad, x + pad, y + TS - pad), (x + pad + gap, y + pad, x + pad + gap, y + TS - pad)]
        if is_path(col + 1, row):
            segs += [(x + TS - pad, y + pad, x + TS - pad, y + TS - pad), (x + TS - pad - gap, y + pad, x + TS - pad - gap, y + TS - pad)]
        for s in segs:
            draw.line(s, fill=WALL, width=2)

# ghost gate
for row in range(len(ROWS)):
    for col in range(28):
        if ROWS[row][col] == '-':
            y = row * TS + TS // 2
            x0, x1 = col * TS + 2, col * TS + TS - 2
            draw.line([(x0, y), (x1, y)], fill=(255, 255, 255), width=2)

import os
out = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'maze-bg.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print('saved', out, img.size)
