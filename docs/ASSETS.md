# Pixelroom asset intake

Staged from `D:\Christian\Downloads\Assets` into [`assets/_incoming/`](../assets/_incoming/).

**Wired (partial):** cozy `char free` layers + Interior free furniture drive the live room / You studio. Sharp nearest-neighbor scaling via `PixelImage` / `SpriteFrame`. Unpacking / cooking minigames remain **future vision**.

## Packs

| Folder | Source zip | Count | License (as included) | Fit for Pixelroom |
|--------|------------|------:|-------------------------|-------------------|
| `characters/` | `images.zip` | 500 PNG | **Unknown — confirm before shipping** | Base doll sheets |
| `trash/` | `trash assets.zip` | 58 PNG | **Unknown — confirm** | Moving-in / clutter room |
| `pixelfood/` | `Ghostpixxells_pixelfood.zip` | 102 PNG | Check Ghostpixxells terms | Cooked dishes / fridge props |
| `inputprompts/` | `kenney_inputPromptsPixel16x.zip` | ~816 tiles + sheets | **CC0 (Kenney)** | Touch / keyboard / gamepad prompts |

## Characters (`images.zip` → `characters/images/1.png`…`500.png`)

- Each file is a **48×68** sheet: **4 directions × 4 walk frames** (down / right / left / up).
- Nude base body (no hair/clothes) — good as a **layer template** under outfits later.
- Our room camera is **side-view**; use the **left/right** rows for walk. Front/back still useful for profile / You tab.
- Missing from pack (we’ll need later or derive): sit, sleep, hug, cook poses.
- Mapping idea: assign Alice/Bob (and shop skins) to stable IDs e.g. `001` / `050` until layered outfits exist.

## Trash / clutter (`trash assets`)

Great for an **unpacked / just-moved-in** room skin:

- Moving boxes (`box 1–3`, dynamic variants, 16×16 / 32×32 tiles)
- Appliances: `washer`, `dryer`, `computer`, `screen`, `satellite dish`
- Mess: garbage bags, crumpled paper, rotting food, bottles, recycling
- Wall grit: cracked paint, rusty metal tiles

## Pixel food (`Ghostpixxells_pixelfood`)

- Numbered dishes: burger, pizza, curry, dumplings, waffle, taco, cakes, etc.
- Often pairs: item + `_dish` / `_bowl` / `_napkin` presentation variants.
- Use later on cook counter / fridge / achievement toasts — not in core sim yet.

## Input prompts (Kenney CC0)

- `Tiles/tile_XXXX.png` — individual 16× icons
- `Tilemap/tilemap_packed.png` — atlas
- Categories: gamepad (A/B/X/Y, sticks, triggers), keyboard, mouse, touch hands, UI arrows/status
- Use when showing “tap / press” affordances; swap set if a gamepad is connected and active

---

## Future vision (not implementing now)

### Room unpacking
- New / purchased room starts **packed** (boxes + trash clutter).
- As people chat / spend time in the room, clutter clears and furniture “settles.”
- Buying a new room style resets to packed and must unpack again.
- Optional **unpack minigame** inside the room (tap boxes, drag to recycle) using Kenney prompts — later.

### Cooking & fridge
- Cook action can spawn a `pixelfood` dish on the counter.
- Fridge ingredients + shop-bought ingredients; recipes → dishes.
- Minigames + achievements for meals cooked — later.

### Input-aware UI
- Default: touch / tap prompts from Kenney.
- If gamepad active: show A/B stick glyphs for the same actions.

---

## Next engineering step (when you want)

1. Confirm licenses for `images.zip` + `trash assets` + Ghostpixxells food.
2. Move curated files into `apps/mobile/assets/` (or Expo `assets/`) with a stable naming scheme.
3. Slice character sheets (especially side walk) into frames and swap colored blocks in `CharacterSprite`.
4. Add a `clutter` / `packed` room style that places trash props on the stage.
