'use client'

import React from 'react'
import { User, Mail, Building2, Shield, Calendar, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { TableDate } from '@/components/ui/DateDisplay'

export default function SettingsPage() {
    const { user, logout } = useAuthStore()
    const router = useRouter()

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Loading user information...</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">الإعدادات</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Profile Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User size={20} />
                        الملف الشخصي
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail size={16} className="text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                                <p className="text-gray-900">{user.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <User size={16} className="text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">الاسم</p>
                                <p className="text-gray-900">{user.name}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Building2 size={16} className="text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">المديرية</p>
                                <p className="text-gray-900">{user.departmentName || user.department?.name || 'غير محدد'}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">الدور</p>
                                <p className="text-gray-900">{user.roleName || user.role?.name || 'غير محدد'}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
                                <p className="text-gray-900"><TableDate date={user.createdAt} /></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield size={20} />
                        الصلاحيات
                    </h2>
                    
                    {user.permissions && user.permissions.length > 0 ? (
                        <div className="space-y-2">
                            {user.permissions.map((permission, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-gray-700">{permission.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">لا توجد صلاحيات محددة</p>
                    )}
                </div>

                {/* Account Actions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">إجراءات الحساب</h2>
                    
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                            <User size={16} />
                            تعديل الملف الشخصي
                        </button>
                        
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                            <Shield size={16} />
                            تغيير كلمة المرور
                        </button>
                        
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <LogOut size={16} />
                            تسجيل الخروج
                        </button>
                    </div>
                </div>

                {/* System Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات النظام</h2>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">حالة الحساب:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {user.isActive ? 'نشط' : 'غير نشط'}
                            </span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-500">آخر تحديث:</span>
                            <span className="text-gray-900"><TableDate date={user.updatedAt} /></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 