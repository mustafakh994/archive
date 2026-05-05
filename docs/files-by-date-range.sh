#!/usr/bin/env bash
set -euo pipefail

# List files by modified-date range with size/date/path output.
# Example:
#   sudo bash docs/files-by-date-range.sh \
#     --path /var/lib/docker/volumes/archive_uploads/_data \
#     --from "2026-04-01 00:00:00" \
#     --to "2026-04-30 23:59:59" \
#     --sort newest \
#     --limit 100

TARGET_PATH="/var/lib/docker/volumes/archive_uploads/_data"
FROM_DATE=""
TO_DATE=""
LIMIT="0"
SORT_ORDER="newest" # newest | oldest

usage() {
  cat <<'EOF'
Usage:
  files-by-date-range.sh --from "YYYY-MM-DD [HH:MM:SS]" --to "YYYY-MM-DD [HH:MM:SS]" [options]

Required:
  --from      Start datetime (inclusive)
  --to        End datetime (inclusive)

Options:
  --path      Directory to scan (default: /var/lib/docker/volumes/archive_uploads/_data)
  --sort      newest | oldest (default: newest)
  --limit     Max number of lines to print (0 = all, default: 0)
  -h, --help  Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      TARGET_PATH="${2:-}"
      shift 2
      ;;
    --from)
      FROM_DATE="${2:-}"
      shift 2
      ;;
    --to)
      TO_DATE="${2:-}"
      shift 2
      ;;
    --sort)
      SORT_ORDER="${2:-}"
      shift 2
      ;;
    --limit)
      LIMIT="${2:-0}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$FROM_DATE" || -z "$TO_DATE" ]]; then
  echo "Error: --from and --to are required." >&2
  usage
  exit 1
fi

if [[ ! -d "$TARGET_PATH" ]]; then
  echo "Error: path does not exist: $TARGET_PATH" >&2
  exit 1
fi

if ! FROM_EPOCH=$(date -d "$FROM_DATE" +%s 2>/dev/null); then
  echo "Error: invalid --from date format: $FROM_DATE" >&2
  exit 1
fi

if ! TO_EPOCH=$(date -d "$TO_DATE" +%s 2>/dev/null); then
  echo "Error: invalid --to date format: $TO_DATE" >&2
  exit 1
fi

if (( FROM_EPOCH > TO_EPOCH )); then
  echo "Error: --from must be earlier than or equal to --to." >&2
  exit 1
fi

if [[ ! "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "Error: --limit must be a non-negative integer." >&2
  exit 1
fi

case "$SORT_ORDER" in
  newest) SORT_ARGS="-k1,1nr" ;;
  oldest) SORT_ARGS="-k1,1n" ;;
  *)
    echo "Error: --sort must be 'newest' or 'oldest'." >&2
    exit 1
    ;;
esac

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

find "$TARGET_PATH" -type f -printf '%T@|%TY-%Tm-%Td %TH:%TM:%TS|%s|%p\n' > "$TMP_FILE"

awk -F'|' -v from="$FROM_EPOCH" -v to="$TO_EPOCH" '
  {
    ts = int($1);
    if (ts >= from && ts <= to) {
      printf "%s|%s|%s\n", $2, $3, $4;
    }
  }
' "$TMP_FILE" \
| sort -t"|" $SORT_ARGS \
| awk -F"|" -v limit="$LIMIT" '
  {
    if (limit == 0 || NR <= limit) print $0;
  }
' \
| awk -F"|" '
  BEGIN {
    printf "%-19s  %12s  %10s  %10s  %s\n", "Modified", "Size(bytes)", "Size(MiB)", "Size(MB)", "Path";
    printf "%-19s  %12s  %10s  %10s  %s\n", "-------------------", "------------", "----------", "----------", "----";
  }
  {
    size_mib = $2 / 1024 / 1024;
    size_mb  = $2 / 1000 / 1000;
    printf "%-19s  %12d  %10.2f  %10.2f  %s\n", $1, $2, size_mib, size_mb, $3;
  }
'
