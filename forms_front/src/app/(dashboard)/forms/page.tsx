'use client'

import React, { useEffect, useState } from 'react'
import { PlusCircle, MoreHorizontal, Copy, Edit, Trash2, Eye, Play, Pause, BarChart3 } from 'lucide-react'
import { useFormStore } from '@/lib/store/useFormStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import Link from 'next/link'
import { TableDate } from '@/components/ui/DateDisplay'

export default function FormsListPage() {
    const {
        forms,
        isLoading,
        error,
        fetchForms,
        duplicateForm,
        toggleFormStatus,
        deleteForm
    } = useFormStore()
    const { user } = useAuthStore()
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Debug log to see what forms contains
    console.log('Forms in component:', forms, 'Type:', typeof forms, 'Is Array:', Array.isArray(forms))

    useEffect(() => {
        if (user) {
            // Check user role
            const userRole = user.role?.name || user.roleName

            if (userRole === 'SuperAdmin') {
                // SuperAdmin sees all forms across all departments - no filters
                console.log('User is SuperAdmin - fetching all forms without filters')
                fetchForms()
            } else if (userRole === 'DepartmentAdmin') {
                // DepartmentAdmin sees all forms in their department - API will filter automatically
                console.log('User is DepartmentAdmin - fetching department forms (API will filter)')
                fetchForms()
            } else {
                // Other users see only their forms
                console.log('Regular user - filtering by createdBy')
                fetchForms({ createdBy: user.id })
            }
        } else {
            // If no user, try to fetch all forms (this might fail if API requires auth)
            fetchForms()
        }
    }, [user, fetchForms])

    // Helper function to get fetch params based on user role
    const getFetchParams = () => {
        if (!user) return {}

        const userRole = user.role?.name || user.roleName

        if (userRole === 'SuperAdmin' || userRole === 'DepartmentAdmin') {
            // SuperAdmin and DepartmentAdmin - no client-side filtering (API handles it)
            return {}
        }

        // Other users see only their own forms
        return { createdBy: user.id }
    }

    // Action handlers
    const handleDuplicateForm = async (formId: string, formTitle: string) => {
        setActionLoading(formId)
        try {
            const success = await duplicateForm(formId, `${formTitle} (Copy)`)
            if (success) {
                // Refresh the forms list
                fetchForms(getFetchParams())
            }
        } catch (error) {
            console.error('Failed to duplicate form:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleStatus = async (formId: string, isCurrentlyPublished: boolean) => {
        setActionLoading(formId)
        try {
            // toggleFormStatus now handles optimistic updates internally
            await toggleFormStatus(formId)
        } catch (error) {
            console.error('Failed to toggle form status:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteForm = async (formId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القالب؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return
        }

        setActionLoading(formId)
        try {
            const success = await deleteForm(formId)
            if (success) {
                // Refresh the forms list
                fetchForms(getFetchParams())
            }
        } catch (error) {
            console.error('Failed to delete form:', error)
        } finally {
            setActionLoading(null)
        }
    }



    // Fallback mock data if API is not available
    const mockForms = [
        {
            id: 'mock-1',
            name: 'استطلاع رأي رضا العملاء',
            title: 'استطلاع رأي رضا العملاء',
            description: 'قالب لجمع آراء العملاء حول الخدمات المقدمة',
            code: 'CUST_SURVEY',
            departmentId: 'HR',
            departmentName: 'قسم الموارد البشرية',
            organization: { id: 'org-1', name: 'قسم الموارد البشرية' },
            organizationId: 'org-1',
            isPublished: true,
            status: 'Active' as const,
            version: 1,
            content: {},
            createdAt: '2023-10-26T08:00:00Z',
            updatedAt: '2023-10-26T08:00:00Z'
        },
        {
            id: 'mock-2',
            name: 'قالب تسجيل حدث',
            title: 'قالب تسجيل حدث',
            description: 'قالب لتسجيل الأحداث والفعاليات',
            code: 'EVENT_REG',
            departmentId: 'Marketing',
            departmentName: 'قسم التسويق',
            organization: { id: 'org-2', name: 'قسم التسويق' },
            organizationId: 'org-2',
            isPublished: false,
            status: 'Draft' as const,
            version: 2,
            content: {},
            createdAt: '2023-10-24T08:00:00Z',
            updatedAt: '2023-10-25T10:30:00Z'
        }
    ]

    // Use mock data if forms is not an array (API error)
    const displayForms = Array.isArray(forms) ? forms : mockForms

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xl text-gray-700 font-medium" dir="rtl">جاري تحميل القوالب...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-red-600 mb-6" dir="rtl">خطأ: {error}</p>
                    <button
                        onClick={() => fetchForms(getFetchParams())}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700"
                        dir="rtl"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        )
    }
    return (
        <div>
            {!Array.isArray(forms) && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-lg font-medium" dir="rtl">
                        ⚠️ API غير متاح. يتم عرض بيانات تجريبية.
                    </p>
                </div>
            )}
            <div className="flex items-center justify-between mb-8 rtl:flex-row-reverse">
                <h1 className="text-4xl font-bold text-gray-900" dir="rtl">قوالب الوثائق</h1>
                <Link
                    href="/forms/new"
                    className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold rtl:flex-row-reverse"
                >
                    <PlusCircle size={24} />
                    <span>إنشاء قالب جديد</span>
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-gray-500" dir="rtl">
                        <thead className="text-lg text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">عنوان القالب</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">القسم</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">الكود</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">الإصدار</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">الحالة</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">تاريخ الإنشاء</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">آخر تحديث</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!displayForms || displayForms.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <p className="text-xl font-medium" dir="rtl">لا توجد قوالب بعد. ابدأ بإنشاء قالب جديد.</p>
                                    </td>
                                </tr>
                            ) : (
                                displayForms.map((form) => (
                                    <tr key={form.id} className="bg-white border-b hover:bg-gray-50">
                                        <th scope="row" className="px-6 py-6 font-semibold text-gray-900 text-right">
                                            <div className="flex flex-col items-start">
                                                <Link
                                                    href={`/forms/${form.id}`}
                                                    className="hover:text-blue-600 transition-colors font-semibold text-lg text-right"
                                                >
                                                    {form.title || form.name}
                                                </Link>
                                                {form.description && (
                                                    <p className="text-base text-gray-500 mt-2 truncate max-w-xs text-right">
                                                        {form.description}
                                                    </p>
                                                )}
                                            </div>
                                        </th>
                                        <td className="px-6 py-6 text-gray-900 text-base text-right">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="font-medium">
                                                    {form.departmentName || form.organization?.name || 'غير محدد'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-gray-600 font-mono text-base text-right">
                                            {form.code || form.id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-6 text-gray-600 text-base text-right">
                                            v{form.version || 1}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex justify-start">
                                                <span className={`px-3 py-2 rounded-full text-base font-semibold ${form.status === 'Active' || form.isPublished
                                                    ? 'bg-green-100 text-green-800'
                                                    : form.status === 'Inactive'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {form.status === 'Active' || (form.isPublished && !form.status)
                                                        ? 'نشط'
                                                        : form.status === 'Inactive'
                                                            ? 'غير نشط'
                                                            : 'مسودة'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-gray-600 text-base text-right">
                                            <TableDate date={form.createdAt} />
                                        </td>
                                        <td className="px-6 py-6 text-gray-600 text-base text-right">
                                            <TableDate date={form.updatedAt || form.createdAt} />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                                {actionLoading === form.id ? (
                                                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <Link
                                                            href={`/submissions/new/${form.id}`}
                                                            className="p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="أرشفة وثيقة جديدة"
                                                        >
                                                            <PlusCircle size={20} />
                                                        </Link>
                                                        <Link
                                                            href={`/responses?formId=${form.id}`}
                                                            className="p-3 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                                                            title="عرض السجلات المؤرشفة"
                                                        >
                                                            <BarChart3 size={20} />
                                                        </Link>
                                                        <Link
                                                            href={`/forms/${form.id}/edit`}
                                                            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                                            title="تحرير القالب"
                                                        >
                                                            <Edit size={20} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDuplicateForm(form.id, (form.title || form.name) ?? 'Untitled')}
                                                            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                                            title="نسخ القالب"
                                                        >
                                                            <Copy size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(form.id, form.status === 'Active' || form.isPublished)}
                                                            className={`p-3 rounded-lg transition-colors font-semibold ${form.status === 'Active' || form.isPublished
                                                                ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50 bg-orange-100'
                                                                : 'text-green-600 hover:text-green-800 hover:bg-green-50 bg-green-100'
                                                                }`}
                                                            title={form.status === 'Active' || form.isPublished ? 'تعطيل القالب' : 'تفعيل القالب'}
                                                        >
                                                            {form.status === 'Active' || form.isPublished ? <Pause size={20} /> : <Play size={20} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteForm(form.id)}
                                                            className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="حذف القالب"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    )
} 