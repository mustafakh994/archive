-- Add Export Optimization Indexes
-- This script adds the required indexes for optimizing export queries

-- 1. Add composite index on FormId and SubmittedAt for efficient date filtering
-- This index will be used for queries that filter by form and date range
CREATE INDEX IF NOT EXISTS IX_FormSubmissions_FormId_SubmittedAt 
ON "FormSubmissions"("FormId", "SubmittedAt" DESC);

-- 2. Add GIN index on ResponseData JSONB column for search optimization
-- This index will be used for JSONB search operations
CREATE INDEX IF NOT EXISTS IX_FormSubmissions_ResponseData_GIN 
ON "FormSubmissions" USING gin("ResponseData");

-- 3. Add index on SubmitterEmail for email-based filtering
-- This index will be used for exact email lookups
CREATE INDEX IF NOT EXISTS IX_FormSubmissions_SubmitterEmail 
ON "FormSubmissions"("SubmitterEmail");

-- 4. Add trigram extension for better text search performance (if not already exists)
-- This extension is required for the trigram GIN index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5. Add GIN index on SubmitterEmail using trigram for partial text search
-- This index will be used for LIKE/ILIKE operations on email addresses
CREATE INDEX IF NOT EXISTS IX_FormSubmissions_SubmitterEmail_GIN 
ON "FormSubmissions" USING gin("SubmitterEmail" gin_trgm_ops);

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'FormSubmissions'
  AND indexname LIKE 'IX_FormSubmissions_%'
ORDER BY indexname;