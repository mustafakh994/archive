import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    form: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('/api/forms/code/[code]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return form preview data for published form by code', async () => {
    const mockForm = {
      id: 'test-form-id',
      title: 'Test Form',
      description: 'Test Description',
      content: { fields: [] },
      isPublished: true,
      shareUrl: 'test-code-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.form.findFirst as any).mockResolvedValue(mockForm)

    const request = new NextRequest('http://localhost:3000/api/forms/code/test-code/preview')
    const params = Promise.resolve({ code: 'test-code' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('test-form-id')
    expect(data.data.title).toBe('Test Form')
    expect(data.data.isPublished).toBe(true)
  })

  it('should return 404 for non-existent form code', async () => {
    ;(prisma.form.findFirst as any).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/forms/code/non-existent/preview')
    const params = Promise.resolve({ code: 'non-existent' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Form not found or not available')
  })

  it('should handle database errors', async () => {
    ;(prisma.form.findFirst as any).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/forms/code/test-code/preview')
    const params = Promise.resolve({ code: 'test-code' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch form preview')
  })
})