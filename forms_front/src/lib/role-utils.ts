import type { User } from '@/lib/api/client'

/** Normalize API role names for comparisons. */
export function normalizeRoleName(name?: string | null): string {
  return (name || '').trim().toLowerCase()
}

export function isSuperAdminUser(user: User | null): boolean {
  return normalizeRoleName(user?.role?.name || user?.roleName) === 'superadmin'
}

export function isDepartmentAdminUser(user: User | null): boolean {
  const role = normalizeRoleName(user?.role?.name || user?.roleName)
  return role === 'departmentadmin' || role === 'departmentmanager'
}

export function isArchivistUser(user: User | null): boolean {
  return normalizeRoleName(user?.role?.name || user?.roleName) === 'archivist'
}

/** Individual exception: allows an Archivist to create new form templates in their department. */
export function hasCreateFormTemplatePermission(user: User | null): boolean {
  return user?.permissions?.some((p) => p.name === 'CreateFormTemplate') ?? false
}

/**
 * Who may open /forms/new and call create-form APIs.
 * Matches backend: SuperAdmin, DepartmentAdmin, or Archivist with CreateFormTemplate user permission.
 */
export function canAccessNewFormBuilder(user: User | null): boolean {
  if (!user) return false
  if (isSuperAdminUser(user) || isDepartmentAdminUser(user)) return true
  if (isArchivistUser(user)) return hasCreateFormTemplatePermission(user)
  return false
}

/** Who may manage per-user permission overrides (e.g. CreateFormTemplate for archivists). */
export function canManageUserIndividualPermissions(manager: User | null): boolean {
  return isSuperAdminUser(manager) || isDepartmentAdminUser(manager)
}
