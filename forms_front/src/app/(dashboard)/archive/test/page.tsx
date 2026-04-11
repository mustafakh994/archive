'use client'

export default function GuestTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Guest Test Page</h1>
        <p>If you can see this page, the /guest route is working!</p>
        
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
            <h2 className="font-semibold text-green-800">✅ Route Working</h2>
            <p className="text-green-700">The /guest route structure is functioning correctly.</p>
          </div>
          
          <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
            <h2 className="font-semibold text-blue-800">Next Steps</h2>
            <p className="text-blue-700">Try accessing: <code>/guest/FORM_76F495BF</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}