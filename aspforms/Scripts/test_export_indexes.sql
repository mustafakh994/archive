-- Test script for export optimization indexes
-- This script tests the performance of queries that will be used by the export functionality

-- Test 1: Query with FormId and date range filtering (should use IX_FormSubmissions_FormId_SubmittedAt)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT fs.Id, fs.FormId, fs.ResponseData, fs.SubmitterEmail, fs.SubmittedAt
FROM "FormSubmissions" fs
WHERE fs."FormId" = '60000000-0000-0000-0000-000000000001'
  AND fs."SubmittedAt" >= '2024-01-01'::timestamptz
  AND fs."SubmittedAt" <= '2024-12-31'::timestamptz
ORDER BY fs."SubmittedAt" DESC;

-- Test 2: Query with JSONB search (should use IX_FormSubmissions_ResponseData_GIN)
EXPLAIN (ANALYZE, BUFFERS)
SELECT fs.Id, fs.FormId, fs.ResponseData, fs.SubmitterEmail, fs.SubmittedAt
FROM "FormSubmissions" fs
WHERE fs."FormId" = '60000000-0000-0000-0000-000000000001'
  AND fs."ResponseData" @> '{"firstName": "Alice"}'::jsonb;

-- Test 3: Query with email search (should use IX_FormSubmissions_SubmitterEmail or IX_FormSubmissions_SubmitterEmail_GIN)
EXPLAIN (ANALYZE, BUFFERS)
SELECT fs.Id, fs.FormId, fs.ResponseData, fs.SubmitterEmail, fs.SubmittedAt
FROM "FormSubmissions" fs
WHERE fs."FormId" = '60000000-0000-0000-0000-000000000001'
  AND fs."SubmitterEmail" ILIKE '%alice%';

-- Test 4: Combined query with all filters (export scenario)
EXPLAIN (ANALYZE, BUFFERS)
SELECT fs.Id, fs.FormId, fs.ResponseData, fs.SubmitterEmail, fs.SubmittedAt, fs.FormVersion, fs.SubmitterIp
FROM "FormSubmissions" fs
WHERE fs."FormId" = '60000000-0000-0000-0000-000000000001'
  AND fs."SubmittedAt" >= '2024-01-01'::timestamptz
  AND fs."SubmittedAt" <= '2024-12-31'::timestamptz
  AND (fs."ResponseData"::text ILIKE '%software%' OR fs."SubmitterEmail" ILIKE '%alice%')
ORDER BY fs."SubmittedAt" DESC
LIMIT 1000;

-- Test 5: Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FormSubmissions'
ORDER BY indexname;

-- Test 6: Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'FormSubmissions'
ORDER BY indexname;