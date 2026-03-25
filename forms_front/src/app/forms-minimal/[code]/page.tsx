'use client'

import { useParams } from 'next/navigation'
import { useGuestForm } from '@/lib/hooks/useGuestForm'
import { useEffect } from 'react'

export default function MinimalFormsPage() {
  const params = useParams()
  const code = params.code as string
  const { form, isLoading, error, loadForm } = useGuestForm()

  useEffect(() => {
    if (code) {
      loadForm(code, true)
    }
  }, [code, loadForm])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Minimal Forms Page</h1>
        <p>Form Code: {code}</p>
        
        {isLoading && <p>Loading form...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {form && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-2">{form.title}</h2>
            <p className="text-gray-600">{form.description}</p>
            <p className="text-sm text-green-600 mt-4">✓ Form loaded successfully without authentication!</p>
          </div>
        )}
      </div>
    </div>
  )
}