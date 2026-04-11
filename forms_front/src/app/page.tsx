'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function Home() {
    const router = useRouter()
    const { isAuthenticated, isLoading } = useAuthStore()

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                // Redirect to forms page if authenticated
                router.push('/forms')
            } else {
                // Redirect to login if not authenticated
                router.push('/login')
            }
        }
    }, [isAuthenticated, isLoading, router])

    // Show loading while checking authentication
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl text-gray-700 font-medium" dir="rtl">جاري التحميل...</p>
            </div>
        </div>
    )
} 