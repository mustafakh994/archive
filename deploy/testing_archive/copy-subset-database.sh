#!/usr/bin/env bash
# Copy a small, consistent slice of the production archive DB into the testing DB.
# Requires: pg_dump, psql, and access to both servers (e.g. 127.0.0.1:5436 prod, 127.0.0.1:5437 testing).
#
# Usage:
#   export SRC_URI="postgresql://archive_user:PASSWORD@127.0.0.1:5436/fromstoarchive_alaa"
#   export DST_URI="postgresql://testing_archive_user:PASSWORD@127.0.0.1:5437/fromstoarchive_testing"
#   ./copy-subset-database.sh
#
# Optional:
#   SUBMISSION_LIMIT=200 ./copy-subset-database.sh
#
set -euo pipefail

SUBMISSION_LIMIT="${SUBMISSION_LIMIT:-100}"

if [[ -z "${SRC_URI:-}" || -z "${DST_URI:-}" ]]; then
  echo "Set SRC_URI and DST_URI to PostgreSQL connection URIs (see script header)." >&2
  exit 1
fi

echo "=== 1) Replace destination schema (from source, with DROP IF EXISTS) ==="
pg_dump --dbname="$SRC_URI" --schema-only --no-owner --no-acl --clean --if-exists \
  | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1

echo "=== 2) Copy core reference data (full tables, FK-safe order) ==="
REF_TABLES=(
  '"Departments"'
  '"Roles"'
  '"Permissions"'
  '"RolePermissions"'
  '"Users"'
  '"UserPermissions"'
  '"SuperAdminUsers"'
  '"Forms"'
  '"FormSchemaVersions"'
  '"FormPermissions"'
  '"Assignments"'
  '"WebhookEndpoints"'
  '"Webhooks"'
)

for t in "${REF_TABLES[@]}"; do
  echo "  -> $t"
  psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (SELECT * FROM $t) TO STDOUT" \
    | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy $t FROM STDIN"
done

echo "=== 3) Copy last $SUBMISSION_LIMIT form submissions (by SubmittedAt) ==="
psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT * FROM \"FormSubmissions\"
  WHERE \"Id\" IN (
    SELECT \"Id\" FROM \"FormSubmissions\"
    ORDER BY \"SubmittedAt\" DESC
    LIMIT ${SUBMISSION_LIMIT}
  )
) TO STDOUT" | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy \"FormSubmissions\" FROM STDIN"

echo "=== 4) Copy file rows referenced by those submissions (before link rows) ==="
psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT DISTINCT fa.* FROM \"FileAttachments\" fa
  INNER JOIN \"FormSubmissionAttachments\" fsa ON fsa.\"FileAttachmentId\" = fa.\"Id\"
  WHERE fsa.\"FormSubmissionId\" IN (
    SELECT \"Id\" FROM \"FormSubmissions\"
    ORDER BY \"SubmittedAt\" DESC
    LIMIT ${SUBMISSION_LIMIT}
  )
) TO STDOUT" | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy \"FileAttachments\" FROM STDIN"

psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT fsa.* FROM \"FormSubmissionAttachments\" fsa
  WHERE fsa.\"FormSubmissionId\" IN (
    SELECT \"Id\" FROM \"FormSubmissions\"
    ORDER BY \"SubmittedAt\" DESC
    LIMIT ${SUBMISSION_LIMIT}
  )
) TO STDOUT" | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy \"FormSubmissionAttachments\" FROM STDIN"

echo "=== 5) Optional samples of large tables (trim or remove this block if unwanted) ==="
psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT * FROM \"AuditLogs\" ORDER BY \"CreatedAt\" DESC LIMIT 500
) TO STDOUT" | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy \"AuditLogs\" FROM STDIN" || true

psql --dbname="$SRC_URI" -v ON_ERROR_STOP=1 -c "\\copy (
  SELECT * FROM \"UsageMetrics\" ORDER BY \"RecordedAt\" DESC LIMIT 500
) TO STDOUT" | psql --dbname="$DST_URI" -v ON_ERROR_STOP=1 -c "\\copy \"UsageMetrics\" FROM STDIN" || true

echo "Done. Not copied: \"RefreshTokens\", \"WebhookDeliveries\", \"AttachmentPdfJobs\" (empty on testing is fine)."
echo "Users must sign in again. For attachment bytes, run sync-subset-uploads.sh against prod + testing volumes."
