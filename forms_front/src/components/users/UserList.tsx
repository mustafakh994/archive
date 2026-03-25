'use client'

import React, { useEffect, useState } from 'react'
import { Users, MoreHorizontal, Edit, Trash2, Eye, Search, Filter, UserCheck, UserX } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { User } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'

interface UserListProps {
  onEdit?: (user: User) => void
  onView?: (user: User) => void
  onDelete?: (user: User) => void
  showActions?: boolean
  departmentFilter?: string
}

export default function UserList({ 
  onEdit, 
  onView, 
  onDelete, 
  showActions = true,
  departmentFilter
}: UserListProps) {
  const { 
    filteredUsers, 
    availableRoles,
    isLoading, 
    error, 
    searchTerm,
    filters,
    fetchUsers, 
    searchUsers,
    filterUsers,
    fetchAvailableRoles,
    toggleUserStatus
  } = useUserStore()
  
  const { departments, fetchDepartments } = useDepartmentStore()
  const { hasPermission, user: currentUser } = useAuthStore()
  
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const params = departmentFilter ? { departmentId: departmentFilter } : undefined
    fetchUsers(params)
    fetchDepartments()
    fetchAvailableRoles(departmentFilter)
  }, [fetchUsers, fetchDepartments, fetchAvailableRoles, departmentFilter])

  const handleSearch = (term: string) => {
    setLocalSearchTerm(term)
    searchUsers(term)
  }

  const handleFilter = (filterType: string, value: string) => {
    const newFilters = { ...filters }
    
    if (value === 'all' || value === '') {
      delete newFilters[filterType as keyof typeof newFilters]
    } else {
      const filterValue = value === 'true' ? true : value === 'false' ? false : value
      if (filterType === 'departmentId') {
        newFilters.departmentId = filterValue as string
      } else if (filterType === 'roleId') {
        newFilters.roleId = filterValue as string
      } else if (filterType === 'isActive') {
        newFilters.isActive = filterValue as boolean
      }
    }
    
    filterUsers(newFilters)
  }

  const handleToggleStatus = async (user: User) => {
    if (window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.name}?`)) {
      await toggleUserStatus(user.id, !user.isActive)
    }
  }

  const toggleActionMenu = (userId: string) => {
    setActionMenuOpen(actionMenuOpen === userId ? null : userId)
  }

  const getRoleName = (roleId: string) => {
    if (!roleId) return 'غير محدد'
    const role = availableRoles.find(r => r.id === roleId)
    return role?.displayName || role?.name || 'غير محدد'
  }

  const getDepartmentName = (departmentId: string) => {
    if (!departmentId) return 'غير محدد'
    const department = departments.find(d => d.id === departmentId)
    return department?.name || 'غير محدد'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => fetchUsers()}
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
              placeholder="Search users by name, email, department, or role..."
              value={localSearchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={filters.roleId || 'all'}
                onChange={(e) => handleFilter('roleId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Roles</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.displayName || role.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive !== undefined ? filters.isActive.toString() : 'all'}
                onChange={(e) => handleFilter('isActive', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Users</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm || Object.keys(filters).length > 0 
              ? 'No users found matching your criteria.' 
              : 'No users found. Start by creating a new user.'
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
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
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
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.departmentName || getDepartmentName(user.departmentId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.roleName || (user.roleId ? getRoleName(user.roleId) : 'غير محدد')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <TableDate date={user.createdAt} />
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button 
                            onClick={() => toggleActionMenu(user.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          
                          {actionMenuOpen === user.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
                              <div className="py-1">
                                {onView && (
                                  <button
                                    onClick={() => {
                                      onView(user)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                )}
                                
                                {onEdit && hasPermission('manage_users') && (
                                  <button
                                    onClick={() => {
                                      onEdit(user)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit size={14} />
                                    Edit
                                  </button>
                                )}
                                
                                {hasPermission('manage_users') && user.id !== currentUser?.id && (
                                  <button
                                    onClick={() => {
                                      handleToggleStatus(user)
                                      setActionMenuOpen(null)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {user.isActive ? (
                                      <>
                                        <UserX size={14} />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck size={14} />
                                        Activate
                                      </>
                                    )}
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