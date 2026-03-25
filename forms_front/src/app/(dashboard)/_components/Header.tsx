'use client'

import React, { useState } from 'react'
import { Bell, UserCircle, ChevronsLeftRight, LogOut, Settings, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Header({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar: () => void, isSidebarCollapsed: boolean }) {
    const { user, logout } = useAuthStore()
    
    const router = useRouter()
    const [showUserMenu, setShowUserMenu] = useState(false)

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div>
                <button onClick={onToggleSidebar} className="text-gray-500 hover:text-gray-700" aria-label={isSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}>
                    <ChevronsLeftRight size={24} className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <div className="flex items-center gap-4">
                <button className="text-gray-500 hover:text-gray-700" aria-label="الإشعارات">
                    <Bell size={24} />
                </button>
                
                {/* User Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        <UserCircle size={28} className="text-gray-400" />
                        <div className="text-right">
                            <div className="text-lg font-semibold" dir="rtl">{user?.name || 'مستخدم'}</div>
                            <div className="text-sm text-gray-500" dir="rtl">{user?.roleName || 'دور'}</div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <div className="py-2">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <div className="text-base font-semibold text-gray-900" dir="rtl">{user?.name}</div>
                                    <div className="text-sm text-gray-500" dir="rtl">{user?.email}</div>
                                    <div className="text-sm text-gray-500" dir="rtl">{user?.department?.name}</div>
                                </div>
                              
                                <Link
                                    href="/settings/change-password"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <KeyRound size={20} className="text-gray-500" />
                                    <span className="text-base font-medium" dir="rtl">تغيير كلمة المرور</span>
                                </Link>

                                <Link
                                    href="/settings"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <Settings size={20} className="text-gray-500" />
                                    <span className="text-base font-medium" dir="rtl">الإعدادات</span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                >
                                    <LogOut size={20} />
                                    <span className="text-base font-medium" dir="rtl">تسجيل الخروج</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Click outside to close menu */}
            {showUserMenu && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                />
            )}
        </header>
    )
} 