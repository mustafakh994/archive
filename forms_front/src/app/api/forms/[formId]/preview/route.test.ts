import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    form: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('/api/forms/[formId]/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return form preview data for published form', async () => {
    const mockForm = {
      id: 'test-form-id',
      title: 'Test Form',
      description: 'Test Description',
      content: { fields: [] },
      isPublished: true,
      shareUrl: 'test-share-url',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

      ; (prisma.form.findUnique as any).mockResolvedValue(mockForm)

    const request = new NextRequest('http://localhost:3000/api/forms/test-form-id/preview')
    const params = Promise.resolve({ formId: 'test-form-id' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('test-form-id')
    expect(data.data.title).toBe('Test Form')
    expect(data.data.isPublished).toBe(true)
  })

  it('should return 404 for non-existent form', async () => {
    ; (prisma.form.findUnique as any).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/forms/non-existent/preview')
    const params = Promise.resolve({ formId: 'non-existent' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Form not found')
  })

  it('should return 403 for unpublished form', async () => {
    const mockForm = {
      id: 'test-form-id',
      title: 'Test Form',
      description: 'Test Description',
      content: { fields: [] },
      isPublished: false,
      shareUrl: 'test-share-url',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

      ; (prisma.form.findUnique as any).mockResolvedValue(mockForm)

    const request = new NextRequest('http://localhost:3000/api/forms/test-form-id/preview')
    const params = Promise.resolve({ formId: 'test-form-id' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Form is not available for preview')
  })

  it('should handle database errors', async () => {
    ; (prisma.form.findUnique as any).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/forms/test-form-id/preview')
    const params = Promise.resolve({ formId: 'test-form-id' })

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch form preview')
  })
})