'use client'

export default function TestGuestRoute() {
  const testCode = 'FORM_76F495BF'
  const testUrl = `/guest/${testCode}`

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Test Guest Route</h1>
        <p>This page should be accessible without login</p>
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Test Links:</h2>
          <div className="space-y-2">
            <div>
              <a 
                href={testUrl}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Test Guest Form: {testUrl}
              </a>
            </div>
            <div>
              <a 
                href="/guest/test-form-123"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Test with fake code: /guest/test-form-123
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click the test links above</li>
            <li>They should open without requiring login</li>
            <li>If they redirect to login, there's still an authentication issue</li>
          </ol>
        </div>
      </div>
    </div>
  )
}