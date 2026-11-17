#!/usr/bin/env bash
set -euo pipefail
# Complete, pinned upstream source import. Run in a trusted environment with git access.
UPSTREAM="https://github.com/rodrigoangeloni/free-llm-api.git"
TARGET="experiments/freellmapi/upstream"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone --no-checkout "$UPSTREAM" "$TMP/source"
git -C "$TMP/source" checkout main
UPSTREAM_SHA="$(git -C "$TMP/source" rev-parse HEAD)"
mkdir -p "$TARGET"
# Remove the earlier partial snapshot; preserve this import script outside upstream.
find "$TARGET" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -C "$TMP/source" --exclude=.git -cf - . | tar -C "$TARGET" -xf -
printf '%s\n' "$UPSTREAM_SHA" > experiments/freellmapi/UPSTREAM_COMMIT
git add -A experiments/freellmapi
git commit -m "vendor: import complete FreeLLMAPI upstream at $UPSTREAM_SHA"
echo "Complete snapshot committed: $UPSTREAM_SHA"
