'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Briefcase, PlusCircle, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { apiClient, Assignment, Role, Department } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import { LoadingSpinner, LoadingButton } from '@/components/ui/LoadingSpinner'
import { TableDate } from '@/components/ui/DateDisplay'

interface UserAssignmentsPageProps {
  params: Promise<{
    userId: string
  }>
}

export default function UserAssignmentsPage({ params }: UserAssignmentsPageProps) {
  const { user: currentUser } = useAuthStore()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()

  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roleName = (currentUser?.role?.name || currentUser?.roleName || '').toLowerCase()
  const isSuperAdmin = roleName === 'superadmin'

  useEffect(() => {
    params.then(({ userId: routeUserId }) => {
      setUserId(routeUserId)
    })
  }, [params])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    if (!isSuperAdmin) {
      setError('هذه الصفحة متاحة فقط لمدير النظام')
      setIsPageLoading(false)
    }
  }, [currentUser, isSuperAdmin])

  useEffect(() => {
    if (!userId || !isSuperAdmin) {
      return
    }

    void loadPageData(userId)
  }, [userId, isSuperAdmin])

  useEffect(() => {
    if (!selectedDepartmentId || !isSuperAdmin) {
      setRoles([])
      setSelectedRoleId('')
      return
    }

    void loadRoles(selectedDepartmentId)
  }, [selectedDepartmentId, isSuperAdmin])

  const availableRoles = useMemo(
    () => roles.filter((role) => role.isActive),
    [roles]
  )

  const loadPageData = async (targetUserId: string) => {
    setIsPageLoading(true)
    setError(null)

    try {
      const [userResponse, assignmentsResponse, departmentsResponse] = await Promise.all([
        apiClient.getUser(targetUserId),
        apiClient.getAssignmentsByUser(targetUserId),
        apiClient.getDepartments({ pageSize: 200 }),
      ])

      if (!userResponse.success || !userResponse.data) {
        throw new Error(userResponse.message || 'تعذر تحميل بيانات المستخدم')
      }

      if (!assignmentsResponse.success) {
        throw new Error(assignmentsResponse.message || 'تعذر تحميل الإسنادات')
      }

      if (!departmentsResponse.success || !departmentsResponse.data) {
        throw new Error(departmentsResponse.message || 'تعذر تحميل المديريات')
      }

      const loadedDepartments = departmentsResponse.data.items || []
      setUserName(userResponse.data.name)
      setAssignments(assignmentsResponse.data || [])
      setDepartments(loadedDepartments)
      setSelectedDepartmentId(userResponse.data.departmentId || loadedDepartments[0]?.id || '')
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'حدث خطأ أثناء تحميل الصفحة'
      setError(message)
      errorToast('فشل في التحميل', message)
    } finally {
      setIsPageLoading(false)
    }
  }

  const loadRoles = async (departmentId: string) => {
    try {
      const response = await apiClient.getRoles({ departmentId })
      if (!response.success || !response.data) {
        throw new Error(response.message || 'تعذر تحميل الأدوار')
      }

      const loadedRoles = Array.isArray(response.data)
        ? response.data
        : (response.data.items || []) as Role[]

      setRoles(loadedRoles)
      setSelectedRoleId((currentRoleId) => (
        loadedRoles.some((role) => role.id === currentRoleId) ? currentRoleId : loadedRoles[0]?.id || ''
      ))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'حدث خطأ أثناء تحميل الأدوار'
      setRoles([])
      setSelectedRoleId('')
      errorToast('فشل في تحميل الأدوار', message)
    }
  }

  const refreshAssignments = async () => {
    if (!userId) {
      return
    }

    const response = await apiClient.getAssignmentsByUser(userId)
    if (response.success) {
      setAssignments(response.data || [])
      return
    }

    throw new Error(response.message || 'تعذر تحديث قائمة الإسنادات')
  }

  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedDepartmentId || !selectedRoleId) {
      errorToast('بيانات ناقصة', 'يرجى اختيار المديرية والدور قبل الحفظ')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiClient.createAssignment({
        userId,
        departmentId: selectedDepartmentId,
        roleId: selectedRoleId,
        isActive: true,
      })

      if (!response.success) {
        throw new Error(response.message || 'تعذر إضافة الإسناد')
      }

      await refreshAssignments()
      successToast('تمت الإضافة', 'تم إضافة الإسناد للمستخدم بنجاح')
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'حدث خطأ أثناء إضافة الإسناد'
      errorToast('فشل في الإضافة', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleAssignment = async (assignment: Assignment) => {
    setIsUpdatingId(assignment.id)
    try {
      const response = assignment.isActive
        ? await apiClient.deactivateAssignment(assignment.id)
        : await apiClient.activateAssignment(assignment.id)

      if (!response.success) {
        throw new Error(response.message || 'تعذر تحديث حالة الإسناد')
      }

      await refreshAssignments()
      successToast('تم التحديث', `تم ${assignment.isActive ? 'تعطيل' : 'تفعيل'} الإسناد بنجاح`)
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'حدث خطأ أثناء تحديث الإسناد'
      errorToast('فشل في التحديث', message)
    } finally {
      setIsUpdatingId(null)
    }
  }

  const handleDeleteAssignment = async (assignment: Assignment) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإسناد؟')) {
      return
    }

    setIsUpdatingId(assignment.id)
    try {
      const response = await apiClient.deleteAssignment(assignment.id)
      if (!response.success) {
        throw new Error(response.message || 'تعذر حذف الإسناد')
      }

      await refreshAssignments()
      successToast('تم الحذف', 'تم حذف الإسناد بنجاح')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'حدث خطأ أثناء حذف الإسناد'
      errorToast('فشل في الحذف', message)
    } finally {
      setIsUpdatingId(null)
    }
  }

  if (isPageLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-in fade-in">
        <LoadingSpinner size="lg" text="جاري تحميل إسنادات المستخدم..." />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-rose-100 p-8 max-w-lg mx-auto w-full text-center relative overflow-hidden" dir="rtl">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">صلاحيات غير كافية</h3>
          <p className="text-[15px] text-slate-600 mb-8">{error || 'هذه الصفحة متاحة فقط لمدراء النظام.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8 animate-in fade-in duration-500" dir="rtl">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link
            href="/users"
             className="inline-flex items-center gap-2 px-4 py-2 mb-4 border border-slate-200 bg-white shadow-sm rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowRight size={16} strokeWidth={2.5} />
            العودة للمستخدمين
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
              <User size={28} className="text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">إسنادات الصلاحيات</h1>
              <p className="text-[15px] font-medium text-slate-500 mt-1">
                إدارة أدوار <span className="font-bold text-indigo-600">{userName || 'المستخدم'}</span> عبر المديريات
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><Trash2 size={20} strokeWidth={2.5}/></div>
            <p className="text-rose-800 text-[15px] font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD NEW ASSIGNMENT SIDEBAR */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative p-6 md:p-8 sticky top-6">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
                <div className="mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <PlusCircle size={22} strokeWidth={2.5} />
                </div>
                <h2 className="text-[18px] font-black text-slate-900">إضافة إسناد جديد</h2>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div>
                    <label className="block text-[14px] font-bold text-slate-700 mb-2.5">المديرية <span className="text-rose-500">*</span></label>
                    <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold bg-slate-50 border-slate-200 focus:border-indigo-500 hover:border-slate-300 text-slate-900 transition-colors shadow-sm appearance-none"
                    >
                    <option value="" disabled>اختر المديرية التابع لها</option>
                    {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                        {department.name}
                        </option>
                    ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[14px] font-bold text-slate-700 mb-2.5">الدور <span className="text-rose-500">*</span></label>
                    <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold shadow-sm appearance-none transition-colors ${
                        !selectedDepartmentId ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 hover:border-slate-300 text-slate-900'
                    }`}
                    disabled={!selectedDepartmentId}
                    >
                    <option value="" disabled>حدد مستوى الوصول</option>
                    {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                        {role.displayName || role.name}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="pt-2">
                    <LoadingButton
                    type="submit"
                    loading={isSubmitting}
                    loadingText="جاري التنفيذ..."
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 text-[15px]"
                    >
                        <PlusCircle size={18} strokeWidth={2.5}/>
                    تنفيذ الإسناد
                    </LoadingButton>
                </div>
                </form>
            </div>
        </div>

        {/* ASSIGNMENTS TABLE AREA */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="border-b border-slate-200/60 px-6 py-5 bg-slate-50/50">
                <h2 className="flex items-center gap-3 text-[18px] font-black text-slate-900">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <Briefcase size={20} className="text-indigo-500" strokeWidth={2.5} />
                    </div>
                    إسنادات المستخدم الحالية
                </h2>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-white border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-bold text-[14px] text-slate-500 tracking-wide uppercase">المديرية</th>
                        <th className="px-6 py-4 font-bold text-[14px] text-slate-500 tracking-wide uppercase">الدور</th>
                        <th className="px-6 py-4 font-bold text-[14px] text-slate-500 tracking-wide uppercase">تاريخ التوثيق</th>
                        <th className="px-6 py-4 font-bold text-[14px] text-slate-500 tracking-wide uppercase">الحالة</th>
                        <th className="px-6 py-4 font-bold text-[14px] text-slate-500 tracking-wide uppercase flex justify-end">تعديل</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-slate-50/20">
                    {assignments.length === 0 ? (
                        <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <Briefcase size={48} className="mb-4 opacity-20" strokeWidth={1} />
                                <p className="text-[16px] font-bold text-slate-500 text-center">لا توجد أي إسنادات أو أدوار معينة لهذا المستخدم حتى الآن.</p>
                            </div>
                        </td>
                        </tr>
                    ) : (
                        assignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 text-[15px] font-bold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    {assignment.departmentName || 'غير محدد'}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-[15px] font-medium text-slate-700 whitespace-nowrap">
                                {assignment.roleName || 'غير محدد'}
                            </td>
                            <td className="px-6 py-4 text-[14px] text-slate-500 font-medium whitespace-nowrap">
                            <TableDate date={assignment.createdAt} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ${
                                assignment.isActive 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${assignment.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {assignment.isActive ? 'صلاحية نشطة' : 'معطل مؤقتاً'}
                            </span>
                            </td>
                            <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                type="button"
                                onClick={() => handleToggleAssignment(assignment)}
                                disabled={isUpdatingId === assignment.id}
                                title={assignment.isActive ? "تعطيل" : "تفعيل"}
                                className={`p-2 rounded-lg transition-colors border ${
                                    assignment.isActive 
                                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300' 
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                                } disabled:opacity-50 shadow-sm`}
                                >
                                {assignment.isActive ? <ToggleLeft size={18} strokeWidth={2.5}/> : <ToggleRight size={18} strokeWidth={2.5}/>}
                                </button>

                                <button
                                type="button"
                                onClick={() => handleDeleteAssignment(assignment)}
                                disabled={isUpdatingId === assignment.id}
                                title="حذف"
                                className="p-2 rounded-lg transition-colors border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50 shadow-sm"
                                >
                                <Trash2 size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
