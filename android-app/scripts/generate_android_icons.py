#!/usr/bin/env python3
"""Generate pixel-art Pac-Royal Android launcher PNGs for all mipmap densities.

Uses a hand-authored 24x24 pixel grid (PixelLab-style retro arcade look).
Optional: pass --source path/to/512x512.png to composite a PixelLab export instead.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
PREVIEW = ROOT.parent / "android-apk" / "icon-preview.png"

BG = (10, 10, 24, 255)  # #0A0A18
GRID = (33, 33, 222, 90)
YELLOW = (255, 224, 0, 255)
HIGHLIGHT = (255, 245, 157, 255)
SHADOW = (201, 160, 0, 255)

# 24x24 Pac-Royal facing right (mouth open east) — '.' = empty, 'Y' body, 'H' highlight, 'S' shadow
PAC_GRID = """
........................
........................
.........YYYYYY.........
.......YYYYYYYYYY.......
.....YYYYYYYYYYYYYY.....
....YYYYYYYYYYYYYYYY....
...YYYYYYYYYYYYYYYYYY...
..YYYYYYYYYY....YYYYYY..
.YYYYYYYYYY......YYYYYY..
.YYYYYYYYY........YYYYY..
YYYYYYYYY..........YYYYY
YYYYYYYY............YYY
YYYYYYY..............YY
YYYYYYY..............YY
YYYYYYYY............YYY
.YYYYYYYYY........YYYYY..
.YYYYYYYYYY......YYYYYY..
..YYYYYYYYYY....YYYYYY..
...YYYYYYYYYYYYYYYYYY...
....YYYYYYYYYYYYYYYY....
.....YYYYYYYYYYYYYY.....
.......YYYYYYYYYY.......
.........YYYYYY.........
........................
""".strip().splitlines()

PALETTE = {
    ".": (0, 0, 0, 0),
    "Y": YELLOW,
    "H": HIGHLIGHT,
    "S": SHADOW,
}

LAUNCHER_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

SPLASH_SIZES = {
    "drawable": 480,
    "drawable-port-mdpi": 320,
    "drawable-port-hdpi": 480,
    "drawable-port-xhdpi": 720,
    "drawable-port-xxhdpi": 1080,
    "drawable-port-xxxhdpi": 1440,
    "drawable-land-mdpi": 480,
    "drawable-land-hdpi": 720,
    "drawable-land-xhdpi": 1080,
    "drawable-land-xxhdpi": 1620,
    "drawable-land-xxxhdpi": 2160,
}


def add_pixel_highlights(grid: list[str]) -> list[str]:
    """Add subtle highlight/shadow pixels for depth."""
    w = max(len(row) for row in grid)
    rows = [list(row.ljust(w, ".")) for row in grid]
    h = len(rows)
    for y in range(h):
        for x in range(w):
            if rows[y][x] != "Y":
                continue
            if y > 0 and rows[y - 1][x] in ".YS" and x < w - 1 and rows[y][x + 1] == "Y":
                rows[y][x] = "H"
            elif y < h - 1 and rows[y + 1][x] in ".YH":
                rows[y][x] = "S"
    return ["".join(row) for row in rows]


def render_pixel_sprite(grid: list[str], cell: int = 1) -> Image.Image:
    h, w = len(grid), len(grid[0])
    img = Image.new("RGBA", (w * cell, h * cell), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            color = PALETTE.get(ch, (0, 0, 0, 0))
            if color[3] == 0:
                continue
            for dy in range(cell):
                for dx in range(cell):
                    px[x * cell + dx, y * cell + dy] = color
    return img


def draw_arcade_background(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    px = img.load()
    step = max(4, size // 8)
    for i in range(0, size + 1, step):
        for y in range(size):
            if 0 <= i < size:
                px[i, y] = blend(GRID, px[i, y])
        for x in range(size):
            if 0 <= i < size:
                px[x, i] = blend(GRID, px[x, i])
    return img


def blend(over: tuple[int, int, int, int], under: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    alpha = over[3] / 255
    return tuple(int(over[i] * alpha + under[i] * (1 - alpha)) for i in range(3)) + (255,)


def scale_nearest(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.NEAREST)


def compose_icon(size: int, foreground_only: bool = False, source: Image.Image | None = None) -> Image.Image:
    if source is not None:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        if not foreground_only:
            canvas = draw_arcade_background(size)
        sprite = source.convert("RGBA")
        pad = int(size * 0.12)
        target = size - pad * 2
        sprite = sprite.resize((target, target), Image.Resampling.LANCZOS)
        ox = (size - target) // 2
        canvas.alpha_composite(sprite, (ox, ox))
        return canvas

    grid = add_pixel_highlights(PAC_GRID)
    sprite = render_pixel_sprite(grid, cell=1)
    pad_cells = 2
    sprite_size = len(grid[0]) + pad_cells * 2
    padded = Image.new("RGBA", (sprite_size, sprite_size), (0, 0, 0, 0))
    padded.alpha_composite(sprite, (pad_cells, pad_cells))

    # Fit sprite into ~72% of icon for safe adaptive-icon zone
    target_cells = max(8, int(size * 0.72 / max(1, size // sprite_size)))
    cell = max(1, size // (sprite_size + 4))
    scaled_sprite = scale_nearest(padded, cell * sprite_size)

    if foreground_only:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        canvas = draw_arcade_background(size)

    ox = (size - scaled_sprite.width) // 2
    oy = (size - scaled_sprite.height) // 2
    canvas.alpha_composite(scaled_sprite, (ox, oy))
    return canvas


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.mode == "RGBA" and path.name.startswith("ic_launcher_foreground"):
        img.save(path, "PNG")
        return
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, BG[:3])
        bg.paste(img, mask=img.split()[3])
        bg.save(path, "PNG")
    else:
        img.save(path, "PNG")


def write_all_icons(source: Image.Image | None = None) -> None:
    for folder, px in LAUNCHER_SIZES.items():
        icon = compose_icon(px, foreground_only=False, source=source)
        base = RES / folder
        save_png(icon, base / "ic_launcher.png")
        save_png(icon, base / "ic_launcher_round.png")

    for folder, px in FOREGROUND_SIZES.items():
        fg = compose_icon(px, foreground_only=True, source=source)
        save_png(fg, RES / folder / "ic_launcher_foreground.png")

    for folder, px in SPLASH_SIZES.items():
        splash = compose_icon(px, foreground_only=False, source=source)
        save_png(splash, RES / folder / "splash.png")

    preview = compose_icon(512, foreground_only=False, source=source)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    save_png(preview, PREVIEW)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate pixel-art Android launcher icons")
    parser.add_argument(
        "--source",
        type=Path,
        help="Optional 512x512+ PNG from PixelLab to use as the Pac-Royal sprite",
    )
    args = parser.parse_args()

    source = None
    if args.source:
        if not args.source.is_file():
            raise SystemExit(f"Source image not found: {args.source}")
        source = Image.open(args.source)

    write_all_icons(source=source)
    print("Generated pixel-art Pac-Royal Android icons in", RES)
    if source:
        print("Used PixelLab/source image:", args.source)


if __name__ == "__main__":
    main()
