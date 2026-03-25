'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStore } from '@/lib/store/useFormStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import SearchableDropdown from '@/components/ui/SearchableDropdown'
import { apiClient } from '@/lib/api/client'

export default function NewFormPage() {
  const router = useRouter()
  const { createForm, isLoading, error } = useFormStore()
  const { user } = useAuthStore()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const hasCreatedForm = useRef(false)

  // SuperAdmin department selection
  const [showDepartmentSelector, setShowDepartmentSelector] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ id: string; label: string }>>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is SuperAdmin
    const isSuperAdmin = user.role?.name === 'SuperAdmin' ||
      user.roleName === 'SuperAdmin' ||
      user.permissions?.some(p => p.name === 'SuperAdmin')

    if (isSuperAdmin && !showDepartmentSelector && !hasCreatedForm.current) {
      // Show department selector for SuperAdmin
      setShowDepartmentSelector(true)

      // Load departments
      const loadDepartments = async () => {
        setLoadingDepartments(true)
        try {
          const response = await apiClient.getDepartments({ pageSize: 100 })
          if (response.success && response.data) {
            const deptOptions = response.data.items.map(dept => ({
              id: dept.id,
              label: dept.name
            }))
            setDepartments(deptOptions)
          }
        } catch (err) {
          console.error('Error loading departments:', err)
        } finally {
          setLoadingDepartments(false)
        }
      }

      loadDepartments()
      return
    }

    // Prevent duplicate form creation
    if (hasCreatedForm.current) {
      return
    }

    // For non-SuperAdmin or after department selection, create form
    if (!isSuperAdmin || selectedDepartmentId) {
      const createNewForm = async () => {
        if (user && !hasCreatedForm.current) {
          hasCreatedForm.current = true // Mark as creating to prevent duplicates

          const formData = {
            name: 'Untitled Form',
            code: `form_${Date.now()}`,
            title: 'Untitled Form',
            description: 'Please fill out this form.',
            formSchema: {
              fields: []
            },
            settings: {
              theme: {
                primaryColor: '#7C3AED',
                backgroundColor: '#F3F4F6',
                fontFamily: 'Inter'
              }
            },
            status: 'Active',
            // Add departmentId for SuperAdmin selection or user's department
            departmentId: selectedDepartmentId || user.departmentId,
            organizationId: selectedDepartmentId || user.departmentId
          }

          console.log('=== CREATING FORM ===')
          console.log('Selected Department ID:', selectedDepartmentId)
          console.log('User Department ID:', user.departmentId)
          console.log('Form Data being sent:', formData)
          console.log('Final departmentId:', formData.departmentId)
          console.log('Final organizationId:', formData.organizationId)

          const formId = await createForm(formData)
          if (formId) {
            // Show success message
            successToast('Form Created!', 'Your new form has been created successfully.')

            // Redirect to the form builder for the newly created form
            router.push(`/forms/${formId}`)
          } else {
            // Show error message
            errorToast('Failed to Create Form', 'There was an error creating your form. Please try again.')
            hasCreatedForm.current = false // Reset on failure to allow retry
          }
        }
      }

      createNewForm()
    }
  }, [user, router, successToast, errorToast, selectedDepartmentId, showDepartmentSelector]) // Added dependencies

  // Show department selector for SuperAdmin
  if (showDepartmentSelector && !selectedDepartmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" dir="rtl">
              اختر القسم للنموذج الجديد
            </h2>
            <p className="text-gray-600" dir="rtl">
              كمسؤول، يجب عليك تحديد القسم الذي سينتمي إليه هذا النموذج
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" dir="rtl">
                القسم <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={departments}
                value={selectedDepartmentId}
                onChange={setSelectedDepartmentId}
                placeholder="اختر القسم..."
                searchPlaceholder="البحث في الأقسام..."
                loading={loadingDepartments}
                className="w-full"
                dir="rtl"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push('/forms')}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                dir="rtl"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (selectedDepartmentId) {
                    // This will trigger form creation in useEffect
                    setShowDepartmentSelector(false)
                  }
                }}
                disabled={!selectedDepartmentId}
                className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                dir="rtl"
              >
                إنشاء النموذج
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600" dir="rtl">جاري إنشاء النموذج...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4" dir="rtl">خطأ: {error}</p>
          <button
            onClick={() => router.push('/forms')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            dir="rtl"
          >
            العودة إلى النماذج
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600" dir="rtl">جاري التوجيه إلى منشئ قوالب الوثائق...</p>
      </div>
    </div>
  )
}




