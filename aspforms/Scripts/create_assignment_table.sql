-- =============================================
-- Assignment Table Creation Script
-- =============================================
-- This script creates the Assignment table for managing user-role-department assignments
-- Only SuperAdmin users can manage assignments through the API
-- =============================================

-- Create the Assignment table
CREATE TABLE IF NOT EXISTS "Assignments" (
    "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "DepartmentId" uuid NOT NULL,
    "RoleId" uuid NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NULL,
    
    CONSTRAINT "PK_Assignments" PRIMARY KEY ("Id")
);

-- Create unique index to prevent duplicate assignments
-- A user can only have one active assignment per department-role combination
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Assignments_UserId_DepartmentId_RoleId" 
ON "Assignments" ("UserId", "DepartmentId", "RoleId");

-- Create foreign key constraints
ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Users_UserId" 
FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Departments_DepartmentId" 
FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Roles_RoleId" 
FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IX_Assignments_UserId" ON "Assignments" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_Assignments_DepartmentId" ON "Assignments" ("DepartmentId");
CREATE INDEX IF NOT EXISTS "IX_Assignments_RoleId" ON "Assignments" ("RoleId");
CREATE INDEX IF NOT EXISTS "IX_Assignments_IsActive" ON "Assignments" ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_Assignments_CreatedAt" ON "Assignments" ("CreatedAt");

-- Add comments to document the table structure
COMMENT ON TABLE "Assignments" IS 'Manages user-role-department assignments. Only SuperAdmin can manage these assignments.';
COMMENT ON COLUMN "Assignments"."Id" IS 'Primary key - unique identifier for the assignment';
COMMENT ON COLUMN "Assignments"."UserId" IS 'Foreign key to Users table - the user being assigned';
COMMENT ON COLUMN "Assignments"."DepartmentId" IS 'Foreign key to Departments table - the department the user is assigned to';
COMMENT ON COLUMN "Assignments"."RoleId" IS 'Foreign key to Roles table - the role assigned to the user';
COMMENT ON COLUMN "Assignments"."IsActive" IS 'Soft delete flag - false means the assignment is deactivated';
COMMENT ON COLUMN "Assignments"."CreatedAt" IS 'Timestamp when the assignment was created';
COMMENT ON COLUMN "Assignments"."UpdatedAt" IS 'Timestamp when the assignment was last updated';

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================
-- Uncomment the following lines to insert sample assignment data
-- Note: These GUIDs should match existing Users, Departments, and Roles in your database

/*
-- Sample assignment data (uncomment if needed for testing)
INSERT INTO "Assignments" ("Id", "UserId", "DepartmentId", "RoleId", "IsActive", "CreatedAt", "UpdatedAt")
VALUES 
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'role-guid-here', true, now(), NULL),
    (gen_random_uuid(), 'user-guid-here', '00000000-0000-0000-0000-000000000002', 'role-guid-here', true, now(), NULL)
ON CONFLICT ("UserId", "DepartmentId", "RoleId") DO NOTHING;
*/

-- =============================================
-- Verification Queries
-- =============================================
-- Use these queries to verify the table was created correctly

-- Check if table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'Assignments';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'Assignments' 
-- ORDER BY ordinal_position;

-- Check constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'Assignments';

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'Assignments';


