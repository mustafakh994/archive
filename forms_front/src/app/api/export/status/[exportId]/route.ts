import { NextRequest, NextResponse } from 'next/server'

function verifyToken(authHeader: string | null): { userId: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    // Verify authentication
    const auth = verifyToken(authHeader)
    if (!auth) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid or missing authentication token',
          data: null,
          errors: ['Unauthorized']
        },
        { status: 401 }
      )
    }

    const { exportId } = await params

    if (!exportId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Export ID is required',
          data: null,
          errors: ['exportId is required']
        },
        { status: 400 }
      )
    }

    // Mock export status - in a real implementation, you would check the actual status
    const mockStatus = {
      exportId,
      status: 'Completed',
      progress: 100,
      downloadUrl: `/api/export/download/${exportId}`,
      fileSizeBytes: 2048576,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: mockStatus
    })
    
  } catch (error) {
    console.error('Error checking export status:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to check export status',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}

