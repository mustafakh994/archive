'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: string[]
  requiredPermissions?: string[]
  departmentId?: string
  fallback?: ReactNode
  showError?: boolean
}

export default function RoleGuard({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  departmentId,
  fallback = null,
  showError = false
}: RoleGuardProps) {
  const { 
    isAuthenticated, 
    departmentContext, 
    hasPermission,
    hasRole,
    hasDepartmentAccess 
  } = useAuth()

  // If not authenticated, don't render anything
  if (!isAuthenticated) {
    return showError ? (
      <div className="text-red-600 text-sm">Authentication required</div>
    ) : fallback
  }

  // Check role requirements
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role))
    if (!hasAllowedRole) {
      return showError ? (
        <div className="text-red-600 text-sm">
          Required role: {allowedRoles.join(' or ')}
        </div>
      ) : fallback
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    )
    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(permission => 
        !hasPermission(permission)
      )
      return showError ? (
        <div className="text-red-600 text-sm">
          Missing permissions: {missingPermissions.join(', ')}
        </div>
      ) : fallback
    }
  }

  // Check department access
  if (departmentId && !hasDepartmentAccess(departmentId)) {
    return showError ? (
      <div className="text-red-600 text-sm">
        Department access required
      </div>
    ) : fallback
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SuperAdmin', 'DepartmentAdmin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function SuperAdminOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['SuperAdmin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function DepartmentAdminOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['DepartmentAdmin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function WithPermission({ 
  children, 
  permission, 
  fallback = null 
}: { 
  children: ReactNode
  permission: string
  fallback?: ReactNode 
}) {
  return (
    <RoleGuard requiredPermissions={[permission]} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}