'use client'

import { useParams } from 'next/navigation'

export default function TestDynamicPage() {
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Test Dynamic Route</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p><strong>Slug:</strong> {slug}</p>
          <p><strong>All Params:</strong> {JSON.stringify(params)}</p>
          <p><strong>URL:</strong> /testdynamic/{slug}</p>
        </div>
      </div>
    </div>
  )
}