'use client'

import React, { useEffect, useState } from 'react'
import { Check, ChevronDown, Search, Shield, Lock } from 'lucide-react'
import { usePermissionStore } from '@/lib/store/usePermissionStore'
import { Permission } from '@/lib/api/client'

interface PermissionSelectorProps {
  departmentId?: string
  selectedPermissions?: string[]
  onPermissionsChange: (permissionIds: string[]) => void
  disabled?: boolean
  error?: string
  placeholder?: string
}

export default function PermissionSelector({
  departmentId,
  selectedPermissions = [],
  onPermissionsChange,
  disabled = false,
  error,
  placeholder = "Select permissions"
}: PermissionSelectorProps) {
  const { 
    permissionGroups, 
    filteredPermissions,
    isLoading, 
    fetchPermissions,
    groupPermissionsByResource 
  } = usePermissionStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (departmentId) {
      fetchPermissions({ departmentId })
    }
  }, [departmentId, fetchPermissions])

  useEffect(() => {
    groupPermissionsByResource()
  }, [filteredPermissions, groupPermissionsByResource])

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId]
    
    onPermissionsChange(newSelected)
  }

  const handleGroupToggle = (resource: string) => {
    const groupPermissions = permissionGroups
      .find(group => group.resource === resource)
      ?.permissions.map(p => p.id) || []
    
    const allSelected = groupPermissions.every(id => selectedPermissions.includes(id))
    
    if (allSelected) {
      // Deselect all permissions in this group
      const newSelected = selectedPermissions.filter(id => !groupPermissions.includes(id))
      onPermissionsChange(newSelected)
    } else {
      // Select all permissions in this group
      const combinedPermissions = [...selectedPermissions, ...groupPermissions]
      const newSelected = Array.from(new Set(combinedPermissions))
      onPermissionsChange(newSelected)
    }
  }

  const toggleGroupExpansion = (resource: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource)
    } else {
      newExpanded.add(resource)
    }
    setExpandedGroups(newExpanded)
  }

  const filteredGroups = permissionGroups.filter(group => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      group.resource.toLowerCase().includes(searchLower) ||
      group.permissions.some(permission => 
        permission.name.toLowerCase().includes(searchLower) ||
        permission.action.toLowerCase().includes(searchLower) ||
        permission.description.toLowerCase().includes(searchLower)
      )
    )
  })

  const getSelectedCount = () => selectedPermissions.length
  const getTotalCount = () => filteredPermissions.length

  if (!departmentId) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
        Please select a department first
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${
          disabled || isLoading ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className={selectedPermissions.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
          {isLoading ? 'Loading permissions...' : 
           selectedPermissions.length > 0 ? 
           `${getSelectedCount()} of ${getTotalCount()} permissions selected` : 
           placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${
            disabled || isLoading ? 'text-gray-400' : 'text-gray-600'
          }`} 
        />
      </button>

      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Permissions List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No permissions found matching your search.' : 'No permissions available for this department.'}
              </div>
            ) : (
              <div className="py-1">
                {filteredGroups.map((group) => {
                  const groupPermissions = group.permissions.map(p => p.id)
                  const selectedInGroup = groupPermissions.filter(id => selectedPermissions.includes(id)).length
                  const allSelected = selectedInGroup === groupPermissions.length
                  const someSelected = selectedInGroup > 0 && selectedInGroup < groupPermissions.length
                  const isExpanded = expandedGroups.has(group.resource)

                  return (
                    <div key={group.resource} className="border-b border-gray-100 last:border-b-0">
                      {/* Group Header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpansion(group.resource)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform ${isExpanded ? 'rotate-180' : 'rotate-90'}`}
                          />
                          <Shield size={14} className="text-blue-600" />
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {group.resource.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({selectedInGroup}/{groupPermissions.length})
                          </span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(group.resource)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {/* Group Permissions */}
                      {isExpanded && (
                        <div className="bg-white">
                          {group.permissions.map((permission) => (
                            <button
                              key={permission.id}
                              type="button"
                              onClick={() => handlePermissionToggle(permission.id)}
                              className="w-full px-6 py-2 text-left hover:bg-blue-50 flex items-center justify-between group"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Lock size={12} className="text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900 capitalize">
                                    {permission.action.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                {permission.description && (
                                  <div className="text-xs text-gray-500 mt-0.5 ml-5">
                                    {permission.description}
                                  </div>
                                )}
                              </div>
                              {selectedPermissions.includes(permission.id) && (
                                <Check size={16} className="text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedPermissions.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{getSelectedCount()} permissions selected</span>
                <button
                  type="button"
                  onClick={() => onPermissionsChange([])}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}