import re
import urllib.request

url = "https://raw.githubusercontent.com/masonicGIT/pacman/master/src/maps.js"
text = urllib.request.urlopen(url).read().decode("utf-8")
block = re.search(r"var mapPacman = new Map\(28, 36, \((.*?)\)\);", text, re.S)
strings = re.findall(r'"([^"]*)"', block.group(1))
print(f"rows: {len(strings)}")
for i, s in enumerate(strings):
    if len(s) != 28:
        print(f"BAD {i} len={len(s)} {s!r}")
    else:
        print(f"  {s!r},")
