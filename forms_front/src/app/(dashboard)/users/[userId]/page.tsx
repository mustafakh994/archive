'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Save, X, Eye, EyeOff, User, Mail, Lock, Building, Shield, Trash2, FileStack, ClipboardList } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useRoleStore } from '@/lib/store/useRoleStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import { LoadingButton } from '@/components/ui/LoadingSpinner'
import {
  apiClient,
  CreateUserData,
  type User as ApiUser,
  type UserPermissionRecord,
  type FormPermissionRecord,
  type Form,
} from '@/lib/api/client'
import {
  canManageUserIndividualPermissions,
  isArchivistUser,
  isDepartmentAdminUser,
  isSuperAdminUser,
} from '@/lib/role-utils'

function formPermissionLabelAr(permission: string): string {
  const p = permission.toLowerCase()
  if (p === 'archivist') return 'مؤرشف'
  if (p === 'read') return 'قراءة'
  if (p === 'write') return 'كتابة'
  if (p === 'admin') return 'إدارة'
  if (p === 'search_inquiry') return 'بحث واستعلام'
  return permission
}

interface EditUserPageProps {
  params: {
    userId: string
  } | Promise<{
    userId: string
  }>
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter()
  const routeParams = useParams<{ userId: string }>()
  const [userId, setUserId] = useState<string>('')
  
  const { 
    updateUser, 
    isLoading, 
    error, 
    clearError 
  } = useUserStore()
  
