'use client'

import { useGuestForm } from '@/lib/hooks/useGuestForm'
import { useEffect } from 'react'

export default function TestFormHookPage() {
  const { form, isLoading, error, loadForm } = useGuestForm()

  useEffect(() => {
    loadForm('FORM_76F495BF', true)
  }, [loadForm])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Test Form Hook Page</h1>
        <p>Testing useGuestForm hook directly</p>
        
        {isLoading && <p>Loading form...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {form && (
          <div>
            <h2>Form loaded successfully!</h2>
            <p>Form title: {form.title}</p>
          </div>
        )}
      </div>
    </div>
  )
}