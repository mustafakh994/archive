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
            <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
                <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري تحميل بيانات المستخدم...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
                        <span className="text-2xl text-indigo-600">⚙️</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">الإعدادات</h1>
                        <p className="text-[15px] font-medium text-slate-500 mt-1">إدارة الملف الشخصي وإعدادات الحساب</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Profile Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
                    <div className="p-8">
                        <h2 className="text-[18px] font-black text-slate-900 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <User size={20} strokeWidth={2.5}/>
                            </div>
                            الملف الشخصي
                        </h2>
                        
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Mail size={18} className="text-slate-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-500 mb-1">البريد الإلكتروني</p>
                                    <p className="text-[15px] font-bold text-slate-900">{user.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <User size={18} className="text-slate-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-500 mb-1">الاسم</p>
                                    <p className="text-[15px] font-bold text-slate-900">{user.name}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Building2 size={18} className="text-slate-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-500 mb-1">المديرية</p>
                                    <p className="text-[15px] font-bold text-slate-900">{user.departmentName || user.department?.name || 'غير محدد'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Shield size={18} className="text-slate-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-500 mb-1">الدور</p>
                                    <p className="text-[15px] font-bold text-slate-900">{user.roleName || user.role?.name || 'غير محدد'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Calendar size={18} className="text-slate-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-500 mb-1">تاريخ الإنشاء</p>
                                    <p className="text-[15px] font-bold text-slate-900"><TableDate date={user.createdAt} /></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Permissions Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                        <h2 className="text-[18px] font-black text-slate-900 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Shield size={20} strokeWidth={2.5} />
                            </div>
                            الصلاحيات
                        </h2>
                        
                        {user.permissions && user.permissions.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {user.permissions.map((permission, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-[14px] font-bold text-slate-700">{permission.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                <p className="text-slate-500 text-[14px] font-bold">لا توجد صلاحيات إضافية محددة</p>
                            </div>
                        )}
                    </div>

                    {/* System Information */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                        <h2 className="text-[18px] font-black text-slate-900 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <span className="text-xl">ℹ️</span>
                            </div>
                            معلومات النظام
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                                <span className="text-[14px] font-bold text-slate-500">حالة الحساب</span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold ${
                                    user.isActive 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {user.isActive ? 'حساب نشط' : 'غير نشط'}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                                <span className="text-[14px] font-bold text-slate-500">آخر تحديث</span>
                                <span className="text-[14px] font-bold text-slate-900"><TableDate date={user.updatedAt} /></span>
                            </div>
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="bg-white rounded-3xl border border-rose-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500"></div>
                        <div className="p-8">
                            <h2 className="text-[18px] font-black text-slate-900 mb-4">إجراءات الحساب</h2>
                            <p className="text-slate-500 text-[14px] font-medium mb-6">يمكنك تسجيل الخروج من جلستك الحالية باستخدام الزر أدناه.</p>
                            
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all group"
                            >
                                <LogOut size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
                                تسجيل الخروج بالكامل
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 