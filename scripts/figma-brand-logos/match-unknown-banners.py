#!/usr/bin/env python3
"""Match unknown shop-page-banner logos to brand slugs via ORB feature matching."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_LOGOS = REPO_ROOT / "docs/assets/brand-logos"
MANIFEST = BRAND_LOGOS / "manifest.json"
ENTRIES = REPO_ROOT / "scripts/figma-brand-logos/.entries.json"

REF_CATEGORIES = ("default-shop-card", "default-shop-card-cover", "logo-circle")
ORB_FEATURES = 500

VALIDATED = {
    "unknown_15_1466": "sasa",
    "unknown_15_1471": "jazeera",
    "unknown_28_515": "tiktok_b2b",
    "unknown_15_214": "cotton_on",
    "unknown_15_1458": "geekbuying",
}


def load_gray(path: Path) -> np.ndarray | None:
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    if img.ndim == 3 and img.shape[2] == 4:
        bg = np.ones((*img.shape[:2], 3), dtype=np.uint8) * 255
        alpha = img[:, :, 3:4] / 255.0
        img = (img[:, :, :3] * alpha + bg * (1 - alpha)).astype(np.uint8)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def orb_match_count(banner_path: Path, ref_path: Path) -> int:
    banner = load_gray(banner_path)
    ref = load_gray(ref_path)
    if banner is None or ref is None:
        return 0
    orb = cv2.ORB_create(ORB_FEATURES)
    _, des_ref = orb.detectAndCompute(ref, None)
    _, des_banner = orb.detectAndCompute(banner, None)
    if des_ref is None or des_banner is None:
        return 0
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    return len(bf.match(des_ref, des_banner))


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


def score_banner_vs_slug(banner_path: Path, ref_paths: list[Path]) -> int:
    return max(orb_match_count(banner_path, ref) for ref in ref_paths)


def list_unknown_banners() -> list[tuple[str, Path]]:
    result: list[tuple[str, Path]] = []
    for d in sorted(BRAND_LOGOS.iterdir()):
        if not d.is_dir() or not d.name.startswith("unknown_"):
            continue
        logo = d / "shop-page-banner" / "logo.png"
        if logo.is_file():
            result.append((d.name, logo))
    return result


def optimal_assign(
    unknown_ids: list[str], slugs: list[str], scores: list[list[int]]
) -> dict[str, tuple[str, int]]:
    """Maximize total ORB matches via Hungarian algorithm (minimize negative scores)."""
    from scipy.optimize import linear_sum_assignment

    cost = np.array(scores, dtype=float)
    cost = cost.max() - cost  # invert for maximization
    row_ind, col_ind = linear_sum_assignment(cost)
    return {
        unknown_ids[r]: (slugs[c], scores[r][c])
        for r, c in zip(row_ind, col_ind)
    }


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
        "unmatched": [],
        "validated_ok": [],
        "validated_fail": [],
    }

    for unknown_slug, (target_slug, score) in sorted(assignments.items()):
        src_dir = BRAND_LOGOS / unknown_slug
        src_logo = src_dir / "shop-page-banner" / "logo.png"
        dest_dir = BRAND_LOGOS / target_slug / "shop-page-banner"
        dest_logo = dest_dir / "shop-page-banner/logo.png" if False else dest_dir / "logo.png"
        brand_name = load_brand_name(target_slug, manifest)

        if dest_logo.exists():
            existing_score = score_banner_vs_slug(src_logo, build_references().get(target_slug, []))
            report["skipped_existing"].append(
                {
                    "unknown": unknown_slug,
                    "slug": target_slug,
                    "score": score,
                    "existing_at": str(dest_logo.relative_to(REPO_ROOT)),
                }
            )
            if not dry_run:
                shutil.rmtree(src_dir, ignore_errors=True)
        else:
            report["moved"].append(
                {
                    "unknown": unknown_slug,
                    "slug": target_slug,
                    "score": score,
                    "brand": brand_name,
                }
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
                    {
                        "unknown": unknown_slug,
                        "expected": expected,
                        "got": target_slug,
                        "score": score,
                    }
                )

    return report


def verify() -> dict:
    unknown_dirs = sorted(
        d.name for d in BRAND_LOGOS.iterdir() if d.is_dir() and d.name.startswith("unknown_")
    )
    manifest = json.loads(MANIFEST.read_text())
    entries = json.loads(ENTRIES.read_text())
    manifest_unknown = [e for e in manifest if e.get("slug", "").startswith("unknown_")]
    entries_unknown = [e for e in entries if e.get("slug", "").startswith("unknown_")]
    banner_paths = [
        p
        for p in BRAND_LOGOS.glob("*/shop-page-banner/logo.png")
        if not p.parts[-3].startswith("unknown_")
    ]
    return {
        "unknown_dirs_remaining": len(unknown_dirs),
        "unknown_dirs_sample": unknown_dirs[:5],
        "manifest_unknown_slugs": len(manifest_unknown),
        "entries_unknown_slugs": len(entries_unknown),
        "shop_page_banner_count": len(banner_paths),
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

    print(f"Building score matrix: {len(unknowns)} banners × {len(slugs)} slugs", file=sys.stderr)
    matrix: list[list[int]] = []
    for i, (_, banner_path) in enumerate(unknowns):
        row = [score_banner_vs_slug(banner_path, refs[s]) for s in slugs]
        matrix.append(row)
        if (i + 1) % 10 == 0:
            print(f"  scored {i + 1}/{len(unknowns)}", file=sys.stderr)

    assignments = optimal_assign(unknown_ids, slugs, matrix)

    manifest = json.loads(MANIFEST.read_text())
    entries = json.loads(ENTRIES.read_text())
    report = apply_moves(assignments, manifest, entries, args.dry_run)

    if not args.dry_run:
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
        ENTRIES.write_text(json.dumps(entries, indent=2) + "\n")

    report["summary"] = {
        "moved": len(report["moved"]),
        "skipped_existing": len(report["skipped_existing"]),
        "unmatched": len(report["unmatched"]),
        "validated_ok": len(report["validated_ok"]),
        "validated_fail": len(report["validated_fail"]),
    }
    report["verification"] = verify() if not args.dry_run else {"dry_run": True}

    print(json.dumps(report, indent=2))
    return 1 if report["validated_fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
