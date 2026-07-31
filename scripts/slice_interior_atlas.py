"""
Re-slice apps/mobile/assets/interior/interior_free.png into pieces/.

Source atlas is 160x80 (not a uniform 16x16 grid). Chairs are ~16x20;
the 4th chair sits above the plant in the same column.
"""
from __future__ import annotations

import json
import os
from PIL import Image

ROOT = r"C:\Users\Christian\Projects\pixelroom"
ATLAS = os.path.join(ROOT, r"apps\mobile\assets\interior\interior_free.png")
OUT = os.path.join(ROOT, r"apps\mobile\assets\interior\pieces")
PREVIEW = os.path.join(ROOT, r"apps\mobile\assets\interior\_slice_preview")
MANIFEST = os.path.join(ROOT, r"apps\mobile\assets\interior\atlas_slices.json")

os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

# (x, y, w, h) in atlas pixel space
SLICES: dict[str, tuple[int, int, int, int]] = {
    # Furniture
    "sofa": (1, 11, 30, 21),
    "armchair": (32, 17, 16, 15),
    "chair_down": (48, 12, 16, 20),  # front
    "chair_up": (97, 16, 14, 16),  # rear (was glued to plant)
    "chair_left": (64, 12, 16, 20),
    "chair_right": (80, 12, 16, 20),
    "plant": (97, 32, 14, 16),
    "candle": (86, 36, 7, 11),
    "candle_small": (82, 38, 5, 5),
    "shelf": (84, 54, 24, 6),
    # TV screens (overlay variants)
    "tv_screen_0": (19, 39, 10, 6),
    "tv_screen_1": (35, 39, 10, 6),
    "tv_screen_2": (51, 39, 10, 6),
    "tv_screen_3": (67, 39, 10, 6),
    "tv_screen_4": (19, 55, 10, 6),
    "tv_screen_5": (35, 55, 10, 6),
    "tv_screen_6": (51, 55, 10, 6),
    "tv_screen_7": (67, 55, 10, 6),
    # Posters
    "poster_sw": (0, 49, 16, 31),
    "poster_face": (19, 64, 13, 16),
    # Wall paints (top) + floor-connecting bases (bottom)
    # Column 0: mauve stripe wall
    "wall_stripe": (112, 0, 16, 28),
    "wall_stripe_base": (112, 28, 16, 16),
    # Column 1: cream / white wall
    "wall_white": (128, 0, 16, 28),
    "wall_white_base": (128, 28, 16, 16),
    # Column 2: orange / wood wall (atlas starts mid-column)
    "wall_orange": (144, 16, 16, 16),
    "wall_orange_base": (144, 32, 16, 16),
    # Floors
    "floor": (112, 48, 16, 16),  # speckled / plank floor tile
    "floor_wood": (128, 48, 16, 16),
    "floor_carpet": (144, 48, 16, 16),
    # Legacy names used by the live app
    "wall_a": (128, 0, 16, 28),  # cream wall paint (was wrong tall mix)
    "table": (1, 11, 30, 21),  # alias of sofa art
    "bed": (1, 11, 30, 21),  # no dedicated bed in atlas yet
    "nightstand": (32, 17, 16, 15),  # small unit / end table
    "rug": (112, 48, 32, 16),
    "tv": (19, 39, 10, 6),  # default screen until chassis art exists
    "appliance": (35, 39, 10, 6),
}

NEAREST = Image.Resampling.NEAREST if hasattr(Image, "Resampling") else Image.NEAREST


def main() -> None:
    src = Image.open(ATLAS).convert("RGBA")
    manifest: dict[str, dict[str, int]] = {}

    for name, (x, y, w, h) in SLICES.items():
        piece = src.crop((x, y, x + w, y + h))
        piece.save(os.path.join(OUT, f"{name}.png"))
        piece.resize((max(1, w * 4), max(1, h * 4)), NEAREST).save(
            os.path.join(PREVIEW, f"{name}.png")
        )
        manifest[name] = {"x": x, "y": y, "w": w, "h": h}
        print(f"ok {name:18s} {w:3d}x{h:<3d} @ ({x},{y})")

    # Build a simple TV chassis: dark frame + default screen
    chassis = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for yy in range(2, 14):
        for xx in range(1, 15):
            chassis.putpixel((xx, yy), (55, 55, 60, 255))
    for yy in range(3, 11):
        for xx in range(3, 13):
            chassis.putpixel((xx, yy), (30, 30, 35, 255))
    screen = src.crop((19, 39, 29, 45)).resize((10, 6), NEAREST)
    chassis.paste(screen, (3, 4), screen)
    chassis.save(os.path.join(OUT, "tv.png"))
    chassis.resize((64, 64), NEAREST).save(os.path.join(PREVIEW, "tv.png"))
    manifest["tv"] = {"x": -1, "y": -1, "w": 16, "h": 16, "composite": 1}

    appliance = chassis.copy()
    screen2 = src.crop((35, 39, 45, 45)).resize((10, 6), NEAREST)
    for yy in range(3, 11):
        for xx in range(3, 13):
            appliance.putpixel((xx, yy), (30, 30, 35, 255))
    appliance.paste(screen2, (3, 4), screen2)
    appliance.save(os.path.join(OUT, "appliance.png"))
    appliance.resize((64, 64), NEAREST).save(os.path.join(PREVIEW, "appliance.png"))

    src.resize((src.width * 4, src.height * 4), NEAREST).save(
        os.path.join(PREVIEW, "_atlas_x4.png")
    )
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump({"atlas": "interior_free.png", "slices": manifest}, f, indent=2)
    print("wrote", MANIFEST)


if __name__ == "__main__":
    main()
