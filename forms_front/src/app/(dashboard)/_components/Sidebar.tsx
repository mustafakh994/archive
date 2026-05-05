'use client'

import React from 'react'
import { FileText, Users, Building, Settings, PlusCircle, ClipboardList, LogOut, Inbox, FileSpreadsheet, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { canAccessNewFormBuilder, isDepartmentAdminUser, isSuperAdminUser } from '@/lib/role-utils'

export default function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const { logout, user } = useAuthStore()

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const isSuperAdmin = isSuperAdminUser(user)
    const showNewFormLink = canAccessNewFormBuilder(user)

    // Base navigation items (visible to all authenticated users)
    const baseNavItems = [
        { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
        { label: 'قوالب الوثائق', href: '/forms', icon: FileText },
        ...(showNewFormLink ? [{ label: 'إنشاء قالب جديد', href: '/forms/new', icon: PlusCircle }] as const : []),
        { label: 'جميع الوثائق المؤرشفة', href: '/submissions', icon: Inbox },
        { label: 'البحث المتقدم', href: '/responses', icon: FileSpreadsheet },
    ]

    // SuperAdmin: all directorates. DepartmentAdmin: users in their department only (same /users route).
    const adminNavItems = isSuperAdmin
        ? ([
            { label: 'إدارة المستخدمين', href: '/users', icon: Users },
            { href: '/directorates', label: 'المديريات', icon: Building },
          ] as const)
        : isDepartmentAdminUser(user)
            ? ([{ label: 'إدارة المستخدمين', href: '/users', icon: Users }] as const)
            : ([] as const)

    const navItems = [...baseNavItems, ...adminNavItems]

    return (
        <aside className={`flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-sm ${isCollapsed ? 'w-20' : 'w-72'}`}>
            <div className="h-20 flex-shrink-0 px-6 flex items-center justify-center border-b border-slate-100/60">
                <Link href="/forms" className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                        <ClipboardList className="h-7 w-7" strokeWidth={2.5} />
                    </div>
                    <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-indigo-700 to-slate-800 whitespace-nowrap tracking-tight ${isCollapsed ? 'hidden' : 'block'}`} dir="rtl">نظام الأرشفة المتقدم</h1>
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <nav className={`py-6 ${isCollapsed ? 'px-3' : 'px-5'}`}>
                    <div className="mb-8">
                        <Link href="/submissions/new" className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 text-base font-bold" dir="rtl">
                            <PlusCircle size={22} strokeWidth={2.5} />
                            <span className={isCollapsed ? 'sr-only' : ''}>أرشفة وثيقة جديدة</span>
                        </Link>
                    </div>
                    <ul className="space-y-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-200 ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                        dir="rtl"
                                    >
                                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
                                        <span className={isCollapsed ? 'sr-only' : ''}>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Logout Button */}
            <div className={`p-5 border-t border-slate-100 ${isCollapsed ? 'px-3' : 'px-5'}`}>
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? 'تسجيل الخروج' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 ring-1 ring-transparent hover:ring-rose-100 transition-all shadow-sm hover:shadow ${isCollapsed ? 'justify-center' : ''}`}
                    dir="rtl"
                >
                    <LogOut size={22} strokeWidth={2.5} />
                    <span className={isCollapsed ? 'sr-only' : ''}>تسجيل الخروج</span>
                </button>
            </div>
        </aside>
    )
} 