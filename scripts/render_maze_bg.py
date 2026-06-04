"""Render classic Pac-Man maze (double blue lines) to PNG."""
from PIL import Image, ImageDraw
import os

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
  '|......||....||....||......|',
  '||||||.||||| || |||||.||||||',
  '_____|.||||| || |||||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||--||| ||.|_____',
  '||||||.|| |______| ||.||||||',
  '      .   |______|   .      ',
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
  '|......||....||....||......|',
  '|.||||||||||.||.||||||||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|..........................|',
  '||||||||||||||||||||||||||||',
  '____________________________',
  '____________________________',
]

WALKABLE = set(' .o-')


def tile_at(col, row):
    if row < 0 or row >= len(ROWS) or col < 0 or col >= 28:
        return '_'
    return ROWS[row][col]


def is_walkable(col, row):
    return tile_at(col, row) in WALKABLE


def is_render_wall(col, row):
    t = tile_at(col, row)
    if t == '|':
        return True
    if t != '_':
        return False
    return (
        is_walkable(col - 1, row)
        or is_walkable(col + 1, row)
        or is_walkable(col, row - 1)
        or is_walkable(col, row + 1)
    )


TS = 16
W, H = 28 * TS, 36 * TS
img = Image.new('RGB', (W, H), (0, 0, 0))
draw = ImageDraw.Draw(img)
WALL = (33, 33, 222)
GATE = (255, 102, 170)
PAD, GAP = 2, 3


def draw_wall_lines(col, row):
    x, y = col * TS, row * TS
    segs = []
    if is_walkable(col, row - 1):
        segs += [(x + PAD, y + PAD, x + TS - PAD, y + PAD), (x + PAD, y + PAD + GAP, x + TS - PAD, y + PAD + GAP)]
    if is_walkable(col, row + 1):
        segs += [(x + PAD, y + TS - PAD, x + TS - PAD, y + TS - PAD), (x + PAD, y + TS - PAD - GAP, x + TS - PAD, y + TS - PAD - GAP)]
    if is_walkable(col - 1, row):
        segs += [(x + PAD, y + PAD, x + PAD, y + TS - PAD), (x + PAD + GAP, y + PAD, x + PAD + GAP, y + TS - PAD)]
    if is_walkable(col + 1, row):
        segs += [(x + TS - PAD, y + PAD, x + TS - PAD, y + TS - PAD), (x + TS - PAD - GAP, y + PAD, x + TS - PAD - GAP, y + TS - PAD)]
    for s in segs:
        draw.line(s, fill=WALL, width=2)


for row in range(len(ROWS)):
    for col in range(28):
        t = tile_at(col, row)
        if t == '-':
            y = row * TS + TS // 2
            draw.line([(col * TS + 2, y), (col * TS + TS - 2, y)], fill=GATE, width=3)
        elif is_render_wall(col, row):
            draw_wall_lines(col, row)

out = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'maze-bg.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print('saved', out, img.size)
