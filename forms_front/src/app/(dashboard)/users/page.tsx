'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, MoreHorizontal, Users, Edit, Eye, Trash2, UserCheck, UserX, Briefcase, ClipboardList, ChevronRight, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store/useUserStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import { TableDate } from '@/components/ui/DateDisplay'
import { isArchivistUser, isDepartmentAdminUser, isSuperAdminUser } from '@/lib/role-utils'
import type { User } from '@/lib/api/client'


export default function UserManagementPage() {
    const router = useRouter()
    const { users, userListPagination, isLoading, error, fetchUsers, updateUser } = useUserStore()
    const { user: currentUser } = useAuthStore()
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    
    const successToast = useSuccessToast()
    const errorToast = useErrorToast()
    
    const isSuperAdmin = isSuperAdminUser(currentUser)
    const isDepartmentAdmin = isDepartmentAdminUser(currentUser)
    const isAuthorized = isSuperAdmin || isDepartmentAdmin

    useEffect(() => {
        if (currentUser && !isAuthorized) {
            errorToast('غير مصرح', 'إدارة المستخدمين متاحة لمدير النظام أو مدير القسم')
            router.push('/dashboard')
            return
        }

        if (!currentUser || !isAuthorized) {
            return
        }

        if (isSuperAdmin) {
            void fetchUsers({ page, pageSize })
        } else if (isDepartmentAdmin && currentUser.departmentId) {
            void fetchUsers({ departmentId: currentUser.departmentId, page, pageSize })
        }
    }, [currentUser, fetchUsers, isAuthorized, isSuperAdmin, isDepartmentAdmin, router, page, pageSize])

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActionMenuOpen(null)
        }

        if (actionMenuOpen) {
            document.addEventListener('click', handleClickOutside)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [actionMenuOpen])

    // Fallback mock data if API is not available
    const mockUsers = [
        { 
            id: 'mock-1', 
            name: 'أحمد محمد', 
            email: 'ahmed.mohamed@company.com',
            departmentId: 'HR',
            roleId: 'admin',
            isActive: true,
            createdAt: '2023-10-26T08:00:00Z',
            department: { id: 'HR', name: 'الموارد البشرية', code: 'HR' },
            role: { id: 'admin', name: 'مدير' }
        },
        { 
            id: 'mock-2', 
            name: 'فاطمة علي', 
            email: 'fatima.ali@company.com',
            departmentId: 'IT',
            roleId: 'user',
            isActive: true,
            createdAt: '2023-10-24T08:00:00Z',
            department: { id: 'IT', name: 'تقنية المعلومات', code: 'IT' },
            role: { id: 'user', name: 'مستخدم' }
        }
    ]

    // Use mock data if users is not an array (API error)
    const displayUsers = Array.isArray(users) ? users : mockUsers

    const p = userListPagination
    const rangeStart = p && p.totalItems > 0 ? (p.page - 1) * p.pageSize + 1 : 0
    const rangeEnd = p && p.totalItems > 0 ? Math.min(p.page * p.pageSize, p.totalItems) : 0

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPageSize(Number(e.target.value))
        setPage(1)
    }

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const success = await updateUser(userId, { isActive: !currentStatus })
            if (success) {
                successToast(
                    'تم تحديث الحالة!', 
                    `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`
                )
                // No need to fetchUsers() - the store already updates the local state
            } else {
                errorToast('فشل في التحديث', 'حدث خطأ أثناء تحديث حالة المستخدم')
            }
        } catch (error) {
            console.error('Error toggling user status:', error)
            errorToast('خطأ في التحديث', 'حدث خطأ غير متوقع')
        }
        setActionMenuOpen(null)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xl text-gray-700 font-medium" dir="rtl">جاري تحميل المستخدمين...</p>
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
                        onClick={() => fetchUsers()}
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {!Array.isArray(users) && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 text-amber-800">
                        <div className="bg-amber-100 p-2 rounded-lg">⚠️</div>
                        <p className="text-lg font-bold" dir="rtl">API غير متاح. يتم عرض بيانات تجريبية.</p>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight" dir="rtl">إدارة المستخدمين</h1>
                    <p className="mt-2 text-[17px] text-slate-500 font-medium" dir="rtl">إضافة وتعديل صلاحيات النظام والمستخدمين المرتبطين.</p>
                </div>
                {isAuthorized && (
                    <Link 
                        href="/users/new"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 w-full md:w-auto"
                        dir="rtl"
                    >
                        <PlusCircle size={22} strokeWidth={2.5} />
                        <span>إضافة مستخدم جديد</span>
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 transition-all hover:shadow-md">
                <div
                    className="max-h-[min(70vh,720px)] overflow-auto overscroll-contain rounded-2xl [-webkit-overflow-scrolling:touch] custom-scrollbar"
                    role="region"
                    aria-label="جدول المستخدمين — قابل للتمرير"
                >
                    <table className="w-full min-w-[56rem] text-sm text-right text-slate-600">
                        <thead className="sticky top-0 z-20 bg-slate-50 text-[13px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 shadow-[0_1px_0_0_rgb(226_232_240)]">
                            <tr>
                                <th scope="col" className="px-6 py-5">الاسم</th>
                                <th scope="col" className="px-6 py-5">البريد الإلكتروني</th>
                                <th scope="col" className="px-6 py-5">المديرية</th>
                                <th scope="col" className="px-6 py-5">الدور</th>
                                <th scope="col" className="px-6 py-5">الحالة</th>
                                <th scope="col" className="px-6 py-5">تاريخ الإنشاء</th>
                                <th scope="col" className="px-6 py-5 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!displayUsers || displayUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Users className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
                                            <p className="text-[17px] font-bold text-slate-600" dir="rtl">لا توجد مستخدمين بعد. ابدأ بإضافة مستخدم جديد.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayUsers.map((row) => {
                                    const user = row as User
                                    return (
                                    <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <th scope="row" className="px-6 py-4.5 font-bold text-slate-900 whitespace-nowrap text-[15px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                                                    {user.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                {user.name}
                                            </div>
                                        </th>
                                        <td className="px-6 py-4.5 text-[14px] font-medium text-slate-500" dir="ltr text-right">{user.email}</td>
                                        <td className="px-6 py-4.5 text-[14px] font-bold text-slate-700">
                                            {user.department?.name ?? user.departmentName ? (
                                                <span className="inline-flex items-center gap-1.5 break-words">
                                                    <Briefcase size={14} className="text-indigo-500" />
                                                    {user.department?.name ?? user.departmentName}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">غير محدد</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-700 border border-slate-200">
                                                {user.role?.name ?? user.roleName ?? 'غير محدد'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4.5">
                                            <span className={`inline-flex px-3 py-1.5 rounded-full text-[13px] font-bold ring-1 ring-inset ${
                                                user.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                                            }`}>
                                                {user.isActive ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4.5 text-[14px] font-semibold text-slate-600">
                                            <TableDate date={user.createdAt} />
                                        </td>
                                        <td className="px-6 py-4.5 text-center relative">
                                            <button 
                                                onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                                className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors ring-1 ring-transparent hover:ring-indigo-100" 
                                                aria-label="خيارات إضافية"
                                            >
                                                <MoreHorizontal size={20} strokeWidth={2.5} />
                                            </button>
                                            
                                            {/* Action Menu */}
                                            {actionMenuOpen === user.id && (
                                                <div className="absolute left-6 top-full mt-1 w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 ring-1 ring-slate-200/20 z-50 overflow-hidden transform opacity-100 scale-100 origin-top-left transition-all">
                                                    <div className="py-1">
                                                        <Link
                                                            href={`/users/${user.id}`}
                                                            className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                                            onClick={() => setActionMenuOpen(null)}
                                                        >
                                                            <Eye size={16} strokeWidth={2.5} />
                                                            عرض التفاصيل
                                                        </Link>
                                                        
                                                        {isAuthorized && (
                                                            <Link
                                                                href={`/users/${user.id}`}
                                                                className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                                                onClick={() => setActionMenuOpen(null)}
                                                            >
                                                                <Edit size={16} strokeWidth={2.5} />
                                                                تعديل
                                                            </Link>
                                                        )}
                                                        
                                                        {isAuthorized && (
                                                            <button
                                                                onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                                                className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-bold transition-colors ${
                                                                    user.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                                                                }`}
                                                            >
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserX size={16} strokeWidth={2.5} />
                                                                        إلغاء التفعيل
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck size={16} strokeWidth={2.5} />
                                                                        تفعيل
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {isAuthorized && isArchivistUser(user as User) && (
                                                            <Link
                                                                href={`/users/${user.id}#archivist-templates`}
                                                                className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-t border-slate-100 mt-1 pt-2"
                                                                onClick={() => setActionMenuOpen(null)}
                                                            >
                                                                <ClipboardList size={16} strokeWidth={2.5} />
                                                                إسناد قوالب لمؤرشف
                                                            </Link>
                                                        )}

                                                        {isAuthorized && isSuperAdmin && (
                                                            <Link
                                                                href={`/users/${user.id}/assignments`}
                                                                className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-t border-slate-100 mt-1 pt-2"
                                                                onClick={() => setActionMenuOpen(null)}
                                                            >
                                                                <Briefcase size={16} strokeWidth={2.5} />
                                                                إدارة الإسنادات (أدوار)
                                                            </Link>
                                                        )}
                                                        
                                                        {isAuthorized && (
                                                            <button
                                                                onClick={() => {
                                                                    setActionMenuOpen(null)
                                                                }}
                                                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 mt-1 pt-2"
                                                            >
                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                                حذف نهائي
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>

                {Array.isArray(users) && p && p.totalItems > 0 && (
                    <div
                        className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        dir="rtl"
                    >
                        <p className="text-[13px] font-semibold text-slate-600">
                            عرض{' '}
                            <span className="font-black text-slate-900 tabular-nums">{rangeStart}</span>
                            –
                            <span className="font-black text-slate-900 tabular-nums">{rangeEnd}</span>
                            {' '}من{' '}
                            <span className="font-black text-slate-900 tabular-nums">{p.totalItems}</span>
                            {' '}مستخدم
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                                <span className="whitespace-nowrap">عدد الصفوف</span>
                                <select
                                    value={pageSize}
                                    onChange={handlePageSizeChange}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-bold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </label>
                            <span className="text-[13px] font-bold text-slate-500 tabular-nums">
                                صفحة {p.page} من {p.totalPages}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={!p.hasPreviousPage}
                                    onClick={() => setPage((x) => Math.max(1, x - 1))}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight size={16} strokeWidth={2.5} className="shrink-0" />
                                    السابق
                                </button>
                                <button
                                    type="button"
                                    disabled={!p.hasNextPage}
                                    onClick={() => setPage((x) => x + 1)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    التالي
                                    <ChevronLeft size={16} strokeWidth={2.5} className="shrink-0" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 