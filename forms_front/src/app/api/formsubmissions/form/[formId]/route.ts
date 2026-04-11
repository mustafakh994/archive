import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simple token verification - extract user ID from Bearer token
function verifyToken(token: string): { userId: string } | null {
  if (token && token.startsWith('Bearer ')) {
    const actualToken = token.substring(7)
    if (actualToken.length > 0) {
      // For demo purposes, assume token format is valid
      // In production, this would be proper JWT verification
      return { userId: 'demo-user-id' }
    }
  }
  return null
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

    // Verify form exists
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        title: true,
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

    // Parse query parameters for enhanced filtering
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')))
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')
    const formVersion = searchParams.get('formVersion')
    const submitterEmail = searchParams.get('submitterEmail')

    // Build where clause with advanced filtering
    const where: any = { formId }
    
    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        try {
          where.createdAt.gte = new Date(startDate)
        } catch (error) {
          return NextResponse.json(
            { 
              success: false,
              message: 'Invalid start date format',
              data: null,
              errors: ['Invalid start date format. Use ISO 8601 format.']
            },
            { status: 400 }
          )
        }
      }
      if (endDate) {
        try {
          where.createdAt.lte = new Date(endDate)
        } catch (error) {
          return NextResponse.json(
            { 
              success: false,
              message: 'Invalid end date format',
              data: null,
              errors: ['Invalid end date format. Use ISO 8601 format.']
            },
            { status: 400 }
          )
        }
      }
    }

    // Search functionality - search in response data
    if (search) {
      where.data = {
        path: [],
        string_contains: search
      }
    }

    // Form version filtering
    if (formVersion) {
      where.data = {
        ...where.data,
        path: ['_formVersion'],
        equals: parseInt(formVersion)
      }
    }

    // Submitter email filtering
    if (submitterEmail) {
      where.data = {
        ...where.data,
        path: ['_submitterEmail'],
        string_contains: submitterEmail
      }
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'createdAt' || sortBy === 'submittedAt') {
      orderBy.createdAt = sortOrder
    } else {
      // For other fields, default to createdAt
      orderBy.createdAt = sortOrder
    }

    // Get total count for pagination
    const totalCount = await prisma.formResponse.count({ where })
    
    // Get submissions with enhanced filtering and sorting
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
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    
    // Transform submissions to match expected format with enhanced data
    const transformedSubmissions = submissions.map(submission => {
      const data = submission.data as any
      return {
        id: submission.id,
        formId: submission.formId,
        responseData: data,
        formVersion: data._formVersion || 1,
        submitterEmail: data._submitterEmail || null,
        submittedAt: submission.createdAt.toISOString(),
        submissionType: data._metadata?.submissionType || 'authenticated',
        clientIP: data._metadata?.clientIP || null,
        userAgent: data._metadata?.userAgent || null,
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
      message: 'Form submissions retrieved successfully',
      data: {
        items: transformedSubmissions,
        totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        filters: {
          formId,
          startDate,
          endDate,
          search,
          formVersion,
          submitterEmail,
          sortBy,
          sortOrder
        }
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error fetching form submissions:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid `prisma.formResponse.findMany()` invocation')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Invalid query parameters',
            data: null,
            errors: ['One or more query parameters are invalid']
          },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch form submissions',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}