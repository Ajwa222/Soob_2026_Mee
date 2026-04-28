"""Extract SOOB wave shapes from the pattern PDF as transparent PNGs.

Output: frontend/public/patterns/wave-{color}.png
The wave fills become opaque, the white background becomes transparent.
We also recolor each wave to the exact SOOB hex so we can reuse the same
silhouette against any theme background.
"""
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\AliAl\Desktop\Soob_Design_2026\identity\rendered")
OUT = Path(r"C:\Users\AliAl\Desktop\Soob_Design_2026\frontend\public\patterns")
OUT.mkdir(parents=True, exist_ok=True)

# Pick the "ribbon" composition that crops cleanest as a tileable band.
# Different pages have different wave compositions; p1/p2/p3 share the same shape
# in different colors, so we'll grab one shape (p1) and recolor it instead.
SOURCE_SILHOUETTE = SRC / "pattern_p1.png"

THEMES = {
    "navy":     (22,  20,  58),   # #16143A
    "lime":     (224, 255,  79),  # #E0FF4F
    "lavender": (183, 158, 255),  # #B79EFF
    "cream":    (255, 248, 224),  # #FFF8E0 — light variant for dark themes
}


def make_wave(color: tuple[int, int, int], out: Path) -> None:
    """Recolor pattern_p1 to `color`, white background → transparent."""
    img = Image.open(SOURCE_SILHOUETTE).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            brightness = (r + g + b) / 3
            if brightness < 200 and a > 0:
                # Wave silhouette → recolor, keep full opacity
                pixels[x, y] = (*color, 255)
            else:
                # Background → fully transparent
                pixels[x, y] = (0, 0, 0, 0)
    # Crop to wave bounding box for a tighter asset
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(out, "PNG", optimize=True)
    print(f"  wrote {out.name} ({img.size[0]}x{img.size[1]})")


def main() -> None:
    print("Generating SOOB wave overlays:")
    for name, color in THEMES.items():
        make_wave(color, OUT / f"wave-{name}.png")


if __name__ == "__main__":
    main()
