#!/usr/bin/env python3
"""Match unknown shop-page-banner logos to brand slugs via perceptual hash + Hungarian assignment."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import imagehash
import numpy as np
from PIL import Image
from scipy.optimize import linear_sum_assignment

REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_LOGOS = REPO_ROOT / "docs/assets/brand-logos"
MANIFEST = BRAND_LOGOS / "manifest.json"
ENTRIES = REPO_ROOT / "scripts/figma-brand-logos/.entries.json"

REF_CATEGORIES = ("default-shop-card", "default-shop-card-cover", "logo-circle")

VALIDATED = {
    "unknown_15_1466": "sasa",
    "unknown_15_1471": "jazeera",
    "unknown_28_515": "tiktok_b2b",
    "unknown_15_214": "cotton_on",
    "unknown_15_1458": "geekbuying",
}


def phash(path: Path) -> imagehash.ImageHash | None:
    try:
        with Image.open(path) as img:
            rgba = img.convert("RGBA")
            bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            composed = Image.alpha_composite(bg, rgba).convert("RGB")
            return imagehash.phash(composed)
    except OSError:
        return None


def build_references() -> dict[str, list[Path]]:
    refs: dict[str, list[Path]] = {}
    for slug_dir in sorted(BRAND_LOGOS.iterdir()):
        if not slug_dir.is_dir() or slug_dir.name.startswith("unknown_"):
            continue
        paths = [slug_dir / cat / "logo.png" for cat in REF_CATEGORIES]
        paths = [p for p in paths if p.is_file()]
        if paths:
            refs[slug_dir.name] = paths
    return refs


def distance_banner_to_slug(banner_hash: imagehash.ImageHash, ref_paths: list[Path]) -> int:
    best = 999
    for ref in ref_paths:
        ref_hash = phash(ref)
        if ref_hash is None:
            continue
        best = min(best, banner_hash - ref_hash)
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


def load_brand_name(slug: str, manifest: list[dict]) -> str:
    for entry in manifest:
        if entry.get("slug") == slug and entry.get("category") == "default-shop-card":
            return entry.get("brand", slug)
    for entry in manifest:
        if entry.get("slug") == slug:
            return entry.get("brand", slug)
    return slug


def apply_moves(
    assignments: dict[str, tuple[str, int]],
    manifest: list[dict],
    entries: list[dict],
    dry_run: bool,
) -> dict:
    report: dict = {
        "moved": [],
        "skipped_existing": [],
        "validated_ok": [],
        "validated_fail": [],
    }

    for unknown_slug, (target_slug, score) in sorted(assignments.items()):
        src_dir = BRAND_LOGOS / unknown_slug
        src_logo = src_dir / "shop-page-banner" / "logo.png"
        dest_dir = BRAND_LOGOS / target_slug / "shop-page-banner"
        dest_logo = dest_dir / "logo.png"
        brand_name = load_brand_name(target_slug, manifest)

        if dest_logo.exists():
            report["skipped_existing"].append(
                {"unknown": unknown_slug, "slug": target_slug, "score": score}
            )
            if not dry_run:
                shutil.rmtree(src_dir, ignore_errors=True)
        else:
            report["moved"].append(
                {"unknown": unknown_slug, "slug": target_slug, "score": score, "brand": brand_name}
            )
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
            expected = VALIDATED[unknown_slug]
            if target_slug == expected:
                report["validated_ok"].append(unknown_slug)
            else:
                report["validated_fail"].append(
                    {"unknown": unknown_slug, "expected": expected, "got": target_slug, "score": score}
                )

    return report


def verify() -> dict:
    unknown_dirs = sorted(
        d.name for d in BRAND_LOGOS.iterdir() if d.is_dir() and d.name.startswith("unknown_")
    )
    manifest = json.loads(MANIFEST.read_text())
    entries = json.loads(ENTRIES.read_text())
    return {
        "unknown_dirs_remaining": len(unknown_dirs),
        "manifest_unknown_slugs": sum(1 for e in manifest if e.get("slug", "").startswith("unknown_")),
        "entries_unknown_slugs": sum(1 for e in entries if e.get("slug", "").startswith("unknown_")),
        "shop_page_banner_count": len(list(BRAND_LOGOS.glob("*/shop-page-banner/logo.png")))
        - len(unknown_dirs),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    if args.verify_only:
        print(json.dumps(verify(), indent=2))
        return 0

    refs = build_references()
    unknowns = list_unknown_banners()
    slugs = sorted(refs.keys())
    unknown_ids = [u[0] for u in unknowns]

    print(f"Scoring {len(unknowns)} banners × {len(slugs)} slugs (phash)", file=sys.stderr)
    matrix: list[list[int]] = []
    for unknown_id, banner_path in unknowns:
        banner_hash = phash(banner_path)
        if banner_hash is None:
            matrix.append([999] * len(slugs))
            continue
        matrix.append([distance_banner_to_slug(banner_hash, refs[s]) for s in slugs])

    cost = np.array(matrix, dtype=float)
    row_ind, col_ind = linear_sum_assignment(cost)
    assignments = {unknown_ids[r]: (slugs[c], int(matrix[r][c])) for r, c in zip(row_ind, col_ind)}

    manifest = json.loads(MANIFEST.read_text())
    entries = json.loads(ENTRIES.read_text())
    report = apply_moves(assignments, manifest, entries, args.dry_run)

    if not args.dry_run:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
        ENTRIES.write_text(json.dumps(entries, indent=2) + "\n")

    report["summary"] = {
        "moved": len(report["moved"]),
        "skipped_existing": len(report["skipped_existing"]),
        "validated_ok": len(report["validated_ok"]),
        "validated_fail": len(report["validated_fail"]),
    }
    report["verification"] = verify() if not args.dry_run else {"dry_run": True}
    print(json.dumps(report, indent=2))
    return 1 if report["validated_fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
