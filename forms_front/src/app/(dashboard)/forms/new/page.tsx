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
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/60 p-8 md:p-10 max-w-lg w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-full mb-6 ring-8 ring-white shadow-sm">
              <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight" dir="rtl">
              تحديد قسم القالب
            </h2>
            <p className="text-[17px] text-slate-500 font-medium" dir="rtl">
              كمسؤول نظام، يرجى تحديد القسم الذي سينتمي إليه هذا القالب الجديد.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[15px] font-bold text-slate-700 mb-2.5" dir="rtl">
                القسم المسؤول <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <SearchableDropdown
                  options={departments}
                  value={selectedDepartmentId}
                  onChange={setSelectedDepartmentId}
                  placeholder="اختر القسم..."
                  searchPlaceholder="البحث في الأقسام..."
                  loading={loadingDepartments}
                  className="w-full text-right"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 mt-8 border-t border-slate-100">
              <button
                onClick={() => router.push('/forms')}
                className="flex-1 px-5 py-3.5 text-[15px] text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all font-bold shadow-sm hover:shadow"
                dir="rtl"
              >
                إلغاء التحديد
              </button>
              <button
                onClick={() => {
                  if (selectedDepartmentId) {
                    setShowDepartmentSelector(false)
                  }
                }}
                disabled={!selectedDepartmentId}
                className="flex-1 px-5 py-3.5 text-white bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none transition-all font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                dir="rtl"
              >
                المتابعة للإنشاء
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري إنشاء القالب المبدئي...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-rose-100 p-8 max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">فشل الإنشاء</h3>
          <p className="text-[15px] text-slate-600 mb-8" dir="rtl">{error}</p>
          <button
            onClick={() => router.push('/forms')}
            className="w-full px-5 py-3 text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors font-bold shadow-sm"
            dir="rtl"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
      <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري التوجيه إلى محرر قوالب الوثائق...</p>
      </div>
    </div>
  )
}




