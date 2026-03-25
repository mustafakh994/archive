import { NextRequest, NextResponse } from 'next/server'
import { getFileFromR2 } from '@/lib/cloudflare-r2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string; fieldId: string; filename: string }> }
) {
  try {
    const { submissionId, fieldId, filename } = await params
    
    console.log('Download request:', { submissionId, fieldId, filename })
    
    // Get file from R2
    const result = await getFileFromR2(submissionId, fieldId, filename)
    
    if (!result.exists) {
      return NextResponse.json(
        { 
          error: 'File not found',
          message: result.error || 'The requested file does not exist in cloud storage',
          submissionId,
          fieldId,
          filename
        },
        { status: 404 }
      )
    }
    
    // Redirect to the public R2 URL
    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { 
        error: 'Download failed',
        message: 'An error occurred while processing the download request'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
