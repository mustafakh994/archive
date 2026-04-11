import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function verifyToken(authHeader: string | null): { userId: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    // For now, we'll use a simple verification
    // In production, you should use proper JWT verification
    const token = authHeader.substring(7)
    if (token) {
      // Mock user ID - replace with actual JWT verification
      return { userId: 'mock-user-id' }
    }
    return null
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    
    // Verify authentication
    const auth = verifyToken(authHeader)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Get query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')))
    const sortBy = searchParams.get('sortBy') || 'submittedAt'
    const sortDescending = searchParams.get('sortDescending') === 'true'
    const search = searchParams.get('search')
    const formId = searchParams.get('formId')
    const submitterEmail = searchParams.get('submitterEmail')
    const departmentId = searchParams.get('departmentId')

    // Build where clause
    const where: any = {}
    
    // Filter by form ID
    if (formId) {
      where.formId = formId
    }
    
    // Filter by submitter email (stored in data JSON field)
    if (submitterEmail) {
      where.data = {
        ...where.data,
        path: ['_submitterEmail'],
        string_contains: submitterEmail
      }
    }
    
    // Search functionality - search in response data
    if (search) {
      where.data = {
        ...where.data,
        path: [],
        string_contains: search
      }
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'submittedAt' || sortBy === 'createdAt') {
      orderBy.createdAt = sortDescending ? 'desc' : 'asc'
    } else {
      orderBy.createdAt = sortDescending ? 'desc' : 'asc'
    }

    // Get total count for pagination
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
      orderBy,
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
        submitterIp: data._metadata?.clientIP || 'unknown',
        submittedAt: submission.createdAt.toISOString(),
        formName: submission.form.title
      }
    })

    const totalPages = Math.ceil(totalCount / pageSize)
    
    return NextResponse.json({
      success: true,
      message: 'Form submissions retrieved successfully',
      data: {
        items: transformedSubmissions,
        totalItems: totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error fetching form submissions:', error)
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




