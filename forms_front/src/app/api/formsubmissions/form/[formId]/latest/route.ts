import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const body = await request.json()
    const { responseData, submitterEmail } = body

    // Get client IP for tracking
    const getClientIP = (req: NextRequest): string => {
      const forwarded = req.headers.get('x-forwarded-for')
      const realIP = req.headers.get('x-real-ip')
      
      if (forwarded) {
        return forwarded.split(',')[0].trim()
      }
      
      if (realIP) {
        return realIP
      }
      
      return 'unknown'
    }

    const clientIP = getClientIP(request)

    // Forward request to backend API to use latest version
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/formsubmissions/form/${formId}/latest`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseData,
          submitterEmail,
          submitterIp: clientIP,
          userAgent: request.headers.get('user-agent') || 'unknown'
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false,
          message: data.message || 'Failed to submit form with latest version',
          data: null,
          errors: data.errors || ['فشل في إرسال النموذج بأحدث إصدار']
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Form submission created with latest version successfully',
      data: {
        ...data.data,
        submitterIp: clientIP,
        submittedAt: new Date().toISOString()
      },
      errors: []
    })

  } catch (error) {
    console.error('Error submitting form with latest version:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to submit form',
        data: null,
        errors: ['حدث خطأ أثناء إرسال النموذج']
      },
      { status: 500 }
    )
  }
}