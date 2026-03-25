'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { Department, CreateDepartmentData } from '@/lib/api/client'

interface DepartmentFormProps {
  department?: Department | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (department: Department) => void
  mode?: 'create' | 'edit'
}

export default function DepartmentForm({ 
  department, 
  isOpen, 
  onClose, 
  onSuccess,
  mode = 'create'
}: DepartmentFormProps) {
  const { createDepartment, updateDepartment, isLoading, error, clearError } = useDepartmentStore()
  
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: '',
    code: '',
    description: '',
    settings: {}
  })
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (department && mode === 'edit') {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description,
        settings: department.settings || {}
      })
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        settings: {}
      })
    }
    setValidationErrors({})
    clearError()
  }, [department, mode, isOpen, clearError])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'اسم المديرية مطلوب'
    }
    
    if (!formData.code.trim()) {
      errors.code = 'كود المديرية مطلوب'
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      errors.code = 'كود المديرية يمكن أن يحتوي على أحرف وأرقام وشرطات وشرطات سفلية فقط'
    }
    
    if (!formData.description.trim()) {
      errors.description = 'وصف المديرية مطلوب'
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
      let result: Department | null = null

      if (mode === 'edit' && department) {
        success = await updateDepartment(department.id, formData)
        if (success) {
          // Use the updated department data
          result = { ...department, ...formData }
        }
      } else {
        success = await createDepartment(formData)
        if (success) {
          // Create a mock result for the newly created department
          result = {
            id: Date.now().toString(), // Temporary ID
            ...formData,
            settings: formData.settings || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userCount: 0,
            formCount: 0
          }
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

  const handleInputChange = (field: keyof CreateDepartmentData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'تعديل المديرية' : 'إضافة مديرية جديدة'}
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
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                اسم المديرية *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="أدخل اسم المديرية"
                disabled={isLoading}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                كود المديرية *
              </label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                  validationErrors.code ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="أدخل كود المديرية (مثل: IT, HR)"
                disabled={isLoading}
              />
              {validationErrors.code && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                الوصف *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="أدخل وصف المديرية"
                disabled={isLoading}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{mode === 'edit' ? 'تحديث' : 'إنشاء'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}