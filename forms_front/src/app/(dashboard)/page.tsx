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
  departmentCount: number
  departmentUserStats: DepartmentUserStat[]
  formArchiveStats: FormArchiveStat[]
}

const EMPTY_STATS: DashboardStatsState = {
  userCount: 0,
  formCount: 0,
  departmentCount: 0,
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

  const getScopedUsers = useCallback(async (): Promise<{ items: User[]; totalCount: number }> => {
    if (!user) {
      return { items: [], totalCount: 0 }
    }

    if (isSuperAdmin) {
      const response = await apiClient.getUsers({ pageSize: 1000 })
      const items = response.data?.items || []
      return { items, totalCount: response.data?.totalCount ?? items.length }
    }

    if (isDepartmentAdmin && user.departmentId) {
      const response = await apiClient.getUsers({
        departmentId: user.departmentId,
        pageSize: 1000,
      })
      const items = response.data?.items || []
      return { items, totalCount: response.data?.totalCount ?? items.length }
    }

    return { items: [user], totalCount: 1 }
  }, [isDepartmentAdmin, isSuperAdmin, user])

  const getScopedForms = useCallback(async (): Promise<{ items: Form[]; totalCount: number }> => {
    if (!user) {
      return { items: [], totalCount: 0 }
    }

    if (isSuperAdmin) {
      const response = await apiClient.getForms({ pageSize: 1000 })
      const items = response.data?.items || []
      return { items, totalCount: response.data?.totalCount ?? items.length }
    }

    if (isDepartmentAdmin && user.departmentId) {
      const response = await apiClient.getForms({
        departmentId: user.departmentId,
        pageSize: 1000,
      })
      const items = response.data?.items || []
      return { items, totalCount: response.data?.totalCount ?? items.length }
    }

    const response = await apiClient.getForms({ createdBy: user.id, pageSize: 1000 })
    const items = response.data?.items || []
    return { items, totalCount: response.data?.totalCount ?? items.length }
  }, [isDepartmentAdmin, isSuperAdmin, user])

  const loadDashboardStats = useCallback(async () => {
    if (!user) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [scopedUsersResult, scopedFormsResult, departmentsResponse] = await Promise.all([
        getScopedUsers(),
        getScopedForms(),
        apiClient.getDepartments({ pageSize: 200 }),
      ])

      const scopedUsers = scopedUsersResult.items
      const scopedForms = scopedFormsResult.items

      const departments = departmentsResponse.data?.items || []
      const departmentsTotalCount = departmentsResponse.data?.totalCount ?? departments.length
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

      const totalDepartmentsCount = isSuperAdmin
        ? departmentsTotalCount
        : departmentUserStats.length

      setStats({
        userCount: scopedUsersResult.totalCount,
        formCount: scopedFormsResult.totalCount,
        departmentCount: totalDepartmentsCount,
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
  }, [getScopedForms, getScopedUsers, isSuperAdmin, user])

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

  const totalDepartments = stats.departmentCount
  const totalArchivedDocuments = stats.formArchiveStats.reduce((sum, item) => sum + item.archivedCount, 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">لوحة التحكم</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium max-w-2xl">
            ملخص سريع لعدد المستخدمين والأدوار والقوالب والوثائق المؤرشفة.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/users"
            className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-2.5 font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 hover:shadow"
          >
            المستخدمون
          </Link>
          <Link
            href="/forms"
            className="rounded-xl px-5 py-2.5 font-bold text-white transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600"
          >
            القوالب
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 rounded-r-xl"></div>
          <div className="flex items-center justify-between z-10 relative pl-2">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1 leading-tight" dir="rtl">إجمالي المستخدمين</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-2">{stats.userCount}</p>
            </div>
            <div className="bg-blue-50/80 p-3.5 rounded-xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300 ring-4 ring-white shadow-sm">
              <Users size={22} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-xl"></div>
          <div className="flex items-center justify-between z-10 relative pl-2">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1 leading-tight" dir="rtl">إجمالي الأقسام</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-2">{totalDepartments}</p>
            </div>
            <div className="bg-emerald-50/80 p-3.5 rounded-xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 ring-4 ring-white shadow-sm">
              <Building size={22} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-violet-500 rounded-r-xl"></div>
          <div className="flex items-center justify-between z-10 relative pl-2">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1 leading-tight" dir="rtl">إجمالي القوالب</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-2">{stats.formCount}</p>
            </div>
            <div className="bg-violet-50/80 p-3.5 rounded-xl text-violet-600 group-hover:scale-110 group-hover:bg-violet-100 transition-all duration-300 ring-4 ring-white shadow-sm">
              <FileText size={22} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 rounded-r-xl"></div>
          <div className="flex items-center justify-between z-10 relative pl-2">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1 leading-tight" dir="rtl">الوثائق المؤرشفة</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-2">{totalArchivedDocuments}</p>
            </div>
            <div className="bg-amber-50/80 p-3.5 rounded-xl text-amber-600 group-hover:scale-110 group-hover:bg-amber-100 transition-all duration-300 ring-4 ring-white shadow-sm">
              <Archive size={22} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-[17px] font-bold text-slate-900">عدد المستخدمين في كل قسم</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-sm text-slate-600">
              <thead className="bg-slate-50 text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">القسم</th>
                  <th className="px-6 py-4 border-b border-slate-200">كود القسم</th>
                  <th className="px-6 py-4 border-b border-slate-200">عدد المستخدمين</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.departmentUserStats.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">
                      لا توجد بيانات أقسام لعرضها.
                    </td>
                  </tr>
                ) : (
                  stats.departmentUserStats.map((item) => (
                    <tr key={item.departmentId} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4.5 font-bold text-slate-700">{item.departmentName}</td>
                      <td className="px-6 py-4.5 font-mono text-slate-500">{item.departmentCode}</td>
                      <td className="px-6 py-4.5">
                        <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
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

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md flex flex-col">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-[17px] font-bold text-slate-900">عدد الوثائق المؤرشفة لكل قالب</h2>
          </div>
          <div className="flex-1 p-6">
            <FormArchiveBarChart rows={stats.formArchiveStats} />
          </div>
        </section>
      </div>
    </div>
  )
}
