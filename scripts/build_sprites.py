"""Extract keyed sprites from pacman-sprites.png into client/public/sprites/."""
from PIL import Image
import json
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'pacman-sprites.png')
OUT = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'sprites')

# Icon grid: x = 11 + i*22, each icon ~20×20 inside the sheet layout
X0, STEP, SIZE = 11, 22, 20

SPECS = [
    ('wall', 18, ['horiz', 'vert', 'corner', 't', 'cross', 'gate', 'floor']),
    ('ghost', 66, ['blinky', 'pinky', 'inky', 'clyde', 'fright', 'flash', 'eyes']),
]


def key_out(img: Image.Image) -> Image.Image:
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r < 60 and g < 60 and b < 110:
                px[x, y] = (0, 0, 0, 0)
    return img


def main() -> None:
    im = Image.open(SRC).convert('RGBA')
    os.makedirs(OUT, exist_ok=True)
    manifest: dict[str, str] = {}

    for cat, y0, names in SPECS:
        for i, name in enumerate(names):
            x0 = X0 + i * STEP
            fn = f'{cat}-{name}.png'
            key_out(im.crop((x0, y0, x0 + SIZE, y0 + SIZE)).copy()).save(os.path.join(OUT, fn))
            manifest[f'{cat}/{name}'] = f'/sprites/{fn}'

    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print('wrote', len(manifest), 'sprites to', OUT)


if __name__ == '__main__':
    main()
