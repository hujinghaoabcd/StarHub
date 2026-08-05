#!/usr/bin/env python3
"""Collect logos for all public repositories starred by a GitHub user.

Priority: explicit SVG -> README SVG/image -> explicit raster -> owner avatar.
Output: one flat directory, content-deduplicated images, CSV/JSON manifests, ZIP64 archive.
"""
from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import json
import os
import re
import sys
import time
import zipfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, unquote

import aiohttp
from PIL import Image, UnidentifiedImageError

USER = os.environ.get("STAR_USER", "hujinghaoabcd")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
OUT_DIR = Path(os.environ.get("OUT_DIR", "star-project-logos"))
ZIP_PATH = Path(os.environ.get("ZIP_PATH", "star-project-logos.zip"))
CONCURRENCY = int(os.environ.get("CONCURRENCY", "56"))
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))
AVATAR_SIZE = int(os.environ.get("AVATAR_SIZE", "192"))

SVG_PATHS = (
    "logo.svg", "assets/logo.svg", "docs/logo.svg", "docs/assets/logo.svg",
    "public/logo.svg", "static/logo.svg", "images/logo.svg", ".github/logo.svg", "icon.svg",
)
RASTER_PATHS = (
    "logo.png", "assets/logo.png", "docs/logo.png", "docs/assets/logo.png",
    "public/logo.png", "static/logo.png", "images/logo.png", ".github/logo.png", "icon.png",
)
README_PATHS = ("README.md", "README.rst", "README.markdown", "readme.md")
BAD_HINTS = (
    "badge", "shield", "travis", "circleci", "appveyor", "codecov", "coveralls",
    "workflow", "actions/workflows", "build-status", "npm/v", "pypi/v", "license",
    "contributors", "sponsor", "backer", "opencollective", "gitter", "discord",
    "stars", "forks", "downloads", "version", "status.svg", "status.png",
)
GOOD_HINTS = ("logo", "brand", "icon", "mark", "identity", "header", "banner")
IMAGE_EXTS = (".svg", ".png", ".webp", ".jpg", ".jpeg", ".gif", ".ico")


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return value[:180] or "image"


def is_svg(data: bytes, content_type: str = "") -> bool:
    head = data[:4096].lstrip().lower()
    return "svg" in content_type.lower() or b"<svg" in head


def normalize_image(data: bytes) -> tuple[bytes, str, int | None, int | None, bool] | None:
    if is_svg(data):
        if b"<svg" not in data[:65536].lower():
            return None
        return data, "svg", None, None, True
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            width, height = im.size
            if width < 16 or height < 16:
                return None
            has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
            target = im.convert("RGBA" if has_alpha else "RGB")
            out = io.BytesIO()
            target.save(out, format="PNG", optimize=True)
            return out.getvalue(), "png", width, height, has_alpha
    except (UnidentifiedImageError, OSError, ValueError):
        return None


def parse_readme_images(text: str, full_name: str, branch: str, readme_path: str) -> list[tuple[int, str]]:
    found: list[tuple[str, str]] = []
    for m in re.finditer(r"!\[([^\]]*)\]\((?:<)?([^\s)>]+)(?:>)?(?:\s+[\"'][^\"']*[\"'])?\)", text):
        found.append((m.group(1), m.group(2)))
    for m in re.finditer(r"<img\b[^>]*?src=[\"']([^\"']+)[\"'][^>]*>", text, flags=re.I):
        tag = m.group(0)
        alt_m = re.search(r"alt=[\"']([^\"']*)[\"']", tag, flags=re.I)
        found.append((alt_m.group(1) if alt_m else "", m.group(1)))
    refs = {m.group(1).strip().lower(): m.group(2).strip() for m in re.finditer(r"^\s*\[([^\]]+)\]:\s*(\S+)", text, flags=re.M)}
    for m in re.finditer(r"!\[([^\]]*)\]\[([^\]]+)\]", text):
        url = refs.get(m.group(2).strip().lower())
        if url:
            found.append((m.group(1), url))

    base_dir = readme_path.rsplit("/", 1)[0] if "/" in readme_path else ""
    raw_base = f"https://raw.githubusercontent.com/{full_name}/{branch}/"
    scored: list[tuple[int, str]] = []
    seen: set[str] = set()
    repo_name = full_name.split("/", 1)[1].lower()
    for index, (alt, raw_url) in enumerate(found[:80]):
        raw_url = raw_url.strip().strip("<>")
        if raw_url.startswith("data:"):
            continue
        if raw_url.startswith("//"):
            url = "https:" + raw_url
        elif raw_url.startswith(("http://", "https://")):
            url = raw_url
        else:
            rel = unquote(raw_url.split("#", 1)[0])
            path = f"{base_dir}/{rel}" if base_dir else rel
            parts: list[str] = []
            for part in path.split("/"):
                if part in ("", "."):
                    continue
                if part == "..":
                    if parts:
                        parts.pop()
                else:
                    parts.append(part)
            url = raw_base + "/".join(parts)
        m = re.match(r"https://github\.com/([^/]+/[^/]+)/blob/([^/]+)/(.*)", url)
        if m:
            url = f"https://raw.githubusercontent.com/{m.group(1)}/{m.group(2)}/{m.group(3)}"
        key = url.split("#", 1)[0]
        if key in seen:
            continue
        seen.add(key)
        low = (alt + " " + url).lower()
        if any(h in low for h in BAD_HINTS):
            continue
        path_low = urlparse(url).path.lower()
        if not any(ext in path_low for ext in IMAGE_EXTS):
            continue
        score = 1000 - index
        if path_low.endswith(".svg"):
            score += 500
        if any(h in low for h in GOOD_HINTS):
            score += 350
        if repo_name and repo_name in low:
            score += 180
        if any(h in low for h in ("screenshot", "demo", "example", "preview", "architecture", "diagram")):
            score -= 350
        scored.append((score, url))
    scored.sort(reverse=True)
    return scored[:5]


