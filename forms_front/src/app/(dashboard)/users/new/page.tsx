'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Save, X, Eye, EyeOff, User, Mail, Lock, Building, Shield } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/LoadingSpinner'
import { CreateUserData } from '@/lib/api/client'

export default function NewUserPage() {
  const router = useRouter()
  const { createUser, isLoading, error, clearError } = useUserStore()
  const { departments, fetchDepartments } = useDepartmentStore()
  const { user: currentUser } = useAuthStore()
  
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    roleId: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load departments on component mount
  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  // Clear errors when form data changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    setValidationErrors({})
  }, [formData, error, clearError])

  // Check permissions - only SuperAdmin can create users
  useEffect(() => {
    const userRole = currentUser?.role?.name
    if (!userRole || userRole !== 'SuperAdmin') {
      errorToast('غير مصرح', 'ليس لديك صلاحية لإنشاء مستخدمين جدد')
      router.push('/dashboard')
    }
  }, [currentUser, errorToast, router])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'الاسم يجب أن يكون على الأقل حرفين'
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'كلمة المرور مطلوبة'
    } else if (formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'كلمة المرور غير متطابقة'
    }

    // Department validation
    if (!formData.departmentId) {
      errors.departmentId = 'المديرية مطلوبة'
    }

    // Role validation
    if (!formData.roleId) {
      errors.roleId = 'الدور مطلوب'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const userData: CreateUserData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        departmentId: formData.departmentId,
        roleId: formData.roleId
      }

      const success = await createUser(userData)

      if (success) {
        successToast('تم إنشاء المستخدم!', `تم إنشاء المستخدم ${formData.name} بنجاح`)
        router.push('/users')
      } else {
        errorToast('فشل في الإنشاء', 'حدث خطأ أثناء إنشاء المستخدم. يرجى المحاولة مرة أخرى.')
      }
    } catch (err) {
      console.error('Error creating user:', err)
      errorToast('خطأ في الإنشاء', 'حدث خطأ غير متوقع أثناء إنشاء المستخدم.')
    }
  }

  const handleCancel = () => {
    router.push('/users')
  }

  // Define system role IDs
  const ROLE_IDS = {
    DEPARTMENT_ADMIN: '30000000-0000-0000-0000-000000000002',
    SUPER_ADMIN: '30000000-0000-0000-0000-000000000003'
  }

  // Get available roles based on logged-in user's role
  const getAvailableRoles = () => {
    const isSuperAdmin = currentUser?.role?.name === 'SuperAdmin' || currentUser?.roleName === 'SuperAdmin'

    if (isSuperAdmin) {
      // SuperAdmin can assign both DepartmentAdmin and SuperAdmin roles
      return [
        { id: ROLE_IDS.DEPARTMENT_ADMIN, name: 'DepartmentAdmin', displayName: 'مدير القسم' },
        { id: ROLE_IDS.SUPER_ADMIN, name: 'SuperAdmin', displayName: 'مدير النظام' }
      ]
    }

    return []
  }

  const availableRoles = getAvailableRoles()

  // Get available departments based on logged-in user's role
  const getAvailableDepartments = () => {
    const isSuperAdmin = currentUser?.role?.name === 'SuperAdmin' || currentUser?.roleName === 'SuperAdmin'

    if (isSuperAdmin) {
      // SuperAdmin can see all departments
      return departments
    }

    return []
  }

  const availableDepartments = getAvailableDepartments()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
            <span>العودة إلى المستخدمين</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إنشاء مستخدم جديد</h1>
            <p className="text-gray-600">أضف مستخدم جديد إلى النظام</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                المعلومات الشخصية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      validationErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="أدخل الاسم الكامل"
                    dir="rtl"
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="user@example.com"
                      dir="ltr"
                    />
                    <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-500" />
                معلومات الأمان
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="أدخل كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تأكيد كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="أعد إدخال كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Organization Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-500" />
                معلومات المؤسسة
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المديرية *
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      handleInputChange('departmentId', e.target.value)
                      // Reset role when department changes
                      handleInputChange('roleId', '')
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      validationErrors.departmentId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">اختر المديرية</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.departmentId}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الدور *
                  </label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => handleInputChange('roleId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      validationErrors.roleId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">اختر الدور</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.displayName || role.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.roleId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.roleId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Global Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
                إلغاء
              </button>
              
              <LoadingButton
                type="submit"
                loading={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                إنشاء المستخدم
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}