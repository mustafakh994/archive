'use client'

import React from 'react'
import { FileText, Users, Building, Settings, PlusCircle, ClipboardList, LogOut, Inbox, FileSpreadsheet, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const { logout, user } = useAuthStore()

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    // Check if user is SuperAdmin
    const isSuperAdmin = user?.role?.name === 'SuperAdmin' || user?.roleName === 'SuperAdmin'

    // Base navigation items (visible to all authenticated users)
    const baseNavItems = [
        { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
        { label: 'قوالب الوثائق', href: '/forms', icon: FileText },
        { label: 'إنشاء قالب جديد', href: '/forms/new', icon: PlusCircle },
        { label: 'جميع الوثائق المؤرشفة', href: '/submissions', icon: Inbox },
        { label: 'البحث المتقدم', href: '/responses', icon: FileSpreadsheet },
    ]

    // SuperAdmin-only items
    const superAdminItems = [
        { label: 'إدارة المستخدمين', href: '/users', icon: Users },
        { href: '/directorates', label: 'المديريات', icon: Building },
    ]

    // Combine nav items based on role
    const navItems = isSuperAdmin
        ? [...baseNavItems, ...superAdminItems]
        : baseNavItems

    return (
        <aside className={`flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="h-16 flex-shrink-0 px-4 flex items-center justify-center border-b border-gray-200">
                <Link href="/forms">
                    <h1 className={`text-2xl font-bold text-gray-900 whitespace-nowrap ${isCollapsed ? 'hidden' : 'block'}`} dir="rtl">نظام الأرشفة المتقدم</h1>
                    <ClipboardList className={`h-10 w-10 text-blue-600 ${isCollapsed ? 'block' : 'hidden'}`} />
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className={`py-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    <div className="mb-6">
                        <Link href="/submissions/new" className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold" dir="rtl">
                            <PlusCircle size={24} />
                            <span className={isCollapsed ? 'sr-only' : ''}>أرشفة وثيقة جديدة</span>
                        </Link>
                    </div>
                    <ul className="space-y-2">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    title={isCollapsed ? item.label : undefined}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-semibold ${pathname.startsWith(item.href)
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                    dir="rtl"
                                >
                                    <item.icon size={24} />
                                    <span className={isCollapsed ? 'sr-only' : ''}>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            {/* Logout Button */}
            <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? 'تسجيل الخروج' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-semibold text-red-600 hover:bg-red-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    dir="rtl"
                >
                    <LogOut size={24} />
                    <span className={isCollapsed ? 'sr-only' : ''}>تسجيل الخروج</span>
                </button>
            </div>
        </aside>
    )
} 