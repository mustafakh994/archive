import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma before importing the route
const mockForm = {
  findUnique: vi.fn(),
}

const mockFormResponse = {
  create: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    form: mockForm,
    formResponse: mockFormResponse,
  })),
}))

// Import after mocking
const { POST, GET } = await import('./route')

describe('/api/forms/[formId]/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should accept guest form submission when anonymous submissions are allowed', async () => {
      const mockFormData = {
        id: 'form-1',
        title: 'Test Form',
        content: {
          settings: {
            requireAuthentication: false,
            allowAnonymousSubmissions: true,
          },
        },
        isPublished: true,
        organizationId: 'org-1',
      }

      const mockFormResponseData = {
        id: 'response-1',
        formId: 'form-1',
        createdAt: new Date(),
        form: {
          title: 'Test Form',
        },
      }

      mockForm.findUnique.mockResolvedValue(mockFormData)
      mockFormResponse.create.mockResolvedValue(mockFormResponseData)

      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          responseData: { name: 'John Doe', email: 'john@example.com' },
          submitterEmail: 'john@example.com',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.formId).toBe('form-1')
      expect(mockFormResponse.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-1',
          data: {
            name: 'John Doe',
            email: 'john@example.com',
            _metadata: {
              submissionType: 'guest',
              clientIP: '192.168.1.1',
              submittedAt: expect.any(String),
              userAgent: 'unknown',
            },
            _submitterEmail: 'john@example.com',
          },
        },
        select: {
          id: true,
          formId: true,
          createdAt: true,
          form: {
            select: {
              title: true,
            },
          },
        },
      })
    })

    it('should accept guest submission without email when anonymous submissions are allowed', async () => {
      const mockFormData = {
        id: 'form-1',
        title: 'Test Form',
        content: {
          settings: {
            requireAuthentication: false,
            allowAnonymousSubmissions: true,
          },
        },
        isPublished: true,
        organizationId: 'org-1',
      }

      const mockFormResponseData = {
        id: 'response-1',
        formId: 'form-1',
        createdAt: new Date(),
        form: {
          title: 'Test Form',
        },
      }

      mockForm.findUnique.mockResolvedValue(mockFormData)
      mockFormResponse.create.mockResolvedValue(mockFormResponseData)

      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.1',
        },
        body: JSON.stringify({
          responseData: { name: 'Jane Doe' },
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockFormResponse.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-1',
          data: {
            name: 'Jane Doe',
            _metadata: expect.objectContaining({
              submissionType: 'guest',
              clientIP: '10.0.0.1',
            }),
          },
        },
        select: {
          id: true,
          formId: true,
          createdAt: true,
          form: {
            select: {
              title: true,
            },
          },
        },
      })
    })

    it('should reject guest submission when authentication is required', async () => {
      const mockFormData = {
        id: 'form-1',
        title: 'Test Form',
        content: {
          settings: {
            requireAuthentication: true,
            allowAnonymousSubmissions: false,
          },
        },
        isPublished: true,
        organizationId: 'org-1',
      }

      mockForm.findUnique.mockResolvedValue(mockFormData)

      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseData: { name: 'John Doe', email: 'john@example.com' },
          submitterEmail: 'john@example.com',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Authentication required for this form')
    })

    it('should accept authenticated user submission', async () => {
      const mockFormData = {
        id: 'form-1',
        title: 'Test Form',
        content: {
          settings: {
            requireAuthentication: true,
            allowAnonymousSubmissions: false,
          },
        },
        isPublished: true,
        organizationId: 'org-1',
      }

      const mockFormResponseData = {
        id: 'response-1',
        formId: 'form-1',
        createdAt: new Date(),
        form: {
          title: 'Test Form',
        },
      }

      mockForm.findUnique.mockResolvedValue(mockFormData)
      mockFormResponse.create.mockResolvedValue(mockFormResponseData)

      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          responseData: { name: 'John Doe', email: 'john@example.com' },
          submitterEmail: 'john@example.com',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.formId).toBe('form-1')
    })

    it('should apply rate limiting for guest submissions', async () => {
      const mockFormData = {
        id: 'form-1',
        title: 'Test Form',
        content: {
          settings: {
            requireAuthentication: false,
            allowAnonymousSubmissions: true,
          },
        },
        isPublished: true,
        organizationId: 'org-1',
      }

      mockForm.findUnique.mockResolvedValue(mockFormData)

      // Make multiple requests from the same IP to trigger rate limiting
      const makeRequest = () => new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.100',
        },
        body: JSON.stringify({
          responseData: { name: 'John Doe', email: 'john@example.com' },
          submitterEmail: 'john@example.com',
        }),
      })

      // Make 11 requests (rate limit is 10)
      for (let i = 0; i < 11; i++) {
        const request = makeRequest()
        const response = await POST(request, { params: Promise.resolve({ formId: 'form-1' }) })
        
        if (i < 10) {
          // First 10 should succeed (if form creation succeeds)
          expect(response.status).not.toBe(429)
        } else {
          // 11th request should be rate limited
          expect(response.status).toBe(429)
          const data = await response.json()
          expect(data.message).toBe('Rate limit exceeded. Please try again later.')
        }
      }
    })

    it('should return 404 for non-existent form', async () => {
      mockForm.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/forms/non-existent/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseData: { name: 'John Doe' },
          submitterEmail: 'john@example.com',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ formId: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Form not found')
    })
  })

  describe('GET', () => {
    it('should require authentication for getting submissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'GET',
      })

      const response = await GET(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Authorization token required')
    })

    it('should return submissions for authenticated user', async () => {
      const mockSubmissions = [
        {
          id: 'response-1',
          formId: 'form-1',
          data: { name: 'John Doe', _submitterEmail: 'john@example.com' },
          createdAt: new Date(),
          form: {
            title: 'Test Form',
            content: {},
          },
        },
      ]

      mockFormResponse.count.mockResolvedValue(1)
      mockFormResponse.findMany.mockResolvedValue(mockSubmissions)

      const request = new NextRequest('http://localhost:3000/api/forms/form-1/submissions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      const response = await GET(request, { params: Promise.resolve({ formId: 'form-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.items).toHaveLength(1)
      expect(data.data.totalCount).toBe(1)
    })
  })
})