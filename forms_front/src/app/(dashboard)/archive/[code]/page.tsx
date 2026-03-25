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
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-500 text-lg" dir="rtl">جاري تحميل نموذج الأرشفة...</p>
    </div>
  )
}