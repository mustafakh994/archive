'use client'

import { useAuthStore } from '@/lib/store/useAuthStore'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { usePermissionStore } from '@/lib/store/usePermissionStore'

export interface AccessControlResult {
  hasAccess: boolean
  reason?: string
}

export const useAccessControl = () => {
  const { user, departmentContext, hasPermission } = useAuthStore()
  const { canUserManageRole } = useRoleStore()
  const { checkResourceAccess } = usePermissionStore()

  // Check if user has role-based access (SuperAdmin, DepartmentAdmin, etc.)
  const hasRoleAccess = (requiredRoles: string[]): boolean => {
    if (!user?.role?.name) return false
    return requiredRoles.includes(user.role.name)
  }

  // Check if user has specific permission
  const checkPermission = (permission: string): AccessControlResult => {
    if (!user || !departmentContext) {
      return { hasAccess: false, reason: 'User not authenticated' }
    }

    const hasAccess = hasPermission(permission)
    return {
      hasAccess,
      reason: hasAccess ? undefined : `Missing permission: ${permission}`
    }
  }

  // Check if user can access specific resource with action
  const checkResourcePermission = (resource: string, action: string): AccessControlResult => {
    if (!user || !departmentContext) {
      return { hasAccess: false, reason: 'User not authenticated' }
    }

    // SuperAdmin has access to all resources across all departments
    if (hasRoleAccess(['SuperAdmin'])) {
      return { hasAccess: true }
    }

    // DepartmentAdmin has access to resources within their department only
    if (hasRoleAccess(['DepartmentAdmin'])) {
      return { hasAccess: true }
    }

    const hasAccess = checkResourceAccess(resource, action)
    return {
      hasAccess,
      reason: hasAccess ? undefined : `No access to ${action} on ${resource}`
    }
  }

  // Check if user can manage specific role
  const checkRoleManagement = (roleId: string): AccessControlResult => {
    if (!user) {
      return { hasAccess: false, reason: 'User not authenticated' }
    }

    const canManage = canUserManageRole(roleId)
    return {
      hasAccess: canManage,
      reason: canManage ? undefined : 'Insufficient privileges to manage this role'
    }
  }

  // Check if user belongs to specific department
  const checkDepartmentAccess = (departmentId: string): AccessControlResult => {
    if (!user || !departmentContext) {
      return { hasAccess: false, reason: 'User not authenticated' }
    }

    const hasAccess = departmentContext.departmentId === departmentId
    return {
      hasAccess,
      reason: hasAccess ? undefined : 'Access denied: Different department'
    }
  }

  return {
    checkPermission,
    checkResourcePermission,
    checkRoleManagement,
    checkDepartmentAccess,
    hasRoleAccess,
    user,
    departmentContext
  }
}