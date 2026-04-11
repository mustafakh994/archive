import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const {
      formId,
      selectedFields = [],
      includeMetadata = {},
      filters = {},
      format = 'xlsx'
    } = body

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

    // Build where clause for filtering
    const where: any = { formId }
    
    // Date filters
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }
    
    // Search filter
    if (filters.search) {
      where.data = {
        path: [],
        string_contains: filters.search
      }
    }

    // Get all responses without pagination (for export)
    const responses = await prisma.formResponse.findMany({
      where,
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

    // Get form schema for field labels
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        title: true,
        content: true
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

    // Extract field definitions from form content
    const formContent = form.content as any
    const formFields = formContent?.formSchema?.fields || 
                      formContent?.fields || 
                      []

    // Create a map of field IDs to field objects for quick lookup
    const fieldMap = new Map()
    formFields.forEach((field: any) => {
      fieldMap.set(field.id, field)
    })

    // Transform responses to include only selected fields
    const exportData = responses.map(response => {
      const responseData = response.data as any
      const row: any = {}
      
      // Add metadata if requested
      if (includeMetadata.email !== false) {
        row._email = responseData._submitterEmail || ''
      }
      if (includeMetadata.submittedAt !== false) {
        row._submittedAt = response.createdAt.toISOString()
      }
      if (includeMetadata.ip !== false) {
        row._ip = responseData._metadata?.clientIP || ''
      }
      if (includeMetadata.version !== false) {
        row._version = responseData._formVersion || 1
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
                  formattedValue = dateObj.toISOString()
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
                // Return URL directly
                formattedValue = typeof value === 'string' && value.startsWith('http') ? value : value
                break
              
              case 'location':
                if (typeof value === 'object' && value !== null) {
                  const { latitude, longitude } = value
                  formattedValue = `${latitude}, ${longitude}`
                }
                break
              
              case 'long_text':
                // Remove newlines for better CSV/Excel formatting
                formattedValue = typeof value === 'string' ? value.replace(/\n/g, ' ') : value
                break
              
              default:
                // Handle signatures
                if (typeof value === 'string' && fieldDef.properties?.label && 
                    (fieldDef.properties.label.toLowerCase().includes('signature') || 
                     fieldDef.properties.label.toLowerCase().includes('توقيع'))) {
                  formattedValue = value.length > 50 ? 'Signature submitted' : value
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
      
      return row
    })

    return NextResponse.json({
      success: true,
      message: 'Export data retrieved successfully',
      data: {
        formName: form.title,
        totalResponses: exportData.length,
        responses: exportData,
        fields: Array.from(fieldMap.values()).filter((f: any) => 
          selectedFields.length === 0 || selectedFields.includes(f.id)
        )
      },
      errors: []
    })
    
  } catch (error) {
    console.error('Error exporting form submissions:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to export form submissions',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}




