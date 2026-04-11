'use client'

import React from 'react'
import { Building2, Users, Shield } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'

interface DepartmentContextProps {
  variant?: 'compact' | 'full' | 'badge'
  showRole?: boolean
  showPermissions?: boolean
  className?: string
}

export default function DepartmentContext({ 
  variant = 'compact',
  showRole = true,
  showPermissions = false,
  className = ''
}: DepartmentContextProps) {
  const { user, departmentContext } = useAuthStore()
  const { userDepartment } = useDepartmentStore()

  // Use department context from auth store, fallback to user department
  const department = departmentContext || (user?.department ? {
    departmentId: user.department.id,
    departmentName: user.department.name,
    departmentCode: user.department.code,
    userRole: user.role?.name || 'User',
    permissions: user.permissions?.map(p => p.name) || []
  } : null)

  if (!department && !userDepartment) {
    return null
  }

  const displayDepartment = department || {
    departmentId: userDepartment?.id || '',
    departmentName: userDepartment?.name || '',
    departmentCode: userDepartment?.code || '',
    userRole: user?.role?.name || 'User',
    permissions: user?.permissions?.map(p => p.name) || []
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium ${className}`}>
        <Building2 size={12} />
        <span>{displayDepartment.departmentCode}</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <Building2 size={16} className="text-blue-600" />
        <span className="font-medium">{displayDepartment.departmentName}</span>
        <span className="text-gray-400">({displayDepartment.departmentCode})</span>
        {showRole && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{displayDepartment.userRole}</span>
          </>
        )}
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Building2 className="w-6 h-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{displayDepartment.departmentName}</h3>
            <p className="text-sm text-gray-600 mb-2">Code: {displayDepartment.departmentCode}</p>
            
            {showRole && (
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-gray-500" />
                <span className="text-sm text-gray-700">Role: {displayDepartment.userRole}</span>
              </div>
            )}
            
            {showPermissions && displayDepartment.permissions && displayDepartment.permissions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Permissions:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {displayDepartment.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {permission.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Hook for easy access to department context
export function useDepartmentContext() {
  const { departmentContext, user } = useAuthStore()
  const { userDepartment } = useDepartmentStore()

  return departmentContext || (user?.department ? {
    departmentId: user.department.id,
    departmentName: user.department.name,
    departmentCode: user.department.code,
    userRole: user.role?.name || 'User',
    permissions: user.permissions?.map(p => p.name) || []
  } : null) || (userDepartment ? {
    departmentId: userDepartment.id,
    departmentName: userDepartment.name,
    departmentCode: userDepartment.code,
    userRole: user?.role?.name || 'User',
    permissions: user?.permissions?.map(p => p.name) || []
  } : null)
}