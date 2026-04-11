'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2, Eye, EyeOff } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { User, CreateUserData } from '@/lib/api/client'
import RoleSelector from './RoleSelector'

interface UserFormProps {
  user?: User | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (user: User) => void
  mode?: 'create' | 'edit'
  defaultDepartmentId?: string
}

export default function UserForm({ 
  user, 
  isOpen, 
  onClose, 
  onSuccess,
  mode = 'create',
  defaultDepartmentId
}: UserFormProps) {
  const { createUser, updateUser, isLoading, error, clearError } = useUserStore()
  const { departments, fetchDepartments } = useDepartmentStore()
  const { user: currentUser } = useAuthStore()
  
  const [formData, setFormData] = useState<CreateUserData & { isActive?: boolean }>({
    name: '',
    email: '',
    password: '',
    departmentId: defaultDepartmentId || '',
    roleId: '',
    isActive: true
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId || '')

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't populate password for editing
        departmentId: user.departmentId,
        roleId: user.roleId,
        isActive: user.isActive
      })
      setSelectedDepartmentId(user.departmentId)
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        departmentId: defaultDepartmentId || '',
        roleId: '',
        isActive: true
      })
      setSelectedDepartmentId(defaultDepartmentId || '')
    }
    setValidationErrors({})
    clearError()
  }, [user, mode, isOpen, defaultDepartmentId, clearError])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (mode === 'create' && !formData.password.trim()) {
      errors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }
    
    if (!formData.departmentId) {
      errors.departmentId = 'Department is required'
    }
    
    if (!formData.roleId) {
      errors.roleId = 'Role is required'
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
      let result: User | null = null

      if (mode === 'edit' && user) {
        // For edit mode, don't send password if it's empty
        const updateData: Partial<CreateUserData & { isActive?: boolean }> = { ...formData }
        if (!updateData.password) {
          const { password, ...dataWithoutPassword } = updateData
          success = await updateUser(user.id, dataWithoutPassword)
        } else {
          success = await updateUser(user.id, updateData)
        }
        if (success) {
          result = { ...user, ...updateData }
        }
      } else {
        // Ensure all required fields are present for creation
        const createData: CreateUserData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          departmentId: formData.departmentId,
          roleId: formData.roleId,
          isActive: formData.isActive ?? true
        }
        
        success = await createUser(createData)
        
        if (success) {
          // Don't create a fake result, let the store handle the real response
          result = null
        }
      }

      if (success) {
        onSuccess?.(result!)
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

    // Update selected department for role filtering
    if (field === 'departmentId') {
      setSelectedDepartmentId(value as string)
      // Clear role selection when department changes
      setFormData(prev => ({ ...prev, roleId: '' }))
    }
  }

  const handleRoleSelect = (roleId: string) => {
    handleInputChange('roleId', roleId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit User' : 'Create New User'}
          </h2>
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
              <p className="text-sm text-red-600 font-medium">Error:</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-black ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
                disabled={isLoading}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-black ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password {mode === 'create' ? '*' : '(leave blank to keep current)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    validationErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={mode === 'create' ? 'Enter password' : 'Enter new password (optional)'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <select
                id="departmentId"
                value={formData.departmentId}
                onChange={(e) => handleInputChange('departmentId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-black ${
                  validationErrors.departmentId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Select a department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              {validationErrors.departmentId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.departmentId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <RoleSelector
                departmentId={selectedDepartmentId}
                selectedRoleId={formData.roleId}
                onRoleSelect={handleRoleSelect}
                disabled={isLoading || !selectedDepartmentId}
                error={validationErrors.roleId}
              />
            </div>

            {mode === 'edit' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading || user?.id === currentUser?.id}
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active User
                  {user?.id === currentUser?.id && (
                    <span className="text-xs text-gray-500 ml-1">(Cannot deactivate yourself)</span>
                  )}
                </label>
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
              disabled={isLoading}
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