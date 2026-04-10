'use client'

import React, { useState } from 'react'
import Sidebar from "./_components/Sidebar"
import Header from "./_components/Header"
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

    return (
        <AuthGuard requireAuth={true}>
            <div className="min-h-screen bg-slate-50/80 flex">
                <Sidebar isCollapsed={isSidebarCollapsed} />
                <div className="flex-1 flex flex-col">
                    <Header onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
                    <main className="flex-1 p-6 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
} 