from PIL import Image

im = Image.open(
    r"C:\Users\Christian\Projects\pixelroom\apps\mobile\assets\interior\interior_free.png"
).convert("RGBA")
px = im.load()

# Sample colors along right columns at mid-x of each 16-wide strip
for col, x in [("c0", 120), ("c1", 136), ("c2", 152)]:
    print(f"\n=== {col} x={x} ===")
    for y in range(0, 64, 4):
        r, g, b, a = px[x, y]
        print(f"y={y:02d} rgba=({r:3d},{g:3d},{b:3d},{a:3d})")
