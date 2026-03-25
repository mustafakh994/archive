import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Forward the Authorization header from the incoming request
    const authHeader = request.headers.get('Authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

    // Fetch forms and find by code, since backend has no direct /forms/code/{code} endpoint
    const response = await fetch(
      `${baseUrl}/forms?pageSize=200`,
      { headers }
    )

    if (!response.ok) {
      const text = await response.text()
      let errorData: any = {}
      try { errorData = JSON.parse(text) } catch { /* empty body */ }
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || 'Form not found',
          data: null,
          errors: errorData.errors || ['النموذج غير موجود أو غير متاح']
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const forms = data?.data?.items || []
    const found = forms.find((f: any) => f.code === code || f.id === code)

    if (!found) {
      return NextResponse.json(
        {
          success: false,
          message: 'Form not found',
          data: null,
          errors: ['النموذج غير موجود']
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: found, message: 'OK' })
  } catch (error) {
    console.error('Error fetching form preview by code:', error)
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