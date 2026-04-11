'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'

export default function TestFormsListPage() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await apiClient.getForms()
        console.log('Forms API response:', response)
        
        if (response.success && response.data) {
          // Check if response.data is an array
          if (Array.isArray(response.data)) {
            setForms(response.data)
          } else if (response.data && typeof response.data === 'object' && 'items' in response.data && Array.isArray(response.data.items)) {
            // Paginated response format
            setForms(response.data.items as any)
          } else {
            console.error('Unexpected response structure:', response.data)
            setError('Unexpected response format from API')
          }
        } else {
          setError(response.message || 'Failed to fetch forms')
        }
      } catch (err) {
        console.error('Error fetching forms:', err)
        setError(err instanceof Error ? err.message : 'Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchForms()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4">Loading Forms...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Available Forms</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p><strong>Forms type:</strong> {typeof forms}</p>
          <p><strong>Is array:</strong> {Array.isArray(forms) ? 'Yes' : 'No'}</p>
          <p><strong>Forms length:</strong> {Array.isArray(forms) ? forms.length : 'N/A'}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-blue-600">Raw forms data</summary>
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
              {JSON.stringify(forms, null, 2)}
            </pre>
          </details>
        </div>

        {!Array.isArray(forms) ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Forms data is not an array. Check the API response structure above.</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No forms found. You may need to create a form first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <div key={form.id} className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{form.title}</h3>
                    <p className="text-gray-600 text-sm">{form.description}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>ID:</strong> {form.id}</p>
                      <p><strong>Code:</strong> {form.code || 'No code'}</p>
                      <p><strong>Published:</strong> {form.isPublished ? 'Yes' : 'No'}</p>
                      <p><strong>Status:</strong> {form.status || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {form.code && (
                      <div>
                        <p className="text-sm font-medium">Guest URL:</p>
                        <a 
                          href={`/guest/${form.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          /guest/{form.code}
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">API Test:</p>
                      <button
                        onClick={() => window.open(`/test-api?formCode=${form.code || form.id}`, '_blank')}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Test API for this form
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>If no forms are shown, create a form first in the dashboard</li>
            <li>Make sure the form is published (isPublished = true)</li>
            <li>Use the form's code to test the guest URL</li>
            <li>Click the guest URL links above to test them</li>
          </ol>
        </div>
      </div>
    </div>
  )
}