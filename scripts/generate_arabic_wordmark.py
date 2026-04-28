"""Generate the Arabic-only wordmark (صوب) from the SOOB Logo PNG.

Crops the top portion of `Logo/PNG/01.png` (Arabic "صوب") and skips the
English "SOOB" lockup below it. Saves transparent PNGs in navy + white
for light/dark theme use.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\AliAl\Desktop\Soob_Design_2026")
SRC = ROOT / "identity" / "SOOB Identity" / "Logo" / "PNG" / "01.png"
OUT = ROOT / "frontend" / "public"

NAVY = (22, 20, 58)
WHITE = (255, 255, 255)


def find_dark_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Bounding box of every non-white pixel."""
    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, *_ = px[x, y]
            if r < 240 or g < 240 or b < 240:
                if x < minx: minx = x
                if y < miny: miny = y
                if x > maxx: maxx = x
                if y > maxy: maxy = y
    return (minx, miny, maxx + 1, maxy + 1)


def find_text_break(img: Image.Image, bbox: tuple[int, int, int, int]) -> int:
    """Scan rows top→bottom inside the bbox and find the empty horizontal band
    that separates the Arabic glyph (top) from the SOOB wordmark (bottom)."""
    x0, y0, x1, y1 = bbox
    px = img.load()
    cuts = []
    in_blank = False
    blank_start = -1
    for y in range(y0, y1):
        any_dark = False
        for x in range(x0, x1):
            r, g, b, *_ = px[x, y]
            if r < 240 or g < 240 or b < 240:
                any_dark = True
                break
        if not any_dark:
            if not in_blank:
                in_blank = True
                blank_start = y
        else:
            if in_blank:
                cuts.append((blank_start, y, y - blank_start))
                in_blank = False
    if not cuts:
        return (y0 + y1) // 2
    # The widest gap inside the bbox is the divider between Arabic and "SOOB"
    cuts.sort(key=lambda c: c[2], reverse=True)
    return (cuts[0][0] + cuts[0][1]) // 2


def make_arabic_only(target_color: tuple[int, int, int], out_path: Path) -> None:
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size

    # Recolor every non-white pixel to the target color, transparent everywhere else.
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (r + g + b) / 3 < 200 and a > 0:
                px[x, y] = (*target_color, 255)
            else:
                px[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    if bbox is None:
        raise RuntimeError("source had no visible pixels")

    cut = find_text_break(img, bbox)
    arabic = img.crop((bbox[0], bbox[1], bbox[2], cut))
    # Tighten to the Arabic glyph's own bbox (in case of small floating dots).
    final_bbox = arabic.getbbox()
    if final_bbox:
        arabic = arabic.crop(final_bbox)

    # No padding — let CSS handle whitespace. The image is the bbox of the
    # glyph itself, so `h-N` sizing in the JSX maps directly to glyph height.
    arabic.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path.name}  ({arabic.size[0]}x{arabic.size[1]})")


def main() -> None:
    make_arabic_only(NAVY,  OUT / "logo-arabic-navy.png")
    make_arabic_only(WHITE, OUT / "logo-arabic-white.png")


if __name__ == "__main__":
    main()
