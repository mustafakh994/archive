'use client'

import React, { useState } from 'react'
import SubmissionViewer from '@/components/submissions/SubmissionViewer'

export default function TestSignatureDisplay() {
  const [testSubmission, setTestSubmission] = useState({
    id: 'test-123',
    formId: 'form-456',
    submitterEmail: 'test@example.com',
    submittedAt: new Date().toISOString(),
    formVersion: 1,
    responseData: {
      'التوقيع': 'wa+WtzaexEoAkWgCBSBISJQBr5S+Nt5ESgCRaAIFIGjIfBfAAAA//9cyFkOAAAABKIEQVQDAJ/3kvr91QxTAAAAAElFTkSuQmCC',
      'Signature': 'wa+WtzaexEoAkWgCBSBISJQBr5S+Nt5ESgCRaAIFIGjIfBfAAAA//9cyFkOAAAABKIEQVQDAJ/3kvr91QxTAAAAAElFTkSuQmCC',
      'Regular Field': 'This is just text',
      'Image URL': 'https://via.placeholder.com/150',
      'Base64 with prefix': 'data:image/png;base64,wa+WtzaexEoAkWgCBSBISJQBr5S+Nt5ESgCRaAIFIGjIfBfAAAA//9cyFkOAAAABKIEQVQDAJ/3kvr91QxTAAAAAElFTkSuQmCC'
    },
    form: {
      id: 'form-456',
      name: 'Test Form with Signatures',
      title: 'Test Form with Signatures'
    }
  })

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Signature Display Test</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(testSubmission.responseData, null, 2)}
          </pre>
        </div>

        <SubmissionViewer 
          submission={testSubmission}
          showExportOptions={true}
        />
      </div>
    </div>
  )
}
