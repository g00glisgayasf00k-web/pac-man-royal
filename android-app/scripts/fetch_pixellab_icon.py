#!/usr/bin/env python3
"""Download a completed PixelLab asset and regenerate Android launcher icons.

PixelLab MCP usage (when you have credits):
  1. create_ui_asset(
       description="retro arcade app icon, yellow pixel Pac-Royale facing right on dark navy maze grid",
       width=512, height=512, no_background=False,
       name="Pac-Royale Icon"
     )
  2. Poll get_ui_asset(ui_asset_id) until status is completed
  3. Run this script with the download URL or a saved PNG:

     python fetch_pixellab_icon.py --url "https://..."
     python fetch_pixellab_icon.py --file ./pixellab-icon.png

Requires: pip install requests pillow
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".pixellab-icon-cache.png"
GENERATE = ROOT / "generate_android_icons.py"


def download(url: str, dest: Path) -> None:
    if requests is None:
        raise SystemExit("Install requests: pip install requests")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    dest.write_bytes(resp.content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply a PixelLab PNG to Android icons")
    parser.add_argument("--url", help="PixelLab download or image URL")
    parser.add_argument("--file", type=Path, help="Local PNG from PixelLab export")
    args = parser.parse_args()

    if not args.url and not args.file:
        raise SystemExit("Provide --url or --file")

    if args.file:
        source = args.file.resolve()
        if not source.is_file():
            raise SystemExit(f"File not found: {source}")
    else:
        download(args.url, CACHE)
        source = CACHE
        print("Downloaded PixelLab image to", CACHE)

    cmd = [sys.executable, str(GENERATE), "--source", str(source)]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
