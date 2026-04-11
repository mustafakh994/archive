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
      <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري تهيئة مساحة الأرشفة...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 animate-in fade-in duration-500">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-indigo-600 to-blue-500"></div>
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3" dir="rtl">
                    <span className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">✍️</span>
                    إدخال بيانات الأرشفة
                </h1>
                <p className="text-[15px] font-medium text-slate-500 mt-2" dir="rtl">
                    يرجى تعبئة الحقول بعناية وإرفاق المستندات المطلوبة لإتمام دورة الأرشفة بنجاح.
                </p>
            </div>
            <button
                onClick={() => router.back()}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 bg-white shadow-sm rounded-xl text-[15px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all hover:shadow"
            >
                التبديل إلى قالب آخر
            </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-50 to-white/0 pointer-events-none z-0"></div>
            <div className="relative z-10 p-4 md:p-10">
                <GuestFormViewer 
                formId={formId}
                onSubmissionSuccess={handleSubmissionSuccess}
                />
            </div>
        </div>
      </div>
    </div>
  )
}
