'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'

export default function CreateTestFormPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const createTestForm = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = {
        title: 'Test Guest Form',
        name: 'Test Guest Form',
        code: 'TEST_GUEST_FORM',
        description: 'This is a test form for guest access',
        content: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: 'الاسم الكامل',
              maxLength: 100
            },
            email: {
              type: 'string',
              title: 'البريد الإلكتروني',
              format: 'email'
            },
            message: {
              type: 'string',
              title: 'الرسالة',
              maxLength: 500
            }
          },
          required: ['name', 'email']
        },
        formSchema: {
          fields: []
        },
        isPublished: true,
        settings: {
          submitButtonText: 'إرسال النموذج',
          successMessage: 'تم إرسال النموذج بنجاح!'
        }
      }

      const response = await apiClient.createForm(formData)
      
      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.message || 'Failed to create form')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Create Test Form</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">
            This will create a simple test form that you can use to test the guest form functionality.
          </p>
          
          <button
            onClick={createTestForm}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Form...' : 'Create Test Form'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-4">✅ Form Created Successfully!</h3>
            
            <div className="space-y-3">
              <div>
                <p className="font-medium">Form Details:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li><strong>ID:</strong> {result.id}</li>
                  <li><strong>Title:</strong> {result.title}</li>
                  <li><strong>Code:</strong> {result.code || 'No code assigned'}</li>
                  <li><strong>Published:</strong> {result.isPublished ? 'Yes' : 'No'}</li>
                </ul>
              </div>

              {result.code && (
                <div className="p-3 bg-white border rounded">
                  <p className="font-medium mb-2">Test URLs:</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Guest Form:</strong>
                      <br />
                      <a 
                        href={`/guest/${result.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {window.location.origin}/guest/{result.code}
                      </a>
                    </div>
                    <div>
                      <strong>Dashboard Form:</strong>
                      <br />
                      <a 
                        href={`/forms/${result.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {window.location.origin}/forms/{result.id}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Create the test form using the button above</li>
            <li>Copy the guest form URL from the success message</li>
            <li>Test the guest form URL - it should work without login</li>
            <li>Fill out and submit the form to test the complete flow</li>
          </ol>
        </div>
      </div>
    </div>
  )
}