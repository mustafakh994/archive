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

    // Parse query parameters
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const hours = Math.max(1, parseInt(searchParams.get('hours') || '24')) // Default to last 24 hours
    const includeData = searchParams.get('includeData') === 'true'

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hours)

    // Build where clause
    const where = {
      formId,
      createdAt: {
        gte: cutoffDate
      }
    }

    // Get recent submissions
    const submissions = await prisma.formResponse.findMany({
      where,
      select: {
        id: true,
        formId: true,
        data: includeData,
        createdAt: true,
        form: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    
    // Transform submissions to match expected format
    const transformedSubmissions = submissions.map(submission => {
      const data = submission.data as any
      const baseSubmission = {
        id: submission.id,
        formId: submission.formId,
        formVersion: data?._formVersion || 1,
        submitterEmail: data?._submitterEmail || null,
        submittedAt: submission.createdAt.toISOString(),
        submissionType: data?._metadata?.submissionType || 'authenticated',
        clientIP: data?._metadata?.clientIP || null,
        form: {
          id: submission.formId,
          name: submission.form.title,
          title: submission.form.title
        }
      }

      // Include response data if requested
      if (includeData && data) {
        return {
          ...baseSubmission,
          responseData: data
        }
      }

      return baseSubmission
    })

    // Get total count for the time period
    const totalCount = await prisma.formResponse.count({ where })

    // Calculate some basic statistics
    const now = new Date()
    const submissionTimes = submissions.map(s => s.createdAt.getTime())
    const oldestSubmission = submissionTimes.length > 0 ? new Date(Math.min(...submissionTimes)) : null
    const newestSubmission = submissionTimes.length > 0 ? new Date(Math.max(...submissionTimes)) : null

    // Calculate submission rate (submissions per hour)
    const timeSpanHours = oldestSubmission && newestSubmission 
      ? Math.max(1, (newestSubmission.getTime() - oldestSubmission.getTime()) / (1000 * 60 * 60))
      : hours
    const submissionRate = totalCount > 0 ? Math.round((totalCount / timeSpanHours) * 100) / 100 : 0

    // Group submissions by hour for trend analysis
    const hourlyBreakdown: { [key: string]: number } = {}
    for (const submission of submissions) {
      const hour = new Date(submission.createdAt)
      hour.setMinutes(0, 0, 0) // Round to hour
      const hourKey = hour.toISOString()
      hourlyBreakdown[hourKey] = (hourlyBreakdown[hourKey] || 0) + 1
    }

    const analytics = {
      totalCount,
      returnedCount: transformedSubmissions.length,
      timeRange: {
        hours,
        from: cutoffDate.toISOString(),
        to: now.toISOString()
      },
      statistics: {
        submissionRate: `${submissionRate} submissions/hour`,
        oldestSubmission: oldestSubmission?.toISOString() || null,
        newestSubmission: newestSubmission?.toISOString() || null,
        averageInterval: totalCount > 1 
          ? `${Math.round((timeSpanHours * 60) / (totalCount - 1) * 100) / 100} minutes`
          : null
      },
      hourlyBreakdown: Object.entries(hourlyBreakdown)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
    }
    
    return NextResponse.json({
      success: true,
      message: `Recent submissions retrieved successfully (last ${hours} hours)`,
      data: {
        items: transformedSubmissions,
        analytics,
        parameters: {
          limit,
          hours,
          includeData,
          formId,
          formTitle: form.title
        }
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error fetching recent form submissions:', error)
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch recent form submissions',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}