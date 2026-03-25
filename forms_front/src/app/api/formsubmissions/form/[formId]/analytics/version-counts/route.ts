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

    // Parse optional date range parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause for date filtering
    const where: any = { formId }
    
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

    // Get all submissions for the form within the date range
    const submissions = await prisma.formResponse.findMany({
      where,
      select: {
        id: true,
        data: true,
        createdAt: true
      }
    })

    // Analyze version distribution
    const versionCounts: { [key: string]: number } = {}
    const versionDetails: { [key: string]: { count: number; firstSubmission: string; lastSubmission: string } } = {}
    
    let totalSubmissions = 0
    let submissionsWithoutVersion = 0

    for (const submission of submissions) {
      totalSubmissions++
      const data = submission.data as any
      const version = data._formVersion || 1 // Default to version 1 if not specified
      const versionKey = `v${version}`
      
      if (!data._formVersion) {
        submissionsWithoutVersion++
      }
      
      // Count versions
      versionCounts[versionKey] = (versionCounts[versionKey] || 0) + 1
      
      // Track version details
      if (!versionDetails[versionKey]) {
        versionDetails[versionKey] = {
          count: 0,
          firstSubmission: submission.createdAt.toISOString(),
          lastSubmission: submission.createdAt.toISOString()
        }
      }
      
      versionDetails[versionKey].count++
      
      // Update first and last submission dates
      const submissionDate = submission.createdAt.toISOString()
      if (submissionDate < versionDetails[versionKey].firstSubmission) {
        versionDetails[versionKey].firstSubmission = submissionDate
      }
      if (submissionDate > versionDetails[versionKey].lastSubmission) {
        versionDetails[versionKey].lastSubmission = submissionDate
      }
    }

    // Convert to array format with percentages
    const versionAnalytics = Object.entries(versionCounts)
      .map(([version, count]) => ({
        version,
        versionNumber: parseInt(version.substring(1)),
        count,
        percentage: totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100 * 100) / 100 : 0,
        firstSubmission: versionDetails[version].firstSubmission,
        lastSubmission: versionDetails[version].lastSubmission
      }))
      .sort((a, b) => a.versionNumber - b.versionNumber)

    // Get available schema versions for comparison
    const schemaVersions = await prisma.formSchemaVersion.findMany({
      where: { formId },
      select: {
        versionNumber: true,
        createdAt: true
      },
      orderBy: { versionNumber: 'asc' }
    })

    // Calculate additional analytics
    const analytics = {
      totalSubmissions,
      submissionsWithoutVersion,
      uniqueVersions: Object.keys(versionCounts).length,
      mostUsedVersion: versionAnalytics.length > 0 
        ? versionAnalytics.reduce((prev, current) => prev.count > current.count ? prev : current)
        : null,
      leastUsedVersion: versionAnalytics.length > 0 
        ? versionAnalytics.reduce((prev, current) => prev.count < current.count ? prev : current)
        : null,
      versionDistribution: versionAnalytics,
      availableSchemaVersions: schemaVersions.map(sv => ({
        version: sv.versionNumber,
        createdAt: sv.createdAt.toISOString(),
        hasSubmissions: versionCounts[`v${sv.versionNumber}`] > 0
      })),
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
        filtered: !!(startDate || endDate)
      },
      generatedAt: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Version analytics retrieved successfully',
      data: analytics,
      errors: []
    })
    
  } catch (error) {
    console.error('Error fetching version analytics:', error)
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch version analytics',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}