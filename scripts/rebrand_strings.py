"""Bulk find/replace Simba -> SOOB across the codebase.

Strategy:
- 'SimbaApp' -> 'SoobApp' first (reads better in code identifiers)
- 'Simba'    -> 'SOOB'       (the user-visible brand mark; brand uses all-caps)
- Lowercase 'simba' is left alone here — handled by separate localStorage rename pass.
"""

from pathlib import Path

ROOT = Path(r"C:\Users\AliAl\Desktop\Soob_Design_2026")

TARGETS = [
    ROOT / "frontend" / "src",
    ROOT / "backend" / "src",
]

ALLOWED_EXTS = {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"}

REPLACEMENTS = [
    ("SimbaApp", "SoobApp"),
    ("Simba", "SOOB"),
]


def should_skip(path: Path) -> bool:
    parts = set(path.parts)
    return any(p in parts for p in ("node_modules", "dist", ".git", "build"))


def rebrand_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        diff = sum(text.count(new) for _, new in REPLACEMENTS) - sum(
            original.count(new) for _, new in REPLACEMENTS
        )
        return diff
    return 0


def main() -> None:
    touched = 0
    total_changes = 0
    for target in TARGETS:
        for path in target.rglob("*"):
            if not path.is_file() or path.suffix not in ALLOWED_EXTS:
                continue
            if should_skip(path):
                continue
            changed = rebrand_file(path)
            if changed:
                touched += 1
                total_changes += changed
                print(f"  {path.relative_to(ROOT)} (+{changed})")
    print(f"\n{touched} files updated, {total_changes} replacements")


if __name__ == "__main__":
    main()
