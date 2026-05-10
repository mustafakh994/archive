#!/usr/bin/env bash
# Copy only upload files that appear in the testing DB (after copy-subset-database.sh).
# Run on the host with Docker. Adjust paths if your volume layout differs.
#
# Usage:
#   sudo ./sync-subset-uploads.sh
#
set -euo pipefail

PROD_ROOT="${PROD_UPLOADS_ROOT:-/var/lib/docker/volumes/archive_uploads/_data}"
TEST_ROOT="${TEST_UPLOADS_ROOT:-/var/lib/docker/volumes/testing_archive_uploads/_data}"

if [[ ! -d "$PROD_ROOT" ]]; then
  echo "Prod uploads dir not found: $PROD_ROOT (set PROD_UPLOADS_ROOT)" >&2
  exit 1
fi

mkdir -p "$TEST_ROOT"

IDS_FILE="$(mktemp)"
cleanup() { rm -f "$IDS_FILE"; }
trap cleanup EXIT

docker exec testing-archive-db psql -U "${POSTGRES_USER:-testing_archive_user}" -d "${POSTGRES_DB:-fromstoarchive_testing}" -Atc \
  "SELECT \"FilePath\" FROM \"FileAttachments\";" >"$IDS_FILE" || {
  echo "Could not read FilePath from testing-archive-db. Set POSTGRES_USER / POSTGRES_DB or run after DB copy." >&2
  exit 1
}

count=0
while IFS= read -r raw; do
  [[ -z "$raw" ]] && continue
  rel="$raw"
  rel="${rel#/app/data/uploads_private/}"
  rel="${rel#./}"
  # DB may store full container path or a path under "uploads"
  src="$PROD_ROOT/$rel"
  if [[ ! -f "$src" ]]; then
    base="$(basename "$raw")"
    if [[ -f "$PROD_ROOT/$base" ]]; then
      src="$PROD_ROOT/$base"
    elif [[ -f "$PROD_ROOT/uploads/$base" ]]; then
      src="$PROD_ROOT/uploads/$base"
    fi
  fi
  if [[ -f "$src" ]]; then
    dest="$TEST_ROOT/$rel"
    mkdir -p "$(dirname "$dest")"
    cp -a "$src" "$dest"
    count=$((count + 1))
  else
    echo "missing (skipped): $rel" >&2
  fi
done <"$IDS_FILE"

echo "Copied $count files into $TEST_ROOT"
