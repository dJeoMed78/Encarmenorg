#!/usr/bin/env bash
# ONLY staging.encarmen.org — keep old release and private selective backup.
set -euo pipefail
SHA="${1:?SHA required}"
case "$SHA" in *[!a-f0-9]*|'') echo "SHA inválido" >&2; exit 2;; esac
[[ "${#SHA}" -eq 40 ]] || exit 2
ROOT="$HOME/domains/staging.encarmen.org/hbuilds"
BACKUP="$HOME/encarmen-staging-backups/files"
ACTIVE="$ROOT/current"
PROD="$HOME/domains/encarmen.org"
[[ -d "$ROOT/versions" && -L "$ACTIVE" && -d "$BACKUP" ]] || exit 3
[[ "$(stat -c %a "$HOME/encarmen-staging-backups")" = 700 ]] || exit 3
[[ -d "$PROD" && "$(realpath "$ROOT")" != "$(realpath "$PROD")" ]] || exit 3
OLD_LINK=$(readlink "$ACTIVE")
case "$OLD_LINK" in versions/*) ;; *) echo "Active no compatible" >&2; exit 3;; esac
OLD_REAL=$(realpath "$ACTIVE")
case "$OLD_REAL" in "$ROOT/versions/"*) ;; *) exit 3;; esac
OLD="$ACTIVE/nodejs"
[[ -f "$OLD/server.js" && -d "$OLD/dist" ]] || exit 3
ID="enc-coord-${SHA:0:12}"
NEW="$ROOT/versions/$ID"
if [[ -e "$NEW" ]]; then
  [[ -d "$NEW/nodejs" && -f "$NEW/nodejs/server.js" && ! -L "$NEW" ]] || { echo "Version candidate parcial inesperada"; exit 3; }
  echo "REUSING_PREVIOUS_CANDIDATE_DIRECTORY=$NEW"
fi
TODAY=$(date -u +%Y-%m-%d)
SNAP="$BACKUP/$TODAY"
mkdir -p -m 700 "$SNAP"
chmod 700 "$SNAP"
TARBALL="$SNAP/predeploy-$ID.tar.gz"
if [[ -f "$TARBALL" ]]; then gzip -t "$TARBALL"; fi
# Only changed files and web assets; old version itself remains untouched.
if [[ ! -f "$TARBALL" ]]; then
  tar -czf "$TARBALL" -C "$OLD" server.js dist api/server.bundle.js
fi
gzip -t "$TARBALL"
sha256sum "$TARBALL" | awk '{print $1}' > "$TARBALL.sha256"
printf 'OLD_LINK=%s\nNEW_ID=%s\nBACKUP=%s\n' "$OLD_LINK" "$ID" "$TARBALL" > "$SNAP/$ID.manifest"
chmod 600 "$TARBALL" "$TARBALL.sha256" "$SNAP/$ID.manifest"
echo "BACKUP_READY=$TARBALL"
# Copy existing installation into a new version, preserving runtime data files.
if [[ ! -d "$NEW" ]]; then
  mkdir -p "$NEW"
  cp -a "$OLD_REAL/nodejs" "$NEW/nodejs"
  cp -a "$OLD_REAL/.metadata.json" "$NEW/.metadata.json"
fi
# Archive was uploaded beforehand to the private backup root.
PAYLOAD="$HOME/encarmen-staging-backups/payload-$ID.tar.gz"
[[ -f "$PAYLOAD" && ! -L "$PAYLOAD" ]] || exit 4
tar -tzf "$PAYLOAD" | grep -qx 'server.js' || { echo "Bundle missing"; exit 4; }
tar -xzf "$PAYLOAD" -C "$NEW/nodejs"
# The new metadata is owned only by the new release.
python3 - "$NEW/.metadata.json" "$ID" <<'PY'
import json,sys
path,version=sys.argv[1:]
with open(path) as stream: data=json.load(stream)
data["build_id"]=version
with open(path,"w") as stream: json.dump(data,stream)
PY
test -f "$NEW/nodejs/server.js"
test -f "$NEW/nodejs/dist/index.html"
test -f "$NEW/nodejs/api/server.bundle.js"
# Ensure no unexpected switch since initial read.
[[ "$(readlink "$ACTIVE")" = "$OLD_LINK" ]] || { echo "Active changed during deployment"; exit 5; }
SWAP="$ROOT/.current-enc-coord"
[[ ! -e "$SWAP" && ! -L "$SWAP" ]] || exit 5
ln -s "versions/$ID" "$SWAP"
mv -Tf "$SWAP" "$ACTIVE"
mkdir -p "$NEW/nodejs/tmp"
touch "$NEW/nodejs/tmp/restart.txt"
echo "SWITCHED_TO=$ID"
echo "PREVIOUS=$OLD_LINK"
# Restore only when health status is non-200. The caller verifies publicly.
