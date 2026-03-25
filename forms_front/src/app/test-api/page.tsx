'use client'

import { useState } from 'react'

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testFormCode, setTestFormCode] = useState('FORM_76F495BF')

  const testApiCall = async (endpoint: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(endpoint)
      const data = await response.json()
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">API Test Page</h1>
        <p className="mb-6">This page tests API endpoints without authentication</p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Form Code to Test:</label>
          <input
            type="text"
            value={testFormCode}
            onChange={(e) => setTestFormCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter form code (e.g., FORM_76F495BF)"
          />
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => testApiCall(`/api/forms/code/${testFormCode}/preview`)}
            disabled={loading}
            className="block w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test: GET /api/forms/code/{testFormCode}/preview
          </button>

          <button
            onClick={() => testApiCall(`/api/forms/${testFormCode}/preview`)}
            disabled={loading}
            className="block w-full p-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Test: GET /api/forms/{testFormCode}/preview (treating as formId)
          </button>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p>Loading...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 border rounded-lg">
            <h3 className="font-semibold mb-2">API Response:</h3>
            <div className="space-y-2">
              <p><strong>Status:</strong> {result.status} {result.statusText}</p>
              <div>
                <strong>Data:</strong>
                <pre className="mt-2 p-3 bg-white border rounded text-sm overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">Test URLs:</h3>
          <div className="space-y-1 text-sm">
            <p><strong>New Guest Route:</strong> <a href={`/guest/${testFormCode}`} className="text-blue-600 hover:underline" target="_blank">/guest/{testFormCode}</a></p>
            <p><strong>Old Forms Route:</strong> <a href={`/forms/${testFormCode}`} className="text-blue-600 hover:underline" target="_blank">/forms/{testFormCode}</a></p>
            <p><strong>Test Route:</strong> <a href="/test-guest-route" className="text-blue-600 hover:underline" target="_blank">/test-guest-route</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}