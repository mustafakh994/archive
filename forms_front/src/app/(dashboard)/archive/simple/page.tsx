'use client'

export default function GuestSimplePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Simple Guest Page</h1>
        <p>This is a static route test: /guest/simple</p>
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Debug Info:</h2>
          <ul className="space-y-2">
            <li>✅ Static route working</li>
            <li>🔄 Testing dynamic routes next</li>
            <li>📍 Current URL: /guest/simple</li>
          </ul>
        </div>
      </div>
    </div>
  )
}