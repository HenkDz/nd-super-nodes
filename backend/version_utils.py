"""Version and update helpers for ND Super Nodes."""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    import aiohttp
except Exception:  # pragma: no cover - optional dependency on some installs
    aiohttp = None  # type: ignore

try:
    import folder_paths  # type: ignore
except Exception:  # pragma: no cover - folder_paths unavailable outside ComfyUI
    folder_paths = None  # type: ignore

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VERSION_FILE = os.path.join(ROOT_DIR, "version.json")
CACHE_FILENAME = "nd_super_nodes_update_cache.json"
CHECK_INTERVAL_SECONDS = 24 * 60 * 60  # once per day per session
GITHUB_RELEASE_URL = "https://api.github.com/repos/HenkDz/nd-super-nodes/releases/latest"
USER_AGENT = "ND-Super-Nodes-Updater"

_cache_data: Optional[Dict[str, Any]] = None
_cache_lock = asyncio.Lock()
_cache_timestamp: float = 0.0


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _cache_path() -> str:
    """Return the cache file path, preferring the ComfyUI user directory."""
    base_dir: str
    if folder_paths is not None:
        try:
            base_dir = folder_paths.get_user_directory()
        except Exception:
            base_dir = ROOT_DIR
    else:
        base_dir = ROOT_DIR

    cache_dir = os.path.join(base_dir, "nd_super_nodes")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, CACHE_FILENAME)


def _read_json(path: str) -> Optional[Dict[str, Any]]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _write_json(path: str, payload: Dict[str, Any]) -> None:
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
    except Exception as exc:
        print(f"ND Super Nodes: Failed to write cache '{path}': {exc}")


def get_local_version() -> Dict[str, Any]:
    """Read local version information from the packaged manifest."""
    data = _read_json(VERSION_FILE) or {}
    version = str(data.get("version") or "0.0.0")
    built_at = str(data.get("builtAt") or "")
    if not built_at:
        built_at = _now().isoformat()
    return {
        "version": version,
        "builtAt": built_at,
    }


def _parse_version(value: Optional[str]) -> tuple:
    if not value:
        return tuple()
    # Extract numeric segments; fall back to zero when absent
    parts = [int(part) for part in re.findall(r"\d+", value)]
    return tuple(parts)


async def _fetch_latest_release() -> Optional[Dict[str, Any]]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    }

    if aiohttp is not None:
        timeout = aiohttp.ClientTimeout(total=12)
        try:
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(GITHUB_RELEASE_URL) as response:
                    if response.status != 200:
                        text = await response.text()
                        print(
                            "ND Super Nodes: GitHub release check failed",
                            response.status,
                            text[:200],
                        )
                        return None
                    return await response.json()
        except Exception as exc:
            print(f"ND Super Nodes: GitHub release lookup error: {exc}")
            return None

    def _fetch_sync() -> Optional[Dict[str, Any]]:
        request = urllib.request.Request(GITHUB_RELEASE_URL, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=12) as resp:  # type: ignore[arg-type]
                status = getattr(resp, "status", None) or getattr(resp, "code", None)
                if status != 200:
                    snippet = resp.read(200).decode("utf-8", "ignore")
                    print("ND Super Nodes: GitHub release check failed", status, snippet)
                    return None
                raw = resp.read().decode("utf-8", "ignore")
                return json.loads(raw)
        except urllib.error.URLError as exc:
            print(f"ND Super Nodes: GitHub release lookup error: {exc}")
            return None

    return await asyncio.to_thread(_fetch_sync)


def _compose_status(
    local_version: Dict[str, Any],
    release_payload: Optional[Dict[str, Any]],
    checked_at: datetime,
) -> Dict[str, Any]:
    current_version = local_version.get("version", "0.0.0")
    latest_tag = (release_payload or {}).get("tag_name")
    latest_version = str(latest_tag or "").lstrip("v")
    release_url = (release_payload or {}).get("html_url")
    published_at = (release_payload or {}).get("published_at")

    current_tuple = _parse_version(str(current_version))
    latest_tuple = _parse_version(latest_version)
    has_update = bool(latest_tuple and latest_tuple > current_tuple)

    return {
        "checkedAt": checked_at.isoformat(),
        "localVersion": local_version,
        "latestVersion": latest_version,
        "publishedAt": published_at,
        "releaseUrl": release_url,
        "hasUpdate": has_update,
        "raw": {
            "tag": latest_tag,
            "name": (release_payload or {}).get("name"),
            "notes": (release_payload or {}).get("body"),
            "prerelease": (release_payload or {}).get("prerelease", False),
        },
    }


def _load_cached_status() -> Optional[Dict[str, Any]]:
    cache_path = _cache_path()
    data = _read_json(cache_path)
    if not data:
        return None
    return data


def _persist_status(status: Dict[str, Any]) -> None:
    _write_json(_cache_path(), status)


async def get_update_status(force: bool = False) -> Dict[str, Any]:
    """Return cached or freshly fetched update status."""
    global _cache_data, _cache_timestamp

    now = time.time()
    async with _cache_lock:
        if (
            not force
            and _cache_data is not None
            and now - _cache_timestamp < CHECK_INTERVAL_SECONDS
        ):
            return _cache_data

        cached = None if force else _load_cached_status()
        if cached:
            # Invalidate cache if local version has changed (e.g., after update)
            current_version = get_local_version().get("version", "0.0.0")
            if cached.get('localVersion', {}).get('version') != current_version:
                cached = None
            else:
                try:
                    checked_at = datetime.fromisoformat(cached.get("checkedAt"))
                    age = (_now() - checked_at).total_seconds()
                    if age < CHECK_INTERVAL_SECONDS:
                        _cache_data = cached
                        _cache_timestamp = now
                        return cached
                except Exception:
                    pass

        release_payload = await _fetch_latest_release()
        status = _compose_status(get_local_version(), release_payload, _now())
        _cache_data = status
        _cache_timestamp = now
        _persist_status(status)
        return status


async def clear_update_cache() -> None:
    """Remove cached update data (useful for tests/debug)."""
    global _cache_data, _cache_timestamp
    async with _cache_lock:
        _cache_data = None
        _cache_timestamp = 0.0
        cache_file = _cache_path()
        try:
            if os.path.exists(cache_file):
                os.remove(cache_file)
        except Exception as exc:
            print(f"ND Super Nodes: Failed to clear update cache: {exc}")

