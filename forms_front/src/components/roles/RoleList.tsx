'use client'

import React, { useEffect, useState } from 'react'
import { Shield, MoreHorizontal, Edit, Trash2, Eye, Search, Filter, Users } from 'lucide-react'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAccessControl } from '@/lib/hooks/useAccessControl'
import { Role } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'

interface RoleListProps {
  onEdit?: (role: Role) => void
  onView?: (role: Role) => void
  onDelete?: (role: Role) => void
  showActions?: boolean
  departmentFilter?: string
}

export default function RoleList({ 
  onEdit, 
  onView, 
  onDelete, 
  showActions = true,
  departmentFilter
}: RoleListProps) {
  const { 
    filteredRoles, 
    roleHierarchy,
    isLoading, 
    error, 
    filters,
    fetchRoles, 
    filterRoles,
    deleteRole,
    canUserManageRole
  } = useRoleStore()
  
  const { departments, fetchDepartments } = useDepartmentStore()
  const { checkPermission } = useAccessControl()
  
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const params = departmentFilter ? { departmentId: departmentFilter } : undefined
    fetchRoles(params)
    fetchDepartments()
  }, [fetchRoles, fetchDepartments, departmentFilter])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const filtered = roleHierarchy.filter(role => 
      role.name.toLowerCase().includes(term.toLowerCase()) ||
      role.displayName.toLowerCase().includes(term.toLowerCase()) ||
      role.description.toLowerCase().includes(term.toLowerCase())
    )
    // Apply search by updating the filtered roles
    filterRoles({ ...filters })
  }

  const handleFilter = (filterType: string, value: string) => {
    const newFilters = { ...filters }
    
    if (value === 'all' || value === '') {
      delete newFilters[filterType as keyof typeof newFilters]
    } else {
      const filterValue = value === 'true' ? true : value === 'false' ? false : value
      if (filterType === 'departmentId') {
        newFilters.departmentId = filterValue as string
      } else if (filterType === 'isActive') {
        newFilters.isActive = filterValue as boolean
      } else if (filterType === 'isSystemRole') {
        newFilters.isSystemRole = filterValue as boolean
      }
    }
    
    filterRoles(newFilters)
  }

  const handleDeleteRole = async (role: Role) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.displayName || role.name}"? This action cannot be undone.`)) {
      const success = await deleteRole(role.id)
      if (success && onDelete) {
        onDelete(role)
      }
    }
  }

  const toggleActionMenu = (roleId: string) => {
    setActionMenuOpen(actionMenuOpen === roleId ? null : roleId)
  }

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    return department?.name || 'Unknown Department'
  }

  const displayRoles = searchTerm 
    ? roleHierarchy.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredRoles

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading roles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => fetchRoles()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search roles by name or description..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.departmentId || 'all'}
                onChange={(e) => handleFilter('departmentId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Type
              </label>
              <select
                value={filters.isSystemRole !== undefined ? filters.isSystemRole.toString() : 'all'}
                onChange={(e) => handleFilter('isSystemRole', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="true">System Roles</option>
                <option value="false">Department Roles</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive !== undefined ? filters.isActive.toString() : 'all'}
                onChange={(e) => handleFilter('isActive', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {displayRoles.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0 
              ? 'No roles found matching your criteria.' 
              : 'No roles found. Start by creating a new role.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {showActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            role.isSystemRole ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            <Shield className={`w-5 h-5 ${
                              role.isSystemRole ? 'text-purple-600' : 'text-blue-600'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {role.displayName || role.name}
                          </div>
                          {role.description && (
                            <div className="text-sm text-gray-500">{role.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getDepartmentName(role.departmentId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.isSystemRole 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {role.isSystemRole ? 'System' : 'Department'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <TableDate date={role.createdAt} />
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button 
                            onClick={() => toggleActionMenu(role.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          
                          {actionMenuOpen === role.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
                              <div className="py-1">
                                {onView && (
                                  <button
                                    onClick={() => {
                                      onView(role)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                )}
                                
                                {onEdit && canUserManageRole(role.id) && (
                                  <button
                                    onClick={() => {
                                      onEdit(role)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit size={14} />
                                    Edit
                                  </button>
                                )}
                                
                                {onDelete && canUserManageRole(role.id) && !role.isSystemRole && (
                                  <button
                                    onClick={() => {
                                      handleDeleteRole(role)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}