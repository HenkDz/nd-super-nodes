#!/usr/bin/env bash
set -euo pipefail

INCLUDE_PRERELEASE=0
FORCE_UPDATE=0

usage() {
  cat <<'HELP'
ND Super Nodes updater (Linux/macOS)

Usage: ./update.sh [--prerelease] [--force]

  --prerelease   Install the latest pre-release build instead of the latest stable
  --force        Re-install even if the current version matches the target version
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prerelease)
      INCLUDE_PRERELEASE=1
      shift
      ;;
    --force)
      FORCE_UPDATE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

log() {
  printf '[ND Super Nodes] %s\n' "$1"
}

log "Using installation at '$ROOT_DIR'"
log "Ensure ComfyUI is stopped before running this updater."

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for this script." >&2
  exit 1
fi

for tool in curl unzip; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "'$tool' is required for this script." >&2
    exit 1
  fi
done

MANIFEST="$ROOT_DIR/version.json"
LOCAL_VERSION=$(python3 <<PY
import json, pathlib
path = pathlib.Path(r"$MANIFEST")
if not path.exists():
    print("0.0.0")
else:
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        print(data.get('version', '0.0.0'))
    except Exception:
        print('0.0.0')
PY
)

log "Current version: $LOCAL_VERSION"

RELEASE_JSON=$(curl -fsSL https://api.github.com/repos/HenkDz/nd-super-nodes/releases)

RELEASE_INFO=$(INCLUDE_PRERELEASE=$INCLUDE_PRERELEASE python3 <<'PY'
import json, os, sys

try:
    data = json.loads(sys.stdin.read())
except Exception as exc:
    print(f"ERROR: failed to parse release feed: {exc}", file=sys.stderr)
    sys.exit(1)

include_prerelease = os.environ.get('INCLUDE_PRERELEASE') == '1'

release = None
for item in data:
    if item.get('draft'):
        continue
    if not include_prerelease and item.get('prerelease'):
        continue
    release = item
    break

if not release:
    print('ERROR: no suitable release found', file=sys.stderr)
    <<<"$RELEASE_JSON")

    LATEST_TAG=$(printf '%s
if not asset:
    ASSET_URL=$(printf '%s
    print('ERROR: release asset nd-super-nodes-v*.zip not found', file=sys.stderr)

    if [[ -z "$LATEST_TAG" || -z "$ASSET_URL" ]]; then
      echo "Failed to parse release metadata." >&2
      exit 1
    fi
    sys.exit(3)

print(release.get('tag_name', ''))
print(asset.get('browser_download_url', ''))
PY
<<<"$RELEASE_JSON")

if [[ ${#RELEASE_DATA[@]} -lt 2 ]]; then
  echo "Failed to parse release metadata." >&2
  exit 1
fi

LATEST_TAG="${RELEASE_DATA[0]}"
ASSET_URL="${RELEASE_DATA[1]}"
LATEST_VERSION=$(python3 <<PY
import re
text = "${LATEST_TAG}"
print(re.sub(r'^v', '', text))
PY
)

log "Latest release: $LATEST_TAG"

VERSION_COMPARE=$(python3 <<'PY'
import itertools, re, sys

local_raw = sys.argv[1]
latest_raw = sys.argv[2]

extract = lambda v: [int(x) for x in re.findall(r'\d+', v)] or [0]
local_parts = extract(local_raw)
latest_parts = extract(latest_raw)

for a, b in itertools.zip_longest(local_parts, latest_parts, fillvalue=0):
    if b > a:
        print(1)
        break
    if b < a:
        print(-1)
        break
else:
    print(0)
PY
"$LOCAL_VERSION" "$LATEST_VERSION")

if [[ $FORCE_UPDATE -ne 1 && $VERSION_COMPARE -le 0 ]]; then
  log "Installation already up to date. Use --force to re-install."
  exit 0
fi

TMP_ZIP=$(mktemp -t nd-super-nodes-zip-XXXXXX)
TMP_ZIP="${TMP_ZIP}.zip"
log "Downloading $LATEST_TAG..."
curl -fsSL "$ASSET_URL" -o "$TMP_ZIP"

BACKUPS_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUPS_DIR"
BACKUP_TARGET="$BACKUPS_DIR/backup-${LOCAL_VERSION}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_TARGET"

shopt -s dotglob nullglob
for item in "$ROOT_DIR"/*; do
  name="$(basename "$item")"
  case "$name" in
    backups|update.sh|update.ps1)
      continue
      ;;
  esac
  cp -R "$item" "$BACKUP_TARGET"/
done
shopt -u dotglob

TMP_DIR=$(mktemp -d -t nd-super-nodes-unpack-XXXXXX)
unzip -q "$TMP_ZIP" -d "$TMP_DIR"

shopt -s dotglob nullglob
for item in "$ROOT_DIR"/*; do
  name="$(basename "$item")"
  case "$name" in
    backups|update.sh|update.ps1)
      continue
      ;;
  esac
  rm -rf "$item"
done

for item in "$TMP_DIR"/*; do
  cp -R "$item" "$ROOT_DIR"/
done
shopt -u dotglob

rm -f "$TMP_ZIP"
rm -rf "$TMP_DIR"

log "Update complete! Installed version $LATEST_TAG."
log "Restart ComfyUI to load the latest ND Super Nodes build."
