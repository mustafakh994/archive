'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusCircle, MoreHorizontal, Users, Edit, Eye, Trash2, UserCheck, UserX, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store/useUserStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import { TableDate } from '@/components/ui/DateDisplay'


export default function UserManagementPage() {
    const router = useRouter()
    const { users, isLoading, error, fetchUsers, updateUser } = useUserStore()
    const { user: currentUser } = useAuthStore()
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
    
    const successToast = useSuccessToast()
    const errorToast = useErrorToast()
    
    // Accept role names regardless of casing/style coming from the API.
    const normalizedRoleName = (currentUser?.role?.name || currentUser?.roleName || '').toLowerCase()
    const isSuperAdmin = normalizedRoleName === 'superadmin'
    const isAuthorized = isSuperAdmin

    // Debug logs
    console.log('Current User:', currentUser)
    console.log('Current User Role:', currentUser?.role)
    console.log('Current User Role Name:', currentUser?.role?.name)
    console.log('Is Super Admin:', isSuperAdmin)
    console.log('Users in component:', users, 'Type:', typeof users, 'Is Array:', Array.isArray(users))

    useEffect(() => {
        if (currentUser && !isAuthorized) {
            errorToast('غير مصرح', 'إدارة المستخدمين متاحة لمدير النظام فقط')
            router.push('/dashboard')
            return
        }

        if (currentUser) {
            const userRole = (currentUser.role?.name || currentUser.roleName || '').toLowerCase()
            
            if (userRole === 'superadmin') {
                // SuperAdmin sees all users across all departments
                console.log('User is SuperAdmin - fetching all users')
                fetchUsers()
            }
        }
    }, [currentUser, errorToast, fetchUsers, isAuthorized, router])

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
        <div>
            {!Array.isArray(users) && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-lg font-medium" dir="rtl">
                        ⚠️ API غير متاح. يتم عرض بيانات تجريبية.
                    </p>
                </div>
            )}
            
           

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold text-gray-900" dir="rtl">إدارة المستخدمين</h1>
                {isAuthorized && (
                    <Link 
                        href="/users/new"
                        className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
                        dir="rtl"
                    >
                        <PlusCircle size={24} />
                        <span>إضافة مستخدم جديد</span>
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-right text-gray-500">
                        <thead className="text-lg text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">الاسم</th>
                                <th scope="col" className="px-6 py-4 font-semibold">البريد الإلكتروني</th>
                                <th scope="col" className="px-6 py-4 font-semibold">المديرية</th>
                                <th scope="col" className="px-6 py-4 font-semibold">الدور</th>
                                <th scope="col" className="px-6 py-4 font-semibold">الحالة</th>
                                <th scope="col" className="px-6 py-4 font-semibold">تاريخ الإنشاء</th>
                                <th scope="col" className="px-6 py-4">
                                    <span className="sr-only">الإجراءات</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {!displayUsers || displayUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                                        <p className="text-xl font-medium" dir="rtl">لا توجد مستخدمين بعد. ابدأ بإضافة مستخدم جديد.</p>
                                    </td>
                                </tr>
                            ) : (
                                displayUsers.map((user) => (
                                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                        <th scope="row" className="px-6 py-6 font-semibold text-gray-900 whitespace-nowrap text-lg">
                                            {user.name}
                                        </th>
                                        <td className="px-6 py-6 text-gray-600 text-base">{user.email}</td>
                                        <td className="px-6 py-6 text-gray-600 text-base">
                                            {user.department?.name || 'غير محدد'}
                                        </td>
                                        <td className="px-6 py-6 text-gray-600 text-base">
                                            {user.role?.name || 'غير محدد'}
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className={`px-3 py-2 rounded-full text-base font-semibold ${
                                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {user.isActive ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-base">
                                            <TableDate date={user.createdAt} />
                                        </td>
                                        <td className="px-6 py-6 text-center relative">
                                            <button 
                                                onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                                className="text-gray-500 hover:text-gray-700" 
                                                aria-label="خيارات إضافية"
                                            >
                                                <MoreHorizontal size={24} />
                                            </button>
                                            
                                            {/* Action Menu */}
                                            {actionMenuOpen === user.id && (
                                                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                                    <div className="py-1">
                                                        {/* All authenticated users can view user details */}
                                                        <Link
                                                            href={`/users/${user.id}`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setActionMenuOpen(null)}
                                                        >
                                                            <Eye size={16} />
                                                            عرض التفاصيل
                                                        </Link>
                                                        
                                                        {/* SuperAdmin and DepartmentAdmin can edit users */}
                                                        {isAuthorized && (
                                                            <Link
                                                                href={`/users/${user.id}`}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                onClick={() => setActionMenuOpen(null)}
                                                            >
                                                                <Edit size={16} />
                                                                تعديل
                                                            </Link>
                                                        )}
                                                        
                                                        {/* SuperAdmin and DepartmentAdmin can toggle user status */}
                                                        {isAuthorized && (
                                                            <button
                                                                onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                {user.isActive ? (
                                                                    <>
                                                                        <UserX size={16} />
                                                                        إلغاء التفعيل
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck size={16} />
                                                                        تفعيل
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {isSuperAdmin && (
                                                            <Link
                                                                href={`/users/${user.id}/assignments`}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                onClick={() => setActionMenuOpen(null)}
                                                            >
                                                                <Briefcase size={16} />
                                                                إدارة الإسنادات
                                                            </Link>
                                                        )}
                                                        
                                                        {/* Only SuperAdmin can delete users */}
                                                        {isSuperAdmin && (
                                                            <button
                                                                onClick={() => {
                                                                    // TODO: Implement delete functionality
                                                                    setActionMenuOpen(null)
                                                                }}
                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 size={16} />
                                                                حذف
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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