'use client'

export default function TestGuestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Test Guest Page</h1>
        <p>This page should be accessible without login.</p>
        <p>If you can see this, the routing works.</p>
      </div>
    </div>
  )
}