#!/usr/bin/env python3
"""Match unknown shop-page-banner folders to brand slugs via OCR + fuzzy brand-name matching."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from difflib import SequenceMatcher
from pathlib import Path

import easyocr
import numpy as np
from scipy.optimize import linear_sum_assignment

REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_LOGOS = REPO_ROOT / "docs/assets/brand-logos"
MANIFEST = BRAND_LOGOS / "manifest.json"
ENTRIES = REPO_ROOT / "scripts/figma-brand-logos/.entries.json"

VALIDATED = {
    "unknown_15_1466": "sasa",
    "unknown_15_1471": "jazeera",
    "unknown_28_515": "tiktok_b2b",
    "unknown_15_214": "cotton_on",
    "unknown_15_1458": "geekbuying",
}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def brand_aliases(brand: str, slug: str) -> list[str]:
    base = brand.split(" - ")[0].split(" (")[0].strip()
    parts = [brand, base, slug.replace("_", " ")]
    if "tiktok" in slug:
        parts.append("tiktok shop")
    if slug == "tripcom":
        parts.append("trip.com")
    if slug == "shopee_th":
        parts.append("shopee")
    return [normalize(p) for p in parts if p]


def ocr_text(reader: easyocr.Reader, path: Path) -> str:
    try:
        chunks = reader.readtext(str(path), detail=0, paragraph=True)
        return " ".join(chunks)
    except Exception:
        return ""


def score_ocr_vs_brand(ocr: str, aliases: list[str]) -> float:
    o = normalize(ocr)
    if not o:
        return 0.0
    best = 0.0
    for alias in aliases:
        if len(alias) < 3:
            continue
        if alias in o or o in alias:
            best = max(best, 1.0)
            continue
        best = max(best, SequenceMatcher(None, alias, o).ratio())
        # sliding window for partial matches in long OCR strings
        for i in range(0, max(1, len(o) - len(alias) + 1)):
            window = o[i : i + len(alias)]
            best = max(best, SequenceMatcher(None, alias, window).ratio())
    return best


def list_unknown_banners() -> list[tuple[str, Path]]:
    result: list[tuple[str, Path]] = []
    for d in sorted(BRAND_LOGOS.iterdir()):
        if not d.is_dir() or not d.name.startswith("unknown_"):
            continue
        logo = d / "shop-page-banner" / "logo.png"
        if logo.is_file():
            result.append((d.name, logo))
    return result


def load_brand_catalog(entries: list[dict]) -> list[tuple[str, str, list[str]]]:
    seen: set[str] = set()
    catalog: list[tuple[str, str, list[str]]] = []
    for entry in entries:
        if entry.get("category") != "default-shop-card":
            continue
        slug = entry["slug"]
        if slug.startswith("unknown_") or slug in seen:
            continue
        seen.add(slug)
        brand = entry.get("brand", slug)
        catalog.append((slug, brand, brand_aliases(brand, slug)))
    return catalog


def load_brand_name(slug: str, manifest: list[dict]) -> str:
    for entry in manifest:
        if entry.get("slug") == slug and entry.get("category") == "default-shop-card":
            return entry.get("brand", slug)
    for entry in manifest:
        if entry.get("slug") == slug:
            return entry.get("brand", slug)
    return slug


def apply_moves(assignments: dict[str, str], manifest: list[dict], entries: list[dict], dry_run: bool) -> dict:
    report = {"moved": [], "skipped_existing": [], "validated_ok": [], "validated_fail": []}

    for unknown_slug, target_slug in sorted(assignments.items()):
        src_dir = BRAND_LOGOS / unknown_slug
        src_logo = src_dir / "shop-page-banner" / "logo.png"
        dest_dir = BRAND_LOGOS / target_slug / "shop-page-banner"
        dest_logo = dest_dir / "logo.png"
        brand_name = load_brand_name(target_slug, manifest)

        if dest_logo.exists():
            report["skipped_existing"].append({"unknown": unknown_slug, "slug": target_slug})
            if not dry_run:
                shutil.rmtree(src_dir, ignore_errors=True)
        else:
            report["moved"].append({"unknown": unknown_slug, "slug": target_slug, "brand": brand_name})
            if not dry_run:
                dest_dir.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src_logo), str(dest_logo))
                shutil.rmtree(src_dir, ignore_errors=True)

        if not dry_run:
            rel = f"docs/assets/brand-logos/{target_slug}/shop-page-banner/logo.png"
            for entry in manifest:
                if entry.get("slug") == unknown_slug and entry.get("category") == "shop-page-banner":
                    entry["slug"] = target_slug
                    entry["brand"] = brand_name
                    entry["relativePath"] = rel
                    entry["figmaName"] = f"Brand={brand_name}"
            for entry in entries:
                if entry.get("slug") == unknown_slug and entry.get("category") == "shop-page-banner":
                    entry["slug"] = target_slug
                    entry["brand"] = brand_name
                    entry["name"] = f"Brand={brand_name}"

        if unknown_slug in VALIDATED:
            (report["validated_ok"] if target_slug == VALIDATED[unknown_slug] else report["validated_fail"]).append(
                {"unknown": unknown_slug, "expected": VALIDATED[unknown_slug], "got": target_slug}
            )

    return report


def verify() -> dict:
    unknown_dirs = [d.name for d in BRAND_LOGOS.iterdir() if d.is_dir() and d.name.startswith("unknown_")]
    manifest = json.loads(MANIFEST.read_text())
    entries = json.loads(ENTRIES.read_text())
    return {
        "unknown_dirs_remaining": len(unknown_dirs),
        "manifest_unknown_slugs": sum(1 for e in manifest if e.get("slug", "").startswith("unknown_")),
        "entries_unknown_slugs": sum(1 for e in entries if e.get("slug", "").startswith("unknown_")),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    entries = json.loads(ENTRIES.read_text())
    catalog = load_brand_catalog(entries)
    slugs = [c[0] for c in catalog]
    unknowns = list_unknown_banners()
    unknown_ids = [u[0] for u in unknowns]

    print(f"OCR on {len(unknowns)} banners…", file=sys.stderr)
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)

    matrix: list[list[float]] = []
    ocr_dump: dict[str, str] = {}
    for i, (unknown_id, banner_path) in enumerate(unknowns):
        text = ocr_text(reader, banner_path)
        ocr_dump[unknown_id] = text
        row = [score_ocr_vs_brand(text, aliases) for _, _, aliases in catalog]
        matrix.append(row)
        if (i + 1) % 20 == 0:
            print(f"  OCR {i + 1}/{len(unknowns)}", file=sys.stderr)

    cost = np.array(matrix, dtype=float)
    # maximize scores -> minimize negative
    cost = cost.max() - cost
    row_ind, col_ind = linear_sum_assignment(cost)
    assignments = {unknown_ids[r]: slugs[c] for r, c in zip(row_ind, col_ind)}

    manifest = json.loads(MANIFEST.read_text())
    report = apply_moves(assignments, manifest, entries, args.dry_run)
    report["ocr_samples"] = {k: ocr_dump[k][:120] for k in list(VALIDATED.keys())}

    if not args.dry_run:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
        ENTRIES.write_text(json.dumps(entries, indent=2) + "\n")
        report["verification"] = verify()
    else:
        report["verification"] = {"dry_run": True}

    report["summary"] = {
        "moved": len(report["moved"]),
        "skipped_existing": len(report["skipped_existing"]),
        "validated_ok": len(report["validated_ok"]),
        "validated_fail": len(report["validated_fail"]),
    }
    print(json.dumps(report, indent=2))
    return 1 if report["validated_fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
