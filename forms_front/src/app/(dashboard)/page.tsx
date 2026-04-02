'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Archive, Building, FileText, Users } from 'lucide-react'
import { apiClient, Department, Form, User } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/useAuthStore'
import FormArchiveBarChart from './_components/FormArchiveBarChart'

interface DepartmentUserStat {
  departmentId: string
  departmentName: string
  departmentCode: string
  userCount: number
}

interface FormArchiveStat {
  formId: string
  formTitle: string
  archivedCount: number
  departmentName: string
}

interface DashboardStatsState {
  userCount: number
  formCount: number
  departmentUserStats: DepartmentUserStat[]
  formArchiveStats: FormArchiveStat[]
}

const EMPTY_STATS: DashboardStatsState = {
  userCount: 0,
  formCount: 0,
  departmentUserStats: [],
  formArchiveStats: [],
}

export default function DashboardHomePage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStatsState>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizedRoleName = useMemo(
    () => (user?.role?.name || user?.roleName || '').toLowerCase(),
    [user]
  )

  const isSuperAdmin = normalizedRoleName === 'superadmin'
  const isDepartmentAdmin = normalizedRoleName === 'departmentadmin'

  const getScopedUsers = useCallback(async (): Promise<User[]> => {
    if (!user) {
      return []
    }

    if (isSuperAdmin) {
      const response = await apiClient.getUsers()
      return response.data?.items || []
    }

    if (isDepartmentAdmin && user.departmentId) {
      const response = await apiClient.getUsers({ departmentId: user.departmentId })
      return response.data?.items || []
    }

    return [user]
  }, [isDepartmentAdmin, isSuperAdmin, user])

  const getScopedForms = useCallback(async (): Promise<Form[]> => {
    if (!user) {
      return []
    }

    if (isSuperAdmin) {
      const response = await apiClient.getForms()
      return response.data?.items || []
    }

    if (isDepartmentAdmin && user.departmentId) {
      const response = await apiClient.getForms({ departmentId: user.departmentId })
      return response.data?.items || []
    }

    const response = await apiClient.getForms({ createdBy: user.id })
    return response.data?.items || []
  }, [isDepartmentAdmin, isSuperAdmin, user])

  const loadDashboardStats = useCallback(async () => {
    if (!user) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [scopedUsers, scopedForms, departmentsResponse] = await Promise.all([
        getScopedUsers(),
        getScopedForms(),
        apiClient.getDepartments({ pageSize: 200 }),
      ])

      const departments = departmentsResponse.data?.items || []
      const departmentCodeMap = new Map<string, Department>(
        departments.map((department) => [department.id, department])
      )

      const departmentMap = new Map<string, DepartmentUserStat>()

      scopedUsers.forEach((currentUser) => {
        const departmentId = currentUser.departmentId || 'unknown'
        const departmentName =
          currentUser.department?.name || currentUser.departmentName || 'غير محدد'
        const departmentCode =
          currentUser.department?.code ||
          departmentCodeMap.get(departmentId)?.code ||
          '-'

        const existingDepartment = departmentMap.get(departmentId)

        if (existingDepartment) {
          existingDepartment.userCount += 1
          return
        }

        departmentMap.set(departmentId, {
          departmentId,
          departmentName,
          departmentCode,
          userCount: 1,
        })
      })

      const departmentUserStats = Array.from(departmentMap.values()).sort(
        (a, b) => b.userCount - a.userCount
      )

      const formArchiveStats = await Promise.all(
        scopedForms.map(async (form) => {
          const submissionsResponse = await apiClient.getFormSubmissions(form.id, {
            page: 1,
            pageSize: 1,
          })

          return {
            formId: form.id,
            formTitle: form.title || form.name || 'بدون عنوان',
            archivedCount: submissionsResponse.data?.totalCount || 0,
            departmentName:
              form.department?.name ||
              form.departmentName ||
              form.organization?.name ||
              'غير محدد',
          }
        })
      )

      setStats({
        userCount: scopedUsers.length,
        formCount: scopedForms.length,
        departmentUserStats,
        formArchiveStats: formArchiveStats.sort((a, b) => b.archivedCount - a.archivedCount),
      })
    } catch (loadError) {
      console.error('Failed to load dashboard stats:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الإحصائيات')
      setStats(EMPTY_STATS)
    } finally {
      setIsLoading(false)
    }
  }, [getScopedForms, getScopedUsers, user])

  useEffect(() => {
    loadDashboardStats()
  }, [loadDashboardStats])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg font-medium text-gray-700" dir="rtl">جاري تحميل إحصائيات الصفحة الرئيسية...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-right" dir="rtl">
        <h1 className="mb-2 text-2xl font-bold text-red-700">تعذر تحميل الإحصائيات</h1>
        <p className="mb-4 text-red-600">{error}</p>
        <button
          onClick={loadDashboardStats}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const totalDepartments = stats.departmentUserStats.length
  const totalArchivedDocuments = stats.formArchiveStats.reduce((sum, item) => sum + item.archivedCount, 0)

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="mt-2 text-lg text-gray-600">
            ملخص سريع لعدد المستخدمين والأدوار والقوالب والوثائق المؤرشفة.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/users"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            المستخدمون
          </Link>
          <Link
            href="/forms"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            القوالب
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-blue-100 p-3 text-blue-700">
              <Users className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-gray-500">إجمالي المستخدمين</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.userCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <Building className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-gray-500">إجمالي الأقسام</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalDepartments}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-violet-100 p-3 text-violet-700">
              <FileText className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-gray-500">إجمالي القوالب</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.formCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-amber-100 p-3 text-amber-700">
              <Archive className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-gray-500">إجمالي الوثائق المؤرشفة</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalArchivedDocuments}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">عدد المستخدمين في كل قسم</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-gray-600">
              <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                <tr>
                  <th className="px-6 py-4">القسم</th>
                  <th className="px-6 py-4">كود القسم</th>
                  <th className="px-6 py-4">عدد المستخدمين</th>
                </tr>
              </thead>
              <tbody>
                {stats.departmentUserStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      لا توجد بيانات أقسام لعرضها.
                    </td>
                  </tr>
                ) : (
                  stats.departmentUserStats.map((item) => (
                    <tr key={item.departmentId} className="border-t border-gray-100">
                      <td className="px-6 py-4">{item.departmentName}</td>
                      <td className="px-6 py-4">{item.departmentCode}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">
                          {item.userCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">عدد الوثائق المؤرشفة لكل قالب</h2>
          </div>
          <FormArchiveBarChart rows={stats.formArchiveStats} />
          {/* جدول عدد الوثائق المؤرشفة لكل قالب — معطّل مؤقتاً
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-gray-600">
              <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                <tr>
                  <th className="px-6 py-4">القالب</th>
                  <th className="px-6 py-4">الجهة</th>
                  <th className="px-6 py-4">الوثائق المؤرشفة</th>
                </tr>
              </thead>
              <tbody>
                {stats.formArchiveStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      لا توجد قوالب لعرضها.
                    </td>
                  </tr>
                ) : (
                  stats.formArchiveStats.map((item) => (
                    <tr key={item.formId} className="border-t border-gray-100">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.formTitle}</td>
                      <td className="px-6 py-4">{item.departmentName}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                          {item.archivedCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          */}
        </section>

      </div>
    </div>
  )
}
