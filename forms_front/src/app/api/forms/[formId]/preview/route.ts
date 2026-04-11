import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    // Forward the Authorization header from the incoming request
    const authHeader = request.headers.get('Authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

    // Call the dedicated /preview endpoint which bypasses department restrictions
    const response = await fetch(
      `${baseUrl}/forms/${formId}/preview`,
      { headers }
    )

    const text = await response.text()
    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false,
          message: data.message || 'Form not found or not accessible',
          data: null,
          errors: data.errors || ['النموذج غير موجود أو غير متاح']
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching form preview:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch form preview',
        data: null,
        errors: ['حدث خطأ أثناء تحميل النموذج']
      },
      { status: 500 }
    )
  }
}