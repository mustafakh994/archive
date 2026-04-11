'use client'

import React, { useEffect } from 'react'
import { Shield, Users, ChevronRight, Crown, Building } from 'lucide-react'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { Role } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'

interface RoleHierarchyProps {
  departmentFilter?: string
  onRoleSelect?: (role: Role) => void
  selectedRoleId?: string
  showUserCount?: boolean
}

export default function RoleHierarchy({ 
  departmentFilter,
  onRoleSelect,
  selectedRoleId,
  showUserCount = false
}: RoleHierarchyProps) {
  const { 
    roleHierarchy, 
    isLoading, 
    error, 
    fetchRoles,
    buildRoleHierarchy 
  } = useRoleStore()
  
  const { departments, fetchDepartments } = useDepartmentStore()

  useEffect(() => {
    const params = departmentFilter ? { departmentId: departmentFilter } : undefined
    fetchRoles(params)
    fetchDepartments()
  }, [fetchRoles, fetchDepartments, departmentFilter])

  useEffect(() => {
    buildRoleHierarchy()
  }, [buildRoleHierarchy])

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    return department?.name || 'Unknown Department'
  }

  const groupRolesByDepartment = () => {
    const groups: { [key: string]: Role[] } = {}
    
    roleHierarchy.forEach(role => {
      if (!groups[role.departmentId]) {
        groups[role.departmentId] = []
      }
      groups[role.departmentId].push(role)
    })
    
    return groups
  }

  const handleRoleClick = (role: Role) => {
    if (onRoleSelect) {
      onRoleSelect(role)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600">Loading role hierarchy...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm mb-3">Error: {error}</p>
        <button 
          onClick={() => fetchRoles()}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const roleGroups = groupRolesByDepartment()

  if (Object.keys(roleGroups).length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No roles found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(roleGroups).map(([departmentId, roles]) => (
        <div key={departmentId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Department Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building size={16} className="text-gray-600" />
              <h3 className="font-medium text-gray-900">
                {getDepartmentName(departmentId)}
              </h3>
              <span className="text-sm text-gray-500">
                ({roles.length} role{roles.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Roles List */}
          <div className="divide-y divide-gray-100">
            {roles.map((role, index) => (
              <div
                key={role.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                  onRoleSelect ? 'cursor-pointer' : ''
                } ${
                  selectedRoleId === role.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleRoleClick(role)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Hierarchy Indicator */}
                    <div className="flex items-center">
                      {index > 0 && (
                        <div className="w-4 h-px bg-gray-300 mr-2"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        role.isSystemRole 
                          ? 'bg-purple-100' 
                          : 'bg-blue-100'
                      }`}>
                        {role.isSystemRole ? (
                          <Crown className={`w-4 h-4 text-purple-600`} />
                        ) : (
                          <Shield className={`w-4 h-4 text-blue-600`} />
                        )}
                      </div>
                    </div>

                    {/* Role Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {role.displayName || role.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          {role.isSystemRole && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              System
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            role.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {role.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Created: <TableDate date={role.createdAt} /></span>
                        {showUserCount && (
                          <div className="flex items-center gap-1">
                            <Users size={12} />
                            <span>0 users</span> {/* This would need to be fetched from user data */}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {onRoleSelect && (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}