import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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

    // Get query parameters for export configuration
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get('formId')
    const selectedFields = searchParams.get('selectedFields')?.split(',') || []
    const includeMetadata = JSON.parse(searchParams.get('includeMetadata') || '{}')
    const dateFormat = searchParams.get('dateFormat') || 'gregorian'
    const includeEmptyResponses = searchParams.get('includeEmptyResponses') === 'true'
    const fileName = searchParams.get('fileName') || 'export'

    if (!formId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Form ID is required',
          data: null,
          errors: ['formId is required']
        },
        { status: 400 }
      )
    }

    // Get form responses
    const responses = await prisma.formResponse.findMany({
      where: { formId },
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (responses.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'No responses found for this form',
          data: null,
          errors: ['No data to export']
        },
        { status: 404 }
      )
    }

    // Get form fields
    const form = responses[0].form
    const formContent = form.content as any
    const formFields = formContent?.formSchema?.fields || 
                      formContent?.fields || 
                      []

    // Create field map for quick lookup
    const fieldMap = new Map()
    formFields.forEach((field: any) => {
      fieldMap.set(field.id, field)
    })

    // Transform responses for Excel export
    const exportData = responses.map(response => {
      const responseData = response.data as any
      const row: any = {}
      
      // Add metadata
      if (includeMetadata.email !== false) {
        row['البريد الإلكتروني'] = responseData._submitterEmail || ''
      }
      if (includeMetadata.submittedAt !== false) {
        const date = new Date(response.createdAt)
        row['تاريخ الإرسال'] = dateFormat === 'iso' 
          ? response.createdAt.toISOString()
          : date.toLocaleDateString('ar-SY', { 
              year: 'numeric',
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
      }
      if (includeMetadata.ip !== false) {
        row['عنوان IP'] = responseData._metadata?.clientIP || ''
      }
      if (includeMetadata.version !== false) {
        row['إصدار النموذج'] = `v${responseData._formVersion || 1}`
      }
      
      // Add selected fields (or all fields if none specified)
      const fieldsToInclude = selectedFields.length > 0 ? selectedFields : formFields.map((f: any) => f.id)
      
      fieldsToInclude.forEach((fieldId: string) => {
        const fieldDef = fieldMap.get(fieldId)
        if (fieldDef) {
          const value = responseData[fieldId]
          
          // Format value based on field type
          let formattedValue = value
          
          if (value !== null && value !== undefined && value !== '') {
            switch (fieldDef.type) {
              case 'checkbox':
                formattedValue = value ? 'نعم' : 'لا'
                break
              
              case 'date':
                try {
                  const dateObj = new Date(value)
                  formattedValue = dateFormat === 'iso' ? dateObj.toISOString() : dateObj.toLocaleDateString('ar-SY')
                } catch {
                  formattedValue = value
                }
                break
              
              case 'dropdown':
              case 'radio_group':
                const option = fieldDef.properties?.options?.find(
                  (opt: any) => opt.value === value || opt.label === value
                )
                formattedValue = option?.label || value
                break
              
              case 'file_upload':
                formattedValue = typeof value === 'string' && value.startsWith('http') ? value : value
                break
              
              case 'location':
                if (typeof value === 'object' && value !== null) {
                  const { latitude, longitude } = value
                  formattedValue = `${latitude}, ${longitude}`
                }
                break
              
              case 'long_text':
                formattedValue = typeof value === 'string' ? value.replace(/\n/g, ' ') : value
                break
              
              case 'signature':
                formattedValue = 'Signature submitted'
                break
              
              default:
                // Handle signatures by label
                if (typeof value === 'string' && fieldDef.properties?.label && 
                    (fieldDef.properties.label.toLowerCase().includes('signature') || 
                     fieldDef.properties.label.toLowerCase().includes('توقيع'))) {
                  formattedValue = 'Signature submitted'
                } else if (typeof value === 'object') {
                  formattedValue = JSON.stringify(value)
                } else {
                  formattedValue = value
                }
            }
          }
          
          // Use field label as column name
          const columnName = fieldDef.properties?.label || fieldId
          row[columnName] = formattedValue
        }
      })
      
      // Check if we should include this row
      if (!includeEmptyResponses) {
        const hasData = Object.values(row).some(val => val !== '' && val !== null && val !== undefined)
        if (!hasData) return null
      }
      
      return row
    }).filter(row => row !== null)

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Set column widths
    if (!ws['!cols']) ws['!cols'] = []
    const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, "Responses")
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Error generating Excel file:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to generate Excel file',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}

