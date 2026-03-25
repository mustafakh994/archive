-- =============================================
-- Entity Framework Migration: Add Assignment Table (PostgreSQL 12 Compatible)
-- =============================================
-- This script creates the Assignment table compatible with PostgreSQL 12
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the Assignment table
CREATE TABLE "Assignments" (
    "Id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "UserId" uuid NOT NULL,
    "DepartmentId" uuid NOT NULL,
    "RoleId" uuid NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "UpdatedAt" timestamp with time zone NULL,
    
    CONSTRAINT "PK_Assignments" PRIMARY KEY ("Id")
);

-- Create unique index
CREATE UNIQUE INDEX "IX_Assignments_UserId_DepartmentId_RoleId" 
ON "Assignments" ("UserId", "DepartmentId", "RoleId");

-- Add foreign key constraints
ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Users_UserId" 
FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Departments_DepartmentId" 
FOREIGN KEY ("DepartmentId") REFERENCES "Departments" ("Id") ON DELETE CASCADE;

ALTER TABLE "Assignments" 
ADD CONSTRAINT "FK_Assignments_Roles_RoleId" 
FOREIGN KEY ("RoleId") REFERENCES "Roles" ("Id") ON DELETE CASCADE;


