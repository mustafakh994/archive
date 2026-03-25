import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params
    const responseData = await request.json()

    // Forward validation request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/formsubmissions/form/${formId}/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false,
          message: data.message || 'Validation failed',
          data: false,
          errors: data.errors || ['فشل في التحقق من صحة البيانات']
        },
        { status: response.status }
      )
    }

    // If validation passed
    if (data.success) {
      return NextResponse.json({
        success: true,
        message: 'Validation completed successfully',
        data: true,
        errors: []
      })
    } else {
      // If validation failed but request was successful
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        data: false,
        errors: data.errors || ['البيانات المدخلة غير صحيحة']
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error validating form data:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to validate form data',
        data: false,
        errors: ['حدث خطأ أثناء التحقق من البيانات']
      },
      { status: 500 }
    )
  }
}