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
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="جاري تحميل إسنادات المستخدم..." />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700" dir="rtl">
          {error || 'ليس لديك صلاحية للوصول إلى هذه الصفحة'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة إسنادات المستخدم</h1>
          <p className="mt-1 text-gray-600">{userName || 'مستخدم'}</p>
        </div>

        <Link
          href="/users"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى المستخدمين
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <PlusCircle className="h-5 w-5 text-blue-600" />
          إضافة إسناد جديد
        </div>

        <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">المديرية</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر المديرية</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">الدور</label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedDepartmentId}
            >
              <option value="">اختر الدور</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName || role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="جاري الحفظ..."
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              إضافة الإسناد
            </LoadingButton>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Briefcase className="h-5 w-5 text-blue-600" />
            الإسنادات الحالية
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-6 py-3 font-semibold">المديرية</th>
                <th className="px-6 py-3 font-semibold">الدور</th>
                <th className="px-6 py-3 font-semibold">الحالة</th>
                <th className="px-6 py-3 font-semibold">تاريخ الإنشاء</th>
                <th className="px-6 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    لا توجد إسنادات لهذا المستخدم حتى الآن.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{assignment.departmentName || 'غير محدد'}</td>
                    <td className="px-6 py-4 text-gray-900">{assignment.roleName || 'غير محدد'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        assignment.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <TableDate date={assignment.createdAt} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAssignment(assignment)}
                          disabled={isUpdatingId === assignment.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {assignment.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                          {assignment.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment)}
                          disabled={isUpdatingId === assignment.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
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
  )
}
