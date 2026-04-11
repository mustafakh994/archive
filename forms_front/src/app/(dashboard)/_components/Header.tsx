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
        <header className="h-[72px] flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 flex items-center justify-between px-6 sm:px-8 shadow-sm">
            <div>
                <button 
                    onClick={onToggleSidebar} 
                    className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    aria-label={isSidebarCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
                >
                    <ChevronsLeftRight size={22} strokeWidth={2.5} className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 relative" aria-label="الإشعارات">
                    <Bell size={22} strokeWidth={2.5} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                </button>
                
                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                
                {/* User Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border border-transparent hover:border-slate-200"
                    >
                        <div className="bg-indigo-100 text-indigo-700 w-9 h-9 rounded-full flex items-center justify-center shadow-sm">
                            <UserCircle size={24} strokeWidth={2.5} />
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-800 leading-tight" dir="rtl">{user?.name || 'مستخدم'}</div>
                            <div className="text-xs font-semibold text-slate-500" dir="rtl">{user?.roleName || 'دور'}</div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute left-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="py-2">
                                <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50">
                                    <div className="text-[15px] font-bold text-slate-900" dir="rtl">{user?.name}</div>
                                    <div className="text-[13px] font-semibold text-slate-500 mt-0.5" dir="rtl">{user?.email}</div>
                                    <div className="text-xs font-bold text-indigo-600 mt-2 bg-indigo-50 inline-block px-2 py-1 rounded-md" dir="rtl">{user?.department?.name}</div>
                                </div>
                              
                                <Link
                                    href="/settings/change-password"
                                    className="flex items-center gap-3 px-5 py-3.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <KeyRound size={18} strokeWidth={2.5} className="text-slate-400 group-hover:text-indigo-500" />
                                    <span className="text-[14px] font-bold" dir="rtl">تغيير كلمة المرور</span>
                                </Link>

                                <Link
                                    href="/settings"
                                    className="flex items-center gap-3 px-5 py-3.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    <Settings size={18} strokeWidth={2.5} className="text-slate-400 group-hover:text-indigo-500" />
                                    <span className="text-[14px] font-bold" dir="rtl">الإعدادات</span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors border-t border-slate-100 mt-1"
                                >
                                    <LogOut size={18} strokeWidth={2.5} />
                                    <span className="text-[14px] font-bold" dir="rtl">تسجيل الخروج</span>
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