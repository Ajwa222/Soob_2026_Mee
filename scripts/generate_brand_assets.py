"""Generate SOOB favicon + logo PNGs from the identity assets.

Sources:
  - identity/SOOB Identity/Icons/png/01.png    -> black Arabic mark only (used for favicons)
  - identity/SOOB Identity/Logo/PNG/01.png     -> navy full lockup (used in nav/footer)

Outputs into frontend/public/:
  - favicon-32.png        (32x32, navy mark, white bg)
  - apple-touch-icon.png  (180x180, navy mark, white bg)
  - icon-192.png          (192x192, navy mark, white bg)
  - icon-512.png          (512x512, navy mark, white bg)
  - logo-mark.png         (512x512, navy mark, transparent — for in-app overlays)
  - logo-full.png         (preserves Logo/01.png aspect — full lockup for nav/footer)
"""

from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\AliAl\Desktop\Soob_Design_2026")
ICON_SRC = ROOT / "identity" / "SOOB Identity" / "Icons" / "png" / "01.png"
LOGO_SRC = ROOT / "identity" / "SOOB Identity" / "Logo" / "PNG" / "01.png"
PUBLIC = ROOT / "frontend" / "public"

NAVY = (22, 20, 58)         # #16143A — SOOB primary
WHITE = (255, 255, 255)


def recolor_to_navy_on_white(src: Path, target_size: int) -> Image.Image:
    """Crop to mark, recolor any non-white pixel to navy, paste centered on white square."""
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # Replace dark pixels with navy, keep alpha; flatten over white
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (255, 255, 255, 255)
                continue
            # Heuristic: if pixel is dark (any of the input colors), treat it as the mark
            brightness = (r + g + b) / 3
            if brightness < 200:
                pixels[x, y] = (*NAVY, 255)
            else:
                pixels[x, y] = (255, 255, 255, 255)

    bbox = _find_mark_bbox(img)
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    side = max(cw, ch)
    pad = int(side * 0.16)  # ~16% breathing room
    canvas_side = side + pad * 2
    canvas = Image.new("RGB", (canvas_side, canvas_side), WHITE)
    canvas.paste(cropped, (pad + (side - cw) // 2, pad + (side - ch) // 2))
    return canvas.resize((target_size, target_size), Image.LANCZOS)


def _find_mark_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Find tight bbox of non-white pixels."""
    pixels = img.load()
    w, h = img.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, *_ = pixels[x, y]
            if r < 250 or g < 250 or b < 250:
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    return (min_x, min_y, max_x + 1, max_y + 1)


def navy_mark_transparent(src: Path, target_size: int) -> Image.Image:
    """Like recolor_to_navy_on_white but with transparent background."""
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            brightness = (r + g + b) / 3
            if brightness < 200 and a > 0:
                pixels[x, y] = (*NAVY, 255)
            else:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = img.getbbox()
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    side = max(cw, ch)
    pad = int(side * 0.10)
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad + (side - cw) // 2, pad + (side - ch) // 2))
    return canvas.resize((target_size, target_size), Image.LANCZOS)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)

    # Favicons (mark on white)
    for name, size in [
        ("favicon-32.png", 32),
        ("apple-touch-icon.png", 180),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
    ]:
        out = PUBLIC / name
        recolor_to_navy_on_white(ICON_SRC, size).save(out, "PNG", optimize=True)
        print(f"wrote {out}")

    # In-app navy mark on transparent
    transparent = navy_mark_transparent(ICON_SRC, 512)
    transparent.save(PUBLIC / "logo-mark.png", "PNG", optimize=True)
    print(f"wrote {PUBLIC / 'logo-mark.png'}")

    # Full lockup — copy navy logo as-is, just resize to manageable height for nav
    full = Image.open(LOGO_SRC).convert("RGBA")
    bbox = full.getbbox()
    if bbox:
        full = full.crop(bbox)
    target_h = 512
    ratio = target_h / full.size[1]
    target_w = int(full.size[0] * ratio)
    full = full.resize((target_w, target_h), Image.LANCZOS)
    full.save(PUBLIC / "logo-full.png", "PNG", optimize=True)
    print(f"wrote {PUBLIC / 'logo-full.png'}")


if __name__ == "__main__":
    main()
