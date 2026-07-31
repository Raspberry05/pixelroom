from PIL import Image
from collections import deque
import json
import os

ATLAS = r"C:\Users\Christian\Projects\pixelroom\apps\mobile\assets\interior\interior_free.png"
OUT = r"C:\Users\Christian\Projects\pixelroom\apps\mobile\assets\interior\pieces"
os.makedirs(OUT, exist_ok=True)

im = Image.open(ATLAS).convert("RGBA")
w, h = im.size
px = im.load()
print("size", w, h)

# Occupancy map (compact)
for y in range(h):
    row = "".join("#" if px[x, y][3] > 10 else "." for x in range(w))
    print(f"{y:02d} {row}")

# Connected components of opaque pixels
visited = [[False] * w for _ in range(h)]
boxes = []


def neighbors(x, y):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h:
            yield nx, ny


for y in range(h):
    for x in range(w):
        if visited[y][x] or px[x, y][3] <= 10:
            continue
        q = deque([(x, y)])
        visited[y][x] = True
        minx = maxx = x
        miny = maxy = y
        count = 0
        while q:
            cx, cy = q.popleft()
            count += 1
            minx = min(minx, cx)
            maxx = max(maxx, cx)
            miny = min(miny, cy)
            maxy = max(maxy, cy)
            for nx, ny in neighbors(cx, cy):
                if not visited[ny][nx] and px[nx, ny][3] > 10:
                    visited[ny][nx] = True
                    q.append((nx, ny))
        bw, bh = maxx - minx + 1, maxy - miny + 1
        if count >= 8:
            boxes.append(
                {
                    "x": minx,
                    "y": miny,
                    "w": bw,
                    "h": bh,
                    "pixels": count,
                }
            )

boxes.sort(key=lambda b: (b["y"], b["x"]))
print("\nBOXES", len(boxes))
for i, b in enumerate(boxes):
    print(i, b)