async def fetch_bytes(session: aiohttp.ClientSession, url: str, sem: asyncio.Semaphore, *, max_bytes: int = MAX_IMAGE_BYTES) -> tuple[bytes, str, str] | None:
    try:
        async with sem:
            async with session.get(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=12)) as resp:
                if resp.status != 200:
                    return None
                ctype = resp.headers.get("Content-Type", "")
                clen = resp.headers.get("Content-Length")
                if clen and int(clen) > max_bytes:
                    return None
                data = await resp.content.read(max_bytes + 1)
                if len(data) > max_bytes:
                    return None
                return data, ctype, str(resp.url)
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
        return None


async def fetch_text(session: aiohttp.ClientSession, url: str, sem: asyncio.Semaphore, max_bytes: int = 1_500_000) -> tuple[str, str] | None:
    item = await fetch_bytes(session, url, sem, max_bytes=max_bytes)
    if not item:
        return None
    data, _ctype, final_url = item
    return data.decode("utf-8", errors="replace"), final_url


async def get_starred_repos(session: aiohttp.ClientSession) -> list[dict[str, Any]]:
    repos: list[dict[str, Any]] = []
    url = f"https://api.github.com/users/{USER}/starred?per_page=100"
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    while url:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                raise RuntimeError(f"GitHub API failed: HTTP {resp.status}: {(await resp.text())[:500]}")
            page = await resp.json()
            repos.extend(page)
            next_url = None
            link = resp.headers.get("Link", "")
            for part in link.split(","):
                if 'rel=\"next\"' in part:
                    m = re.search(r"<([^>]+)>", part)
                    if m:
                        next_url = m.group(1)
            url = next_url
            print(f"Fetched starred repositories: {len(repos)}", flush=True)
    return repos


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "StarHub-logo-collector/1.0 (+https://github.com/hujinghaoabcd/StarHub)", "Accept": "*/*"}
    connector = aiohttp.TCPConnector(limit=CONCURRENCY * 2, limit_per_host=CONCURRENCY, ttl_dns_cache=600)
    sem = asyncio.Semaphore(CONCURRENCY)
    async with aiohttp.ClientSession(headers=headers, connector=connector) as session:
        repos = await get_starred_repos(session)
        total = len(repos)
        print(f"Collecting logos for {total} repositories with concurrency={CONCURRENCY}", flush=True)

        hash_to_file: dict[str, str] = {}
        hash_lock = asyncio.Lock()
        manifest: list[dict[str, Any]] = []
        manifest_lock = asyncio.Lock()
        stats: dict[str, int] = {"repo_svg": 0, "readme": 0, "repo_raster": 0, "owner_avatar": 0, "unresolved": 0, "duplicates": 0}
        completed = 0
        completed_lock = asyncio.Lock()

        async def save_candidate(repo: dict[str, Any], data: bytes, source_type: str, source_url: str) -> dict[str, Any] | None:
            normalized = normalize_image(data)
            if not normalized:
                return None
            out_bytes, ext, width, height, alpha = normalized
            digest = hashlib.sha256(out_bytes).hexdigest()
            full = repo["full_name"]
            base = safe_name(full.replace("/", "__"))
            async with hash_lock:
                existing = hash_to_file.get(digest)
                duplicate = existing is not None
                if existing:
                    filename = existing
                    stats["duplicates"] += 1
                else:
                    filename = f"{base}.{ext}"
                    n = 2
                    while (OUT_DIR / filename).exists():
                        filename = f"{base}__{n}.{ext}"
                        n += 1
                    (OUT_DIR / filename).write_bytes(out_bytes)
                    hash_to_file[digest] = filename
            return {"repository": full, "repository_url": repo.get("html_url", ""), "file": filename,
                    "format": ext, "source_type": source_type, "source_url": source_url,
                    "sha256": digest, "duplicate": duplicate, "width": width or "",
                    "height": height or "", "has_alpha": alpha}

        async def collect_one(repo: dict[str, Any]) -> None:
            nonlocal completed
            full = repo["full_name"]
            branch = repo.get("default_branch") or "main"
            raw_base = f"https://raw.githubusercontent.com/{full}/{branch}/"
            row: dict[str, Any] | None = None

            for path in SVG_PATHS:
                item = await fetch_bytes(session, raw_base + path, sem)
                if item:
                    data, _ctype, final_url = item
                    row = await save_candidate(repo, data, "repo_svg", final_url)
                    if row:
                        stats["repo_svg"] += 1
                        break

            if row is None:
                for readme_path in README_PATHS:
                    text_item = await fetch_text(session, raw_base + readme_path, sem)
                    if not text_item:
                        continue
                    text, _ = text_item
                    for _score, image_url in parse_readme_images(text, full, branch, readme_path):
                        item = await fetch_bytes(session, image_url, sem)
                        if not item:
                            continue
                        data, _ctype, final_url = item
                        row = await save_candidate(repo, data, "readme", final_url)
                        if row:
                            stats["readme"] += 1
                            break
                    break

            if row is None:
                for path in RASTER_PATHS:
                    item = await fetch_bytes(session, raw_base + path, sem)
                    if item:
                        data, _ctype, final_url = item
                        row = await save_candidate(repo, data, "repo_raster", final_url)
                        if row:
                            stats["repo_raster"] += 1
                            break

            if row is None:
                avatar_url = ((repo.get("owner") or {}).get("avatar_url") or "").split("?", 1)[0]
                if avatar_url:
                    item = await fetch_bytes(session, f"{avatar_url}?s={AVATAR_SIZE}", sem, max_bytes=2_000_000)
                    if item:
                        data, _ctype, final_url = item
                        row = await save_candidate(repo, data, "owner_avatar", final_url)
                        if row:
                            stats["owner_avatar"] += 1

            if row is None:
                stats["unresolved"] += 1
                row = {"repository": full, "repository_url": repo.get("html_url", ""), "file": "",
                       "format": "", "source_type": "unresolved", "source_url": "", "sha256": "",
                       "duplicate": False, "width": "", "height": "", "has_alpha": ""}
            async with manifest_lock:
                manifest.append(row)
            async with completed_lock:
                completed += 1
                if completed % 250 == 0 or completed == total:
                    print(f"Progress {completed}/{total} | files={len(hash_to_file)} | stats={stats}", flush=True)

        for start in range(0, total, 500):
            await asyncio.gather(*(collect_one(repo) for repo in repos[start:start + 500]))

    manifest.sort(key=lambda r: r["repository"].lower())
    fields = ["repository", "repository_url", "file", "format", "source_type", "source_url", "sha256", "duplicate", "width", "height", "has_alpha"]
    with (OUT_DIR / "manifest.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader(); writer.writerows(manifest)
    summary = {"github_user": USER, "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               "repositories": len(manifest), "unique_images": len(hash_to_file), "statistics": stats,
               "priority": ["explicit SVG", "README image", "explicit PNG", "owner avatar fallback"],
               "deduplication": "SHA-256 after raster normalization to PNG; SVG preserved and hashed as bytes",
               "layout": "flat ZIP; no per-project folders"}
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as zf:
        for path in sorted(OUT_DIR.iterdir(), key=lambda p: p.name.lower()):
            if path.is_file():
                zf.write(path, arcname=path.name)
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    print(f"Created {ZIP_PATH} ({ZIP_PATH.stat().st_size} bytes)", flush=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(130)
