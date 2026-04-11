'use client'

import { useState } from 'react'

export default function TestSimpleApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testApi = async (endpoint: string) => {
    setLoading(true)
    setResult(null)

    try {
      console.log('Testing endpoint:', endpoint)
      const response = await fetch(endpoint)
      const data = await response.json()
      
      console.log('Response:', { status: response.status, data })
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (err) {
      console.error('API test error:', err)
      setResult({
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Simple API Test</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={() => testApi('/api/forms')}
            disabled={loading}
            className="block w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test: GET /api/forms (List all forms)
          </button>

          <button
            onClick={() => testApi('/api/forms/code/FORM_76F495BF/preview')}
            disabled={loading}
            className="block w-full p-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Test: GET /api/forms/code/FORM_76F495BF/preview
          </button>

          <button
            onClick={() => testApi('/api/forms/FORM_76F495BF/preview')}
            disabled={loading}
            className="block w-full p-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Test: GET /api/forms/FORM_76F495BF/preview (as ID)
          </button>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p>Loading...</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 border rounded-lg">
            <h3 className="font-semibold mb-2">API Response:</h3>
            {result.error ? (
              <div className="text-red-600">
                <p><strong>Error:</strong> {result.error}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p><strong>Status:</strong> {result.status} {result.statusText}</p>
                <div>
                  <strong>Response Data:</strong>
                  <pre className="mt-2 p-3 bg-white border rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
                <details>
                  <summary className="cursor-pointer text-blue-600">Response Headers</summary>
                  <pre className="mt-2 p-3 bg-white border rounded text-sm">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">What to check:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Does /api/forms return a list of forms?</li>
            <li>What's the structure of the response?</li>
            <li>Are there any authentication errors?</li>
            <li>Does the preview endpoint work for existing forms?</li>
          </ul>
        </div>
      </div>
    </div>
  )
}