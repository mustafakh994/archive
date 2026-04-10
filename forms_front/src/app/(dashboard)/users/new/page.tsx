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
    <div className="max-w-4xl mx-auto py-6 animate-in fade-in duration-500" dir="rtl">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 mb-4 border border-slate-200 bg-white shadow-sm rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowRight size={16} strokeWidth={2.5} />
            العودة للمستخدمين
          </button>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
              <User size={28} className="text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">إنشاء مستخدم جديد</h1>
              <p className="text-[15px] font-medium text-slate-500 mt-1">قم بإضافة صلاحيات الدخول وإعداد بيانات المستخدم الجديد</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-600 to-blue-500"></div>
        <div className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Information Section */}
            <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <User size={20} className="text-indigo-500" strokeWidth={2.5} />
                </div>
                المعلومات الشخصية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    الاسم الكامل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                      validationErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                    }`}
                    placeholder="أدخل الاسم الكامل بحسب الهوية"
                  />
                  {validationErrors.name && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    البريد الإلكتروني <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3.5 pr-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                        validationErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                      }`}
                      placeholder="user@example.com"
                      dir="ltr"
                    />
                    <Mail className="absolute right-4 top-4 h-5 w-5 text-slate-400" strokeWidth={2.5} />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Lock size={20} className="text-indigo-500" strokeWidth={2.5} />
                </div>
                معلومات الأمان
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-4 py-3.5 pr-12 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                        validationErrors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                      }`}
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <Lock className="absolute right-4 top-4 h-5 w-5 text-slate-400" strokeWidth={2.5} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    تأكيد كلمة المرور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-3.5 pr-12 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                        validationErrors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                      }`}
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <Shield className="absolute right-4 top-4 h-5 w-5 text-slate-400" strokeWidth={2.5} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-3.5 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Organization Section */}
            <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Building size={20} className="text-indigo-500" strokeWidth={2.5} />
                </div>
                محددات المؤسسة
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    المديرية المرتبطة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      handleInputChange('departmentId', e.target.value)
                      handleInputChange('roleId', '')
                    }}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold bg-white transition-colors shadow-sm appearance-none ${
                        formData.departmentId ? 'text-slate-900' : 'text-slate-400'
                    } ${
                      validationErrors.departmentId ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                    }`}
                  >
                    <option value="" disabled>اختر المديرية التابع لها</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id} className="text-slate-900 font-medium">
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.departmentId && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.departmentId}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                    صلاحيات الدور <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => handleInputChange('roleId', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold bg-white transition-colors shadow-sm appearance-none ${
                        formData.roleId ? 'text-slate-900' : 'text-slate-400'
                    } ${
                      validationErrors.roleId ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                    }`}
                  >
                    <option value="" disabled>تحديد مستوى الوصول</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id} className="text-slate-900 font-medium">
                        {role.displayName || role.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.roleId && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.roleId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Global Error */}
            {error && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><X size={20} strokeWidth={2.5}/></div>
                <p className="text-rose-800 text-[15px] font-bold">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3.5 border border-slate-200 bg-white shadow-sm rounded-xl text-[15px] font-bold text-slate-700 hover:bg-slate-50 transition-all hover:shadow"
              >
                إلغاء التعديل
              </button>
              
              <LoadingButton
                type="submit"
                loading={isLoading}
                className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
              >
                <Save size={20} strokeWidth={2.5} />
                <span className="font-bold text-[15px]">تسجيل وبناء الحساب</span>
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}