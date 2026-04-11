import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple in-memory rate limiting store
// In production, use Redis or a proper rate limiting service
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 submissions per IP per 15 minutes

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  // Fallback for unknown IP
  return 'unknown'
}

// Check rate limit for IP
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rate_limit:${ip}`
  
  let entry = rateLimitStore.get(key)
  
  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key)
    entry = undefined
  }
  
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW
    }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  const allowed = entry.count <= RATE_LIMIT_MAX_REQUESTS
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  }
}

// Simple token verification - in a real implementation, this would verify JWT
// For now, we'll just check if a token is present and assume it's valid
function verifyToken(token: string): { userId: string } | null {
  // In a real implementation, this would verify the JWT token
  // For now, we'll extract a simple user ID from the token
  // This is a placeholder implementation
  if (token && token.startsWith('Bearer ')) {
    // Extract token without Bearer prefix
    const actualToken = token.substring(7)
    if (actualToken.length > 0) {
      // For demo purposes, assume token format is "user-{userId}"
      // In production, this would be proper JWT verification
      return { userId: 'demo-user-id' }
    }
  }
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const body = await request.json()
    const { responseData, formVersion, submitterEmail } = body
    
    // Get client IP for rate limiting
    const clientIP = getClientIP(request)
    
    // Get authorization token (optional)
    const authHeader = request.headers.get('authorization')
    
    // Verify user if token is provided
    let userId: string | null = null
    if (authHeader) {
      const tokenData = verifyToken(authHeader)
      userId = tokenData?.userId || null
    }
    
    // Get form details to check settings
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        title: true,
        content: true,
        isPublished: true,
        organizationId: true
      }
    })
    
    if (!form) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Form not found',
          data: null,
          errors: ['Form not found']
        },
        { status: 404 }
      )
    }
    
    // Extract form settings from content
    const formContent = form.content as any
    const settings = formContent?.settings || {}
    
    // Check if form status is Active
    // Only check status field - if it's 'Active', allow submissions
    const formStatus = formContent?.status
    const isFormActive = formStatus === 'Active'
    
    if (!isFormActive) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Form is not accepting submissions',
          data: null,
          errors: [
            formStatus === 'Inactive' 
              ? 'This form has been temporarily disabled and is not accepting new submissions.'
              : 'This form is in draft mode and cannot accept submissions.'
          ]
        },
        { status: 403 }
      )
    }
    
    // Check if form requires authentication
    const requireAuthentication = settings.requireAuthentication !== false // Default to true if not specified
    const allowAnonymousSubmissions = settings.allowAnonymousSubmissions === true
    
    // If form requires authentication and no valid user token
    if (requireAuthentication && !userId) {
      // Check if anonymous submissions are allowed as fallback
      if (!allowAnonymousSubmissions) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Authentication required for this form',
            data: null,
            errors: ['Authentication required']
          },
          { status: 401 }
        )
      }
    }
    
    // Apply rate limiting for guest submissions (when no authenticated user)
    if (!userId) {
      const rateLimit = checkRateLimit(clientIP)
      
      if (!rateLimit.allowed) {
        const resetDate = new Date(rateLimit.resetTime)
        return NextResponse.json(
          { 
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            data: null,
            errors: ['Rate limit exceeded']
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
            }
          }
        )
      }
    }
    
    // Validate required fields
    if (!responseData) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Response data is required',
          data: null,
          errors: ['Response data is required']
        },
        { status: 400 }
      )
    }
    
    // Create form response with IP address for guest submissions
    const submissionData: any = {
      formId,
      submitterIp: clientIP, // Add IP at root level
      data: {
        ...responseData,
        // Add metadata for guest submissions
        ...(!userId && {
          _metadata: {
            submissionType: 'guest',
            clientIP: clientIP,
            submittedAt: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })
      }
    }
    
    // Add submitter email if provided
    if (submitterEmail) {
      submissionData.data._submitterEmail = submitterEmail
    }
    
    // Add form version if provided
    if (formVersion) {
      submissionData.data._formVersion = formVersion
    }
    
    // Add user ID if authenticated
    if (userId) {
      submissionData.data._userId = userId
    }
    
    const formResponse = await prisma.formResponse.create({
      data: submissionData,
      select: {
        id: true,
        formId: true,
        createdAt: true,
        form: {
          select: {
            title: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        id: formResponse.id,
        formId: formResponse.formId,
        submittedAt: formResponse.createdAt,
        submissionId: formResponse.id,
        formTitle: formResponse.form.title,
        submitterIp: clientIP
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error submitting form:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Invalid form ID',
            data: null,
            errors: ['Invalid form ID']
          },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to submit form',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const { searchParams } = new URL(request.url)
    
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Authorization token required',
          data: null,
          errors: ['Authorization required']
        },
        { status: 401 }
      )
    }
    
    // Verify token
    const tokenData = verifyToken(authHeader)
    if (!tokenData) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid authorization token',
          data: null,
          errors: ['Invalid token']
        },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100) // Max 100 per page
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Build where clause
    const where: any = { formId }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }
    
    // Get total count
    const totalCount = await prisma.formResponse.count({ where })
    
    // Get submissions with pagination
    const submissions = await prisma.formResponse.findMany({
      where,
      select: {
        id: true,
        formId: true,
        data: true,
        createdAt: true,
        form: {
          select: {
            title: true,
            content: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    
    // Transform submissions to match expected format
    const transformedSubmissions = submissions.map(submission => {
      const data = submission.data as any
      return {
        id: submission.id,
        formId: submission.formId,
        responseData: data,
        formVersion: data._formVersion || 1,
        submitterEmail: data._submitterEmail || null,
        submitterIp: data._metadata?.clientIP || (submission as any).submitterIp || 'unknown',
        submittedAt: submission.createdAt.toISOString(),
        form: {
          id: submission.formId,
          name: submission.form.title,
          title: submission.form.title
        }
      }
    })
    
    const totalPages = Math.ceil(totalCount / pageSize)
    
    return NextResponse.json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: {
        items: transformedSubmissions,
        totalCount,
        page,
        pageSize,
        totalPages
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error fetching form submissions:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch submissions',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}