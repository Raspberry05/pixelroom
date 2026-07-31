from PIL import Image

im = Image.open(
    r"C:\Users\Christian\Projects\pixelroom\apps\mobile\assets\interior\interior_free.png"
).convert("RGBA")
px = im.load()
w, h = im.size

# Find dark-grayish opaque pixels (TV chassis candidates)
hits = []
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 200:
            continue
        if abs(r - g) < 18 and abs(g - b) < 18 and 40 <= r <= 120:
            hits.append((x, y, r, g, b))

print("grayish count", len(hits))
if hits:
    xs = [h[0] for h in hits]
    ys = [h[1] for h in hits]
    print("bbox", min(xs), min(ys), max(xs), max(ys))

# Split plant column: find horizontal gap between chair and plant
print("\nplant column x=97-110 alpha by row:")
for y in range(12, 50):
    row = "".join("#" if px[x, y][3] > 10 else "." for x in range(97, 111))
    print(f"{y:02d} {row}")
