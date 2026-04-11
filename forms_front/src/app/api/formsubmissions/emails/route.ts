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
    
    // Get query parameters
    const search = searchParams.get('search')
    const pageSize = parseInt(searchParams.get('pageSize') || '100')

    // Verify authentication
    const auth = verifyToken(authHeader)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Build where clause for filtering
    const where: any = {}
    
    if (search) {
      // Since submitterEmail is stored in the data JSON field, we need to search differently
      where.data = {
        path: ['_submitterEmail'],
        string_contains: search
      }
    }

    // Fetch unique emails from form responses
    const responses = await prisma.formResponse.findMany({
      where,
      select: {
        data: true
      },
      take: pageSize * 10, // Get more to account for duplicates
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Extract unique emails from the data field
    const emails = new Set<string>()
    responses.forEach(response => {
      const data = response.data as any
      if (data && data._submitterEmail && typeof data._submitterEmail === 'string') {
        emails.add(data._submitterEmail)
      }
    })

    // Convert to array and apply search filter if needed
    let emailArray = Array.from(emails)
    
    if (search) {
      emailArray = emailArray.filter(email => 
        email.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sort and limit
    emailArray = emailArray.sort().slice(0, pageSize)

    return NextResponse.json({
      success: true,
      data: emailArray,
      message: 'Unique emails retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching submission emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submission emails' },
      { status: 500 }
    )
  }
}

