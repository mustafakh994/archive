'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'

export default function GuestFormPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()

  useEffect(() => {
    if (!code) return

    // Look up the form by its code from the forms list, then redirect to the proper archive page
    apiClient.getForms({ pageSize: 200 }).then((response) => {
      if (response.success && response.data) {
        const forms = response.data.items || []
        const found = forms.find((f: any) => f.code === code || f.id === code)
        if (found) {
          router.replace(`/submissions/new/${found.id}`)
        } else {
          // code not found, try using it as UUID directly
          router.replace(`/submissions/new/${code}`)
        }
      } else {
        // Fallback: treat the code as a UUID
        router.replace(`/submissions/new/${code}`)
      }
    }).catch(() => {
      router.replace(`/submissions/new/${code}`)
    })
  }, [code, router])

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] py-20 bg-slate-50/50 animate-in fade-in duration-500">
      <div className="w-16 h-16 border-4 border-slate-200/80 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
      <p className="text-slate-600 text-lg font-bold" dir="rtl">جاري تحويلك إلى نموذج الأرشفة...</p>
    </div>
  )
}