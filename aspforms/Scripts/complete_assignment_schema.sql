-- =============================================
-- Complete Assignment Schema for Forms Management API
-- =============================================
-- This script creates the complete Assignment table structure
-- matching the Entity Framework configuration
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Assignment Table Creation
-- =============================================

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS "Assignments" CASCADE;

-- Create the Assignment table with all Entity Framework configurations
CREATE TABLE "Assignments" (
    "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "DepartmentId" uuid NOT NULL,
    "RoleId" uuid NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NULL,
    
    CONSTRAINT "PK_Assignments" PRIMARY KEY ("Id")
);

-- =============================================
-- Indexes and Constraints
-- =============================================

-- Unique constraint to prevent duplicate assignments
-- This matches the Entity Framework configuration: entity.HasIndex(e => new { e.UserId, e.DepartmentId, e.RoleId }).IsUnique();
CREATE UNIQUE INDEX "IX_Assignments_UserId_DepartmentId_RoleId" 
ON "Assignments" ("UserId", "DepartmentId", "RoleId");

-- Foreign key constraints with CASCADE delete behavior
-- This matches the Entity Framework configuration: .OnDelete(DeleteBehavior.Cascade)
ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Users_UserId" 
FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Departments_DepartmentId" 
FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Roles_RoleId" 
FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE;

-- Performance indexes
CREATE INDEX "IX_Assignments_UserId" ON "Assignments" ("UserId");
CREATE INDEX "IX_Assignments_DepartmentId" ON "Assignments" ("DepartmentId");
CREATE INDEX "IX_Assignments_RoleId" ON "Assignments" ("RoleId");
CREATE INDEX "IX_Assignments_IsActive" ON "Assignments" ("IsActive");
CREATE INDEX "IX_Assignments_CreatedAt" ON "Assignments" ("CreatedAt");

-- =============================================
-- Table Documentation
-- =============================================

COMMENT ON TABLE "Assignments" IS 'Manages user-role-department assignments. Only SuperAdmin users can manage these assignments through the API.';
COMMENT ON COLUMN "Assignments"."Id" IS 'Primary key - unique identifier for the assignment';
COMMENT ON COLUMN "Assignments"."UserId" IS 'Foreign key to Users table - the user being assigned to a role in a department';
COMMENT ON COLUMN "Assignments"."DepartmentId" IS 'Foreign key to Departments table - the department the user is assigned to';
COMMENT ON COLUMN "Assignments"."RoleId" IS 'Foreign key to Roles table - the role assigned to the user in the department';
COMMENT ON COLUMN "Assignments"."IsActive" IS 'Soft delete flag - false means the assignment is deactivated but not deleted';
COMMENT ON COLUMN "Assignments"."CreatedAt" IS 'Timestamp when the assignment was created (defaults to now())';
COMMENT ON COLUMN "Assignments"."UpdatedAt" IS 'Timestamp when the assignment was last updated (nullable)';

-- =============================================
-- Sample Data for Testing
-- =============================================

-- Insert sample assignment data for testing
-- Note: Replace the GUIDs with actual IDs from your Users, Departments, and Roles tables

/*
-- Example: Assign a user to a role in a department
INSERT INTO "Assignments" ("UserId", "DepartmentId", "RoleId", "IsActive", "CreatedAt")
SELECT 
    u."Id" as "UserId",
    d."Id" as "DepartmentId", 
    r."Id" as "RoleId",
    true as "IsActive",
    now() as "CreatedAt"
FROM "Users" u
CROSS JOIN "Departments" d  
CROSS JOIN "Roles" r
WHERE u."Email" = 'user@example.com'  -- Replace with actual user email
  AND d."Name" = 'Test Department'    -- Replace with actual department name
  AND r."Name" = 'Admin'              -- Replace with actual role name
LIMIT 1;
*/

-- =============================================
-- Useful Queries for Assignment Management
-- =============================================

-- Query to get all assignments with user, department, and role details
/*
SELECT 
    a."Id",
    a."UserId",
    u."Name" as "UserName",
    u."Email" as "UserEmail",
    a."DepartmentId", 
    d."Name" as "DepartmentName",
    a."RoleId",
    r."Name" as "RoleName",
    a."IsActive",
    a."CreatedAt",
    a."UpdatedAt"
FROM "Assignments" a
JOIN "Users" u ON a."UserId" = u."Id"
JOIN "Departments" d ON a."DepartmentId" = d."Id"
JOIN "Roles" r ON a."RoleId" = r."Id"
WHERE a."IsActive" = true
ORDER BY a."CreatedAt" DESC;
*/

-- Query to get assignments for a specific user
/*
SELECT 
    a."Id",
    d."Name" as "DepartmentName",
    r."Name" as "RoleName",
    a."IsActive",
    a."CreatedAt"
FROM "Assignments" a
JOIN "Departments" d ON a."DepartmentId" = d."Id"
JOIN "Roles" r ON a."RoleId" = r."Id"
WHERE a."UserId" = 'user-guid-here'
  AND a."IsActive" = true;
*/

-- Query to get all users assigned to a specific department
/*
SELECT 
    u."Id",
    u."Name",
    u."Email",
    r."Name" as "RoleName",
    a."CreatedAt" as "AssignedAt"
FROM "Assignments" a
JOIN "Users" u ON a."UserId" = u."Id"
JOIN "Roles" r ON a."RoleId" = r."Id"
WHERE a."DepartmentId" = 'department-guid-here'
  AND a."IsActive" = true
ORDER BY u."Name";
*/

-- =============================================
-- Verification Script
-- =============================================

-- Verify table creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Assignments') THEN
        RAISE NOTICE 'Assignment table created successfully';
    ELSE
        RAISE EXCEPTION 'Assignment table was not created';
    END IF;
END $$;

-- Display table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Assignments' 
ORDER BY ordinal_position;

-- Display constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'Assignments';

-- Display indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'Assignments';


