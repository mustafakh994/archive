'use client'

import React, { useState } from 'react'
import Sidebar from '../(dashboard)/_components/Sidebar'
import Header from '../(dashboard)/_components/Header'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardRouteLayout({
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
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <div className="flex-1 flex flex-col">
          <Header onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
