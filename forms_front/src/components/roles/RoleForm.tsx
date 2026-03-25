'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2, Shield } from 'lucide-react'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { Role, CreateRoleData } from '@/lib/api/client'

interface RoleFormProps {
  role?: Role | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (role: Role) => void
  mode?: 'create' | 'edit'
  defaultDepartmentId?: string
}

export default function RoleForm({ 
  role, 
  isOpen, 
  onClose, 
  onSuccess,
  mode = 'create',
  defaultDepartmentId
}: RoleFormProps) {
  const { createRole, updateRole, isLoading, error, clearError } = useRoleStore()
  const { departments, fetchDepartments } = useDepartmentStore()
  const { user: currentUser, hasPermission } = useAuthStore()
  
  const [formData, setFormData] = useState<CreateRoleData & { isActive?: boolean }>({
    departmentId: defaultDepartmentId || '',
    name: '',
    displayName: '',
    description: '',
    isActive: true
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  useEffect(() => {
    if (role && mode === 'edit') {
      setFormData({
        departmentId: role.departmentId,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isActive: role.isActive
      })
    } else {
      setFormData({
        departmentId: defaultDepartmentId || currentUser?.departmentId || '',
        name: '',
        displayName: '',
        description: '',
        isActive: true
      })
    }
    setValidationErrors({})
    clearError()
  }, [role, mode, isOpen, defaultDepartmentId, currentUser, clearError])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Role name is required'
    } else if (!/^[a-z_][a-z0-9_]*$/.test(formData.name)) {
      errors.name = 'Role name must start with a letter or underscore and contain only lowercase letters, numbers, and underscores'
    }
    
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required'
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    }
    
    if (!formData.departmentId) {
      errors.departmentId = 'Department is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      let success = false
      let result: Role | null = null

      if (mode === 'edit' && role) {
        success = await updateRole(role.id, formData)
        if (success) {
          result = { ...role, ...formData }
        }
      } else {
        success = await createRole(formData as CreateRoleData)
        if (success) {
          result = {
            id: Date.now().toString(), // Temporary ID
            ...formData,
            isSystemRole: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Role
        }
      }

      if (success && result) {
        onSuccess?.(result)
        onClose()
      }
    } catch (err) {
      console.error('Error submitting form:', err)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Auto-generate role name from display name
    if (field === 'displayName' && mode === 'create') {
      const roleName = (value as string)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^[0-9]/, '_$&')
      
      setFormData(prev => ({ ...prev, name: roleName }))
    }
  }

  // Check if user can manage roles in the selected department
  const canManageDepartment = (departmentId: string) => {
    if (!currentUser) return false
    
    // System administrators can manage any department
    if (hasPermission('manage_system_roles')) return true
    
    // Department administrators can only manage their own department
    if (hasPermission('manage_department_roles') && currentUser.departmentId === departmentId) {
      return true
    }
    
    return false
  }

  const availableDepartments = departments.filter(dept => canManageDepartment(dept.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit Role' : 'Create New Role'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <select
                id="departmentId"
                value={formData.departmentId}
                onChange={(e) => handleInputChange('departmentId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                  validationErrors.departmentId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading || (mode === 'edit' && role?.isSystemRole)}
              >
                <option value="">Select a department</option>
                {availableDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              {validationErrors.departmentId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.departmentId}</p>
              )}
              {availableDepartments.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  You don't have permission to create roles in any department.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.displayName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Department Manager"
                disabled={isLoading}
              />
              {validationErrors.displayName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.displayName}</p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Role Name * 
                <span className="text-xs text-gray-500 font-normal">
                  (used internally, auto-generated from display name)
                </span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., department_manager"
                disabled={isLoading || (mode === 'edit' && role?.isSystemRole)}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must start with a letter or underscore, contain only lowercase letters, numbers, and underscores
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the role's responsibilities and permissions..."
                disabled={isLoading}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            {mode === 'edit' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || (role?.isSystemRole)}
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active Role
                  {role?.isSystemRole && (
                    <span className="text-xs text-gray-500 ml-1">(System roles cannot be deactivated)</span>
                  )}
                </label>
              </div>
            )}

            {role?.isSystemRole && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">System Role</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  This is a system role. Some fields cannot be modified to maintain system integrity.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || availableDepartments.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{mode === 'edit' ? 'Update' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}