  const { departments, fetchDepartments } = useDepartmentStore()
  const { roles: departmentRoles, fetchRoles, isLoading: rolesLoading } = useRoleStore()
  const { user: currentUser } = useAuthStore()
  
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    roleId: '',
    isActive: true
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [directFetchedUser, setDirectFetchedUser] = useState<ApiUser | null>(null)
  const [isUserLoading, setIsUserLoading] = useState(false)
  const [userIndividualPermissions, setUserIndividualPermissions] = useState<UserPermissionRecord[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState(false)
  const [formTemplateAssignments, setFormTemplateAssignments] = useState<FormPermissionRecord[]>([])
  const [deptFormsForArchivist, setDeptFormsForArchivist] = useState<Form[]>([])
  const [archivistTemplatesLoading, setArchivistTemplatesLoading] = useState(false)
  const [archivistTemplateAction, setArchivistTemplateAction] = useState<string | null>(null)
  const [selectedTemplateFormId, setSelectedTemplateFormId] = useState('')

  const coerceUserPayload = (payload: unknown): ApiUser | null => {
    const nested = (payload as { data?: unknown })?.data
    const candidate = (nested && typeof nested === 'object' ? nested : payload) as Partial<ApiUser> | null
    return candidate && typeof candidate.id === 'string' ? (candidate as ApiUser) : null
  }

  // Get userId from params
  useEffect(() => {
    let isMounted = true

    Promise.resolve(params).then(({ userId }) => {
      if (isMounted) {
        setUserId(userId)
      }
    })

    return () => {
      isMounted = false
    }
  }, [params])

  // Fallback for environments where route params are exposed synchronously.
  useEffect(() => {
    if (typeof routeParams?.userId === 'string' && routeParams.userId.length > 0) {
      setUserId(routeParams.userId)
    }
  }, [routeParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#archivist-templates') return
    const t = window.setTimeout(() => {
      document.getElementById('archivist-templates')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 400)
    return () => window.clearTimeout(t)
  }, [userId, directFetchedUser])

  // Load user data and departments
  useEffect(() => {
    if (userId) {
      setIsUserLoading(true)
      void fetchDepartments({ page: 1, pageSize: 500 })

      // Resolve target user directly for this page.
      apiClient.getUser(userId)
        .then(response => {
          const user = coerceUserPayload(response.data)
          if (response.success && user) {
            setDirectFetchedUser(user)
          } else {
            setDirectFetchedUser(null)
          }
        })
        .catch(() => {
          setDirectFetchedUser(null)
        })
        .finally(() => {
          setIsUserLoading(false)
        })
    }
  }, [userId, fetchDepartments])

  // Populate form when user data is loaded
  useEffect(() => {
    const user = directFetchedUser

    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        departmentId: user.departmentId || '',
        roleId: user.roleId || '',
        isActive: user.isActive ?? true
      })
    }
  }, [directFetchedUser])

  // Roles for the selected department (includes Archivist / مؤرشف per department)
  useEffect(() => {
    if (!formData.departmentId) {
      return
    }
    void fetchRoles({ departmentId: formData.departmentId })
  }, [formData.departmentId, fetchRoles])

  // Clear errors when form data changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    setValidationErrors({})
  }, [formData, error, clearError])

  useEffect(() => {
    if (!currentUser) {
      return
    }
    if (!isSuperAdminUser(currentUser) && !isDepartmentAdminUser(currentUser)) {
      errorToast('غير مصرح', 'ليس لديك صلاحية لعرض أو تعديل المستخدمين')
      router.push('/dashboard')
    }
  }, [currentUser, errorToast, router])

  // Department admin may only manage users in their department
  useEffect(() => {
    if (!currentUser || !directFetchedUser) return
    if (!isDepartmentAdminUser(currentUser)) return
    if (directFetchedUser.departmentId !== currentUser.departmentId) {
      errorToast('غير مصرح', 'لا يمكنك إدارة مستخدم من مديرية أخرى')
      router.push('/users')
    }
  }, [currentUser, directFetchedUser, errorToast, router])

  const loadArchivistPermissions = useCallback(async () => {
    if (!userId) return
    setPermLoading(true)
    try {
      const res = await apiClient.getUserPermissions(userId)
      const list = (res.success && Array.isArray(res.data) ? res.data : []) as UserPermissionRecord[]
      setUserIndividualPermissions(list)
    } catch {
      setUserIndividualPermissions([])
    } finally {
      setPermLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !directFetchedUser || !currentUser) return
    if (!canManageUserIndividualPermissions(currentUser)) return
    if (!isArchivistUser(directFetchedUser)) return
    void loadArchivistPermissions()
  }, [userId, directFetchedUser, currentUser, loadArchivistPermissions])

  const loadArchivistTemplateAssignments = useCallback(async () => {
    if (!userId) return
    const deptId = formData.departmentId || directFetchedUser?.departmentId
    if (!deptId) return

    setArchivistTemplatesLoading(true)
    try {
      const [permRes, formsRes] = await Promise.all([
        apiClient.getUserFormPermissions(userId),
        apiClient.getForms({ departmentId: deptId, page: 1, pageSize: 500 }),
      ])
      const list = (permRes.success && Array.isArray(permRes.data) ? permRes.data : []) as FormPermissionRecord[]
      setFormTemplateAssignments(list)
      const items = formsRes.success && formsRes.data?.items ? formsRes.data.items : []
      setDeptFormsForArchivist(items)
    } catch {
      setFormTemplateAssignments([])
      setDeptFormsForArchivist([])
    } finally {
      setArchivistTemplatesLoading(false)
    }
  }, [userId, formData.departmentId, directFetchedUser?.departmentId])

  useEffect(() => {
    if (!userId || !directFetchedUser || !currentUser) return
    if (!canManageUserIndividualPermissions(currentUser)) return
    if (!isArchivistUser(directFetchedUser)) {
      setFormTemplateAssignments([])
      setDeptFormsForArchivist([])
      return
    }
    void loadArchivistTemplateAssignments()
  }, [userId, directFetchedUser, currentUser, loadArchivistTemplateAssignments])

  const archivistAssignableForms = useMemo(() => {
    const assigned = new Set(
      formTemplateAssignments
        .filter((a) => a.permission.toLowerCase() === 'archivist')
        .map((a) => a.formId)
    )
    return deptFormsForArchivist.filter((f) => !assigned.has(f.id))
  }, [formTemplateAssignments, deptFormsForArchivist])

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

    // Password validation (only if password is provided)
    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'
      }
      
      // Confirm password validation
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'كلمة المرور غير متطابقة'
      }
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

  const handleInputChange = (field: string, value: string | boolean) => {
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
      const updateData: Partial<CreateUserData & { isActive?: boolean }> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        departmentId: formData.departmentId,
        roleId: formData.roleId,
        isActive: formData.isActive
      }

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password
      }

      const success = await updateUser(userId, updateData)

      if (success) {
        const refreshedUser = await apiClient.getUser(userId)
        const user = coerceUserPayload(refreshedUser.data)
        if (refreshedUser.success && user) {
          setDirectFetchedUser(user)
        }

        successToast('تم تحديث المستخدم!', `تم تحديث بيانات ${formData.name} بنجاح`)
        setIsEditMode(false)
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }))
      } else {
        errorToast('فشل في التحديث', 'حدث خطأ أثناء تحديث المستخدم. يرجى المحاولة مرة أخرى.')
      }
    } catch (err) {
      console.error('Error updating user:', err)
      errorToast('خطأ في التحديث', 'حدث خطأ غير متوقع أثناء تحديث المستخدم.')
    }
  }

  const handleCancel = () => {
    if (isEditMode) {
      setIsEditMode(false)
      // Reset form data
      const user = directFetchedUser
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '',
          confirmPassword: '',
          departmentId: user.departmentId || '',
          roleId: user.roleId || '',
          isActive: user.isActive ?? true
        })
      }
    } else {
      router.push('/users')
    }
  }

  // Get current user data
  const currentUserData = directFetchedUser

  const superAdmin = isSuperAdminUser(currentUser)
  const deptAdmin = isDepartmentAdminUser(currentUser)
  const managerCanEdit = superAdmin || deptAdmin

  const availableRoles = useMemo(() => {
    if (!managerCanEdit || !formData.departmentId) {
      return []
    }
    return [...departmentRoles]
      .filter((r) => r.isActive && r.departmentId === formData.departmentId)
      .sort((a, b) => {
        const order = (name: string) => {
          const n = name.toLowerCase()
          if (n === 'superadmin') return 0
          if (n === 'departmentadmin') return 1
          if (n === 'archivist') return 2
          return 3
        }
        const diff = order(a.name) - order(b.name)
        if (diff !== 0) return diff
        return (a.displayName || a.name).localeCompare(b.displayName || b.name, 'ar')
      })
  }, [managerCanEdit, formData.departmentId, departmentRoles])

  const getAvailableDepartments = () => {
    if (superAdmin) {
      return departments
    }
    if (deptAdmin && currentUser?.departmentId) {
      return departments.filter((d) => d.id === currentUser.departmentId)
    }
    return []
  }

  const availableDepartments = getAvailableDepartments()

  const hasCreateTemplateOverride = userIndividualPermissions.some(
    (p) => (p.permissionName || '').toLowerCase() === 'createformtemplate'
  )

  const handleToggleCreateTemplate = async () => {
    if (!userId || permSaving) return
    setPermSaving(true)
    try {
      if (hasCreateTemplateOverride) {
        const res = await apiClient.removeUserPermission(userId, 'CreateFormTemplate')
        if (!res.success) {
          errorToast('فشل', res.message || 'تعذر إزالة الصلاحية')
          return
        }
        successToast('تم التحديث', 'تم إلغاء صلاحية إنشاء القوالب لهذا المستخدم')
      } else {
        const res = await apiClient.addUserPermission(userId, 'CreateFormTemplate')
        if (!res.success) {
          errorToast('فشل', res.message || 'تعذر إضافة الصلاحية')
          return
        }
        successToast('تم التحديث', 'تم منح صلاحية إنشاء قوالب جديدة (استثناء فردي)')
      }
      await loadArchivistPermissions()
    } catch (e) {
      errorToast('خطأ', 'حدث خطأ أثناء حفظ الصلاحية')
    } finally {
      setPermSaving(false)
    }
  }

  const handleAssignArchivistTemplate = async () => {
    if (!selectedTemplateFormId || !userId || archivistTemplateAction) return
    setArchivistTemplateAction('add')
    try {
      const res = await apiClient.addFormPermission(selectedTemplateFormId, {
        userId,
        permission: 'archivist',
      })
      if (!res.success) {
        errorToast('فشل الإسناد', res.message || 'تعذر إسناد القالب')
        return
      }
      successToast('تم الإسناد', 'تم ربط قالب الوثيقة بهذا المؤرشف')
      setSelectedTemplateFormId('')
      await loadArchivistTemplateAssignments()
      apiClient.clearCachePattern('/forms')
    } catch {
      errorToast('خطأ', 'حدث خطأ أثناء الإسناد')
    } finally {
      setArchivistTemplateAction(null)
    }
  }

  const handleRemoveFormTemplateAssignment = async (formId: string, permission: string) => {
    if (!userId || archivistTemplateAction) return
    setArchivistTemplateAction(`${formId}:${permission}`)
    try {
      const res = await apiClient.removeFormPermission(formId, userId, permission)
      if (!res.success) {
        errorToast('فشل', res.message || 'تعذر إزالة الإسناد')
        return
      }
      successToast('تم', 'تم إزالة إسناد القالب')
      await loadArchivistTemplateAssignments()
      apiClient.clearCachePattern('/forms')
    } catch {
      errorToast('خطأ', 'حدث خطأ أثناء الإزالة')
    } finally {
      setArchivistTemplateAction(null)
    }
  }

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    )
  }

  if (!currentUserData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-rose-100 p-8 max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">المستخدم غير موجود</h3>
          <p className="text-[15px] text-slate-600 mb-8" dir="rtl">لم يتم العثور على بيانات هذا المستخدم.</p>
          <button
            onClick={() => router.push('/users')}
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
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {isEditMode ? 'تعديل المستخدم' : 'عرض المستخدم'}
              </h1>
              <p className="text-[15px] font-medium text-slate-500 mt-1">{currentUserData.name}</p>
            </div>
          </div>
        </div>
        
        {!isEditMode && (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
          >
            <Shield size={20} strokeWidth={2.5} />
            تفعيل وضع التعديل
          </button>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-600 to-blue-500"></div>
        <div className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Information Section */}
            <div className={`bg-slate-50/50 p-6 md:p-8 rounded-2xl border ${isEditMode ? 'border-slate-200' : 'border-slate-100'} transition-colors`}>
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
                    disabled={!isEditMode}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold transition-colors shadow-sm ${
                      !isEditMode ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white text-slate-900'
                    } ${
                      validationErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                    }`}
                    placeholder="أدخل الاسم الكامل"
                    dir="rtl"
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
                      disabled={!isEditMode}
                      className={`w-full px-4 py-3.5 pr-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold transition-colors shadow-sm ${
                        !isEditMode ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white text-slate-900'
                      } ${
                        validationErrors.email ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                      }`}
                      placeholder="user@example.com"
                      dir="ltr"
                    />
                    <Mail className={`absolute right-4 top-4 h-5 w-5 ${!isEditMode ? 'text-slate-300' : 'text-slate-400'}`} strokeWidth={2.5} />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Section - Only show in edit mode */}
            {isEditMode && (
              <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Lock size={20} className="text-indigo-500" strokeWidth={2.5} />
                  </div>
                  تغيير كلمة المرور (اختياري)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                      كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full px-4 py-3.5 pr-12 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                          validationErrors.password ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                        }`}
                        placeholder="اتركه فارغاً للاحتفاظ بالحالية"
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
                      تأكيد كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full px-4 py-3.5 pr-12 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-slate-900 font-bold bg-white transition-colors shadow-sm ${
                          validationErrors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                        }`}
                        placeholder="أعد إدخال كلمة المرور"
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
            )}

            {/* Organization Section */}
            <div className={`bg-slate-50/50 p-6 md:p-8 rounded-2xl border ${isEditMode ? 'border-slate-200' : 'border-slate-100'} transition-colors`}>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4 mb-6">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Building size={20} className="text-indigo-500" strokeWidth={2.5} />
                    </div>
                    محددات المؤسسة
                </h3>
                {/* Status Toggle moved up to header in a small badge */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className={`text-[14px] font-bold ${formData.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formData.isActive ? 'حساب قيد التفعيل' : 'حساب معلق'}
                    </span>
                    <div className={`relative inline-block w-12 h-6 transition-colors rounded-full ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        disabled={!isEditMode}
                        className="absolute w-0 h-0 opacity-0"
                        />
                        <span className={`absolute max-w-full m-1 w-4 h-4 transition-transform bg-white rounded-full ${formData.isActive ? 'translate-x-[-24px] rtl:-translate-x-6' : 'translate-x-[0px]'}`}></span>
                    </div>
                  </label>
                </div>
              </div>
              
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
                    disabled={!isEditMode || deptAdmin}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold transition-colors shadow-sm appearance-none ${
                        !isEditMode ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white text-slate-900'
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
                    disabled={!isEditMode || rolesLoading}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold transition-colors shadow-sm appearance-none ${
                        !isEditMode ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white text-slate-900'
                    } ${
                      validationErrors.roleId ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500 hover:border-slate-300'
                    }`}
                  >
                    <option value="" disabled>
                      {rolesLoading && isEditMode
                        ? 'جاري تحميل الأدوار…'
                        : 'تحديد مستوى الوصول'}
                    </option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id} className="text-slate-900 font-medium">
                        {role.displayName || role.name}
                      </option>
                    ))}
                    {formData.roleId &&
                      !availableRoles.some((r) => r.id === formData.roleId) &&
                      (currentUserData?.roleName || currentUserData?.role?.name) && (
                        <option value={formData.roleId} className="text-slate-900 font-medium">
                          {currentUserData.roleName || currentUserData.role?.name} (الدور الحالي)
                        </option>
                      )}
                  </select>
                  {validationErrors.roleId && (
                    <p className="mt-2 text-[13px] font-bold text-rose-600 flex items-center gap-1"><X size={14} />{validationErrors.roleId}</p>
                  )}
                </div>
              </div>

            </div>

            {/* Archivist: document templates assigned to this user (FormPermissions.archivist) */}
            {directFetchedUser &&
              isArchivistUser(directFetchedUser) &&
              canManageUserIndividualPermissions(currentUser) && (
                <div
                  id="archivist-templates"
                  className="bg-slate-50/80 p-6 md:p-8 rounded-2xl border border-slate-200/90 scroll-mt-24"
                >
                  <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-3 border-b border-slate-200/80 pb-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm ring-1 ring-slate-100">
                      <ClipboardList size={20} className="text-indigo-700" strokeWidth={2.5} />
                    </div>
                    إسناد قوالب الوثائق للمؤرشف
                  </h3>
                  <p className="text-[14px] text-slate-600 mb-6 leading-relaxed" dir="rtl">
                    يحدد أي قوالب وثائق يمكن لهذا المؤرشف استخدامها لأرشفة السجلات ضمن مديريته. يمكن لمدير النظام أو مدير القسم
                    إضافة أو إزالة الإسناد دون الحاجة إلى واجهة برمجية خارجية.
                  </p>

                  <div className="flex flex-col lg:flex-row gap-4 mb-6 rounded-xl bg-white border border-slate-100 px-4 py-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[13px] font-bold text-slate-600 mb-2" dir="rtl">
                        إضافة قالب (صلاحية &quot;مؤرشف&quot;)
                      </label>
                      <select
                        value={selectedTemplateFormId}
                        onChange={(e) => setSelectedTemplateFormId(e.target.value)}
                        disabled={!isEditMode || archivistTemplatesLoading || !!archivistTemplateAction}
                        className="w-full px-4 py-3 border rounded-xl text-[15px] font-medium text-slate-900 bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
                        dir="rtl"
                      >
                        <option value="">— اختر قالباً من مديرية المستخدم —</option>
                        {archivistAssignableForms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.title || f.name || f.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={
                          !isEditMode ||
                          !selectedTemplateFormId ||
                          !!archivistTemplateAction ||
                          archivistTemplatesLoading
                        }
                        onClick={() => void handleAssignArchivistTemplate()}
                        className="w-full lg:w-auto px-6 py-3 rounded-xl font-bold text-[14px] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        dir="rtl"
                      >
                        {archivistTemplateAction === 'add' ? 'جاري الإسناد…' : 'إسناد القالب'}
                      </button>
                    </div>
                  </div>

                  {!isEditMode && (
                    <p className="mb-4 text-[13px] text-slate-600 font-medium" dir="rtl">
                      فعّل &quot;وضع التعديل&quot; أعلاه لإضافة أو إزالة إسناد القوالب.
                    </p>
                  )}

                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                    {archivistTemplatesLoading ? (
                      <p className="p-6 text-center text-slate-500 font-medium" dir="rtl">
                        جاري تحميل القوالب المسندة…
                      </p>
                    ) : formTemplateAssignments.length === 0 ? (
                      <p className="p-6 text-center text-slate-500 font-medium" dir="rtl">
                        لا توجد قوالب مسندة بعد. أضف قالباً من القائمة أعلاه.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-[14px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 font-bold text-slate-700">عنوان القالب</th>
                              <th className="px-4 py-3 font-bold text-slate-700 w-36">نوع الإذن</th>
                              <th className="px-4 py-3 font-bold text-slate-700 w-28">إجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formTemplateAssignments.map((row) => (
                              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {row.formTitle || '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {formPermissionLabelAr(row.permission)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    disabled={!isEditMode || !!archivistTemplateAction}
                                    onClick={() => void handleRemoveFormTemplateAssignment(row.formId, row.permission)}
                                    className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800 font-bold text-[13px] disabled:opacity-50"
                                    dir="rtl"
                                  >
                                    <Trash2 size={16} />
                                    {archivistTemplateAction === `${row.formId}:${row.permission}` ? '…' : 'إزالة'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Archivist individual overrides (CreateFormTemplate) — مدير النظام أو مدير القسم */}
            {directFetchedUser &&
              isArchivistUser(directFetchedUser) &&
              canManageUserIndividualPermissions(currentUser) && (
                <div className="bg-amber-50/60 p-6 md:p-8 rounded-2xl border border-amber-200/80">
                  <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-3 border-b border-amber-200/60 pb-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm ring-1 ring-amber-100">
                      <FileStack size={20} className="text-amber-700" strokeWidth={2.5} />
                    </div>
                    تخصيص صلاحيات المؤرشف (استثناءات فردية)
                  </h3>
                  <p className="text-[14px] text-slate-600 mb-6 leading-relaxed" dir="rtl">
                    افتراضياً لا يستطيع المؤرشف إنشاء قوالب جديدة. يمكنك منح مستخدم واحد صلاحية &quot;إنشاء قالب&quot; دون
                    توسيع ذلك على جميع المؤرشفين في القسم.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-white/90 border border-amber-100 px-4 py-4">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900" dir="rtl">
                        السماح بإنشاء قوالب وثائق جديدة في القسم
                      </p>
                      <p className="text-[13px] text-slate-500 mt-1" dir="rtl">
                        يعادل صلاحية النظام <span className="font-mono text-xs">CreateFormTemplate</span> المرتبطة بهذا المستخدم فقط.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={permLoading || permSaving || !isEditMode}
                      onClick={() => void handleToggleCreateTemplate()}
                      className={`inline-flex items-center gap-3 shrink-0 px-4 py-2.5 rounded-xl font-bold text-[14px] transition-colors ${
                        hasCreateTemplateOverride
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      } disabled:opacity-50 disabled:pointer-events-none`}
                      dir="rtl"
                    >
                      {permLoading || permSaving ? 'جاري الحفظ…' : hasCreateTemplateOverride ? 'إلغاء الصلاحية' : 'منح الصلاحية'}
                    </button>
                  </div>
                  {!isEditMode && (
                    <p className="mt-3 text-[13px] text-amber-800 font-medium" dir="rtl">
                      فعّل &quot;وضع التعديل&quot; أعلاه لتغيير هذا الخيار.
                    </p>
                  )}
                </div>
              )}

            {/* Global Error */}
            {error && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><X size={20} strokeWidth={2.5}/></div>
                <p className="text-rose-800 text-[15px] font-bold">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {isEditMode && (
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200/80">
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
                  <span className="font-bold text-[15px]">حفظ التغييرات</span>
                </LoadingButton>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}