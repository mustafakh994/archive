-- Remove Export Optimization Indexes
-- This script removes the export optimization indexes if needed

-- Drop the indexes in reverse order of creation
DROP INDEX IF EXISTS IX_FormSubmissions_SubmitterEmail_GIN;
DROP INDEX IF EXISTS IX_FormSubmissions_SubmitterEmail;
DROP INDEX IF EXISTS IX_FormSubmissions_ResponseData_GIN;
DROP INDEX IF EXISTS IX_FormSubmissions_FormId_SubmittedAt;

-- Verify indexes were removed
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FormSubmissions'
  AND indexname LIKE 'IX_FormSubmissions_%'
ORDER BY indexname;