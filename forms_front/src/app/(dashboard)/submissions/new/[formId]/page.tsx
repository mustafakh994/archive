'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import GuestFormViewer from '@/components/forms/GuestFormViewer'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function DocumentArchiveSubmissionPage() {
  const params = useParams()
  const formId = params.formId as string
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmissionSuccess = (submission: any) => {
    console.log('Document archived successfully:', submission)
    // Redirect back to dashboard or show success message then redirect
    setTimeout(() => {
      router.push('/submissions')
    }, 1500)
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900" dir="rtl">أرشفة وثيقة جديدة</h1>
                <p className="text-sm text-gray-500" dir="rtl">
                    يرجى تعبئة الحقول وإرفاق الملفات المطلوبة للأرشفة.
                </p>
            </div>
            <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                رجوع
            </button>
        </div>

        <GuestFormViewer 
          formId={formId}
          onSubmissionSuccess={handleSubmissionSuccess}
        />
      </div>
    </div>
  )
}
