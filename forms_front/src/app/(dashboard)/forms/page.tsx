'use client'

import React, { useEffect, useState } from 'react'
import { PlusCircle, MoreHorizontal, Copy, Edit, Trash2, Eye, Play, Pause, BarChart3, FileText, Building } from 'lucide-react'
import { useFormStore } from '@/lib/store/useFormStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import Link from 'next/link'
import { TableDate } from '@/components/ui/DateDisplay'
import { canAccessNewFormBuilder, isArchivistUser, isDepartmentAdminUser } from '@/lib/role-utils'

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
            const userRole = user.role?.name || user.roleName

            if (userRole === 'SuperAdmin') {
                fetchForms()
            } else if (isDepartmentAdminUser(user)) {
                fetchForms()
            } else if (isArchivistUser(user)) {
                // Backend lists assigned templates (+ created ones if CreateFormTemplate granted)
                fetchForms()
            } else {
                fetchForms({ createdBy: user.id })
            }
        } else {
            fetchForms()
        }
    }, [user, fetchForms])

    // Helper function to get fetch params based on user role
    const getFetchParams = () => {
        if (!user) return {}

        const userRole = user.role?.name || user.roleName

        if (userRole === 'SuperAdmin' || isDepartmentAdminUser(user) || isArchivistUser(user)) {
            return {}
        }

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
        <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
            {!Array.isArray(forms) && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 text-amber-800">
                        <div className="bg-amber-100 p-2 rounded-lg">⚠️</div>
                        <p className="text-lg font-bold" dir="rtl">API غير متاح. يتم عرض بيانات تجريبية.</p>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight" dir="rtl">قوالب الوثائق</h1>
                    <p className="mt-2 text-lg text-slate-500 font-medium">إدارة جميع قوالب الأرشفة وإنشاء قوالب جديدة.</p>
                </div>
                {user && canAccessNewFormBuilder(user) && (
                    <Link
                        href="/forms/new"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 w-full md:w-auto"
                    >
                        <PlusCircle size={22} strokeWidth={2.5} />
                        <span>إنشاء قالب جديد</span>
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-all hover:shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right text-sm text-slate-600" dir="rtl">
                        <thead className="bg-slate-50 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                                <th scope="col" className="px-6 py-5">عنوان القالب</th>
                                <th scope="col" className="px-6 py-5">القسم</th>
                                <th scope="col" className="px-6 py-5">الكود</th>
                                <th scope="col" className="px-6 py-5">الإصدار</th>
                                <th scope="col" className="px-6 py-5">الحالة</th>
                                <th scope="col" className="px-6 py-5">تاريخ الإنشاء</th>
                                <th scope="col" className="px-6 py-5">آخر تحديث</th>
                                <th scope="col" className="px-6 py-5 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!displayForms || displayForms.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <FileText className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                                            <p className="text-[17px] font-bold text-slate-600">لا توجد قوالب بعد. ابدأ بإنشاء قالب جديد.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayForms.map((form) => (
                                    <tr key={form.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <th scope="row" className="px-6 py-4.5 font-semibold text-slate-900">
                                            <div className="flex flex-col items-start gap-1">
                                                <Link
                                                    href={`/forms/${form.id}`}
                                                    className="hover:text-indigo-600 transition-colors font-bold text-[16px] text-right"
                                                >
                                                    {form.title || form.name}
                                                </Link>
                                                {form.description && (
                                                    <p className="text-[14px] text-slate-500 truncate max-w-[200px] text-right font-medium">
                                                        {form.description}
                                                    </p>
                                                )}
                                            </div>
                                        </th>
                                        <td className="px-6 py-4.5 text-[15px] font-bold text-slate-700">
                                            <div className="flex items-center gap-2.5">
                                                <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <Building size={16} strokeWidth={2.5} />
                                                </div>
                                                <span>
                                                    {form.departmentName || form.organization?.name || 'غير محدد'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-mono font-bold text-slate-700 border border-slate-200">
                                                {form.code || form.id.slice(0, 8)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2.5 py-1 text-[13px] font-bold text-slate-600 border border-slate-200 shadow-sm">
                                                v{form.version || 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <div className="flex justify-start">
                                                <span className={`px-3 py-1.5 rounded-full text-[13px] font-bold ring-1 ring-inset ${form.status === 'Active' || form.isPublished
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                    : form.status === 'Inactive'
                                                        ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                                                        : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                    }`}>
                                                    {form.status === 'Active' || (form.isPublished && !form.status)
                                                        ? 'نشط'
                                                        : form.status === 'Inactive'
                                                            ? 'غير نشط'
                                                            : 'مسودة'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4.5 text-[14px] font-semibold text-slate-600">
                                            <TableDate date={form.createdAt} />
                                        </td>
                                        <td className="px-6 py-4.5 text-[14px] font-semibold text-slate-600">
                                            <TableDate date={form.updatedAt || form.createdAt} />
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {actionLoading === form.id ? (
                                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <Link
                                                            href={`/submissions/new/${form.id}`}
                                                            className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors ring-1 ring-transparent hover:ring-indigo-100"
                                                            title="أرشفة وثيقة جديدة"
                                                        >
                                                            <PlusCircle size={18} strokeWidth={2.5} />
                                                        </Link>
                                                        <Link
                                                            href={`/responses?formId=${form.id}`}
                                                            className="p-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors ring-1 ring-transparent hover:ring-violet-100"
                                                            title="عرض السجلات المؤرشفة"
                                                        >
                                                            <BarChart3 size={18} strokeWidth={2.5} />
                                                        </Link>
                                                        <Link
                                                            href={`/forms/${form.id}/edit`}
                                                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ring-1 ring-transparent hover:ring-slate-200"
                                                            title="تحرير القالب"
                                                        >
                                                            <Edit size={18} strokeWidth={2.5} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDuplicateForm(form.id, (form.title || form.name) ?? 'Untitled')}
                                                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ring-1 ring-transparent hover:ring-slate-200"
                                                            title="نسخ القالب"
                                                        >
                                                            <Copy size={18} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(form.id, form.status === 'Active' || form.isPublished)}
                                                            className={`p-2 rounded-lg transition-colors ring-1 ring-transparent ${form.status === 'Active' || form.isPublished
                                                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50 hover:ring-amber-200'
                                                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 hover:ring-emerald-200'
                                                                }`}
                                                            title={form.status === 'Active' || form.isPublished ? 'تعطيل القالب' : 'تفعيل القالب'}
                                                        >
                                                            {form.status === 'Active' || form.isPublished ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteForm(form.id)}
                                                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ring-1 ring-transparent hover:ring-rose-200"
                                                            title="حذف القالب"
                                                        >
                                                            <Trash2 size={18} strokeWidth={2.5} />
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
        </div>
    )
} 