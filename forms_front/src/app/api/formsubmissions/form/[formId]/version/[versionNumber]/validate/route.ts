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

// Validation function for form data against schema
function validateFormData(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!schema || !schema.fields) {
    return { isValid: true, errors: [] }
  }
  
  // Validate each field in the schema
  for (const field of schema.fields) {
    const fieldValue = data[field.name]
    
    // Check required fields
    if (field.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
      errors.push(`Field '${field.label || field.name}' is required`)
      continue
    }
    
    // Skip validation if field is not provided and not required
    if (fieldValue === undefined || fieldValue === null) {
      continue
    }
    
    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof fieldValue === 'string' && !emailRegex.test(fieldValue)) {
          errors.push(`Field '${field.label || field.name}' must be a valid email address`)
        }
        break
        
      case 'number':
        if (isNaN(Number(fieldValue))) {
          errors.push(`Field '${field.label || field.name}' must be a valid number`)
        } else {
          const numValue = Number(fieldValue)
          if (field.min !== undefined && numValue < field.min) {
            errors.push(`Field '${field.label || field.name}' must be at least ${field.min}`)
          }
          if (field.max !== undefined && numValue > field.max) {
            errors.push(`Field '${field.label || field.name}' must be at most ${field.max}`)
          }
        }
        break
        
      case 'text':
      case 'textarea':
        if (typeof fieldValue !== 'string') {
          errors.push(`Field '${field.label || field.name}' must be a string`)
        } else {
          if (field.minLength && fieldValue.length < field.minLength) {
            errors.push(`Field '${field.label || field.name}' must be at least ${field.minLength} characters long`)
          }
          if (field.maxLength && fieldValue.length > field.maxLength) {
            errors.push(`Field '${field.label || field.name}' must be at most ${field.maxLength} characters long`)
          }
        }
        break
        
      case 'select':
      case 'radio':
        if (field.options && !field.options.some((opt: any) => opt.value === fieldValue)) {
          errors.push(`Field '${field.label || field.name}' must be one of the allowed options`)
        }
        break
        
      case 'checkbox':
        if (field.multiple) {
          if (!Array.isArray(fieldValue)) {
            errors.push(`Field '${field.label || field.name}' must be an array`)
          } else if (field.options) {
            const validValues = field.options.map((opt: any) => opt.value)
            const invalidValues = fieldValue.filter(val => !validValues.includes(val))
            if (invalidValues.length > 0) {
              errors.push(`Field '${field.label || field.name}' contains invalid options: ${invalidValues.join(', ')}`)
            }
          }
        } else {
          if (typeof fieldValue !== 'boolean') {
            errors.push(`Field '${field.label || field.name}' must be a boolean`)
          }
        }
        break
        
      case 'date':
        if (typeof fieldValue === 'string') {
          const dateValue = new Date(fieldValue)
          if (isNaN(dateValue.getTime())) {
            errors.push(`Field '${field.label || field.name}' must be a valid date`)
          }
        } else {
          errors.push(`Field '${field.label || field.name}' must be a valid date string`)
        }
        break
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; versionNumber: string }> }
) {
  try {
    const { formId, versionNumber } = await params
    
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

    // Validate version number
    const version = parseInt(versionNumber)
    if (isNaN(version) || version < 1) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid version number',
          data: null,
          errors: ['Version number must be a positive integer']
        },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { responseData } = body
    
    if (!responseData) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Response data is required for validation',
          data: null,
          errors: ['Response data is required']
        },
        { status: 400 }
      )
    }

    // Get form to verify it exists
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        title: true,
        content: true,
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

    // Get the specific schema version
    let targetSchema = null
    
    // First, try to find the specific version in schema versions table
    const schemaVersion = await prisma.formSchemaVersion.findUnique({
      where: { 
        formId_versionNumber: {
          formId,
          versionNumber: version
        }
      },
      select: { 
        schemaData: true
      }
    })
    
    if (schemaVersion) {
      targetSchema = schemaVersion.schemaData
    } else {
      // Fallback: if version 1 is requested and no schema versions exist, use form content
      if (version === 1) {
        const formContent = form.content as any
        if (formContent?.formSchema) {
          targetSchema = formContent.formSchema
        }
      }
    }

    if (!targetSchema) {
      return NextResponse.json(
        { 
          success: false,
          message: `Schema version ${version} not found for this form`,
          data: null,
          errors: [`Schema version ${version} does not exist for this form`]
        },
        { status: 404 }
      )
    }

    // Validate the response data against the specific schema version
    const validationResult = validateFormData(responseData, targetSchema)
    
    return NextResponse.json({
      success: true,
      message: validationResult.isValid ? 'Validation successful' : 'Validation failed',
      data: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        validatedAgainst: {
          formId,
          formTitle: form.title,
          schemaVersion: version,
          validatedAt: new Date().toISOString()
        },
        fieldCount: targetSchema.fields ? targetSchema.fields.length : 0,
        submittedFieldCount: Object.keys(responseData).length
      },
      errors: validationResult.isValid ? [] : validationResult.errors
    })
    
  } catch (error) {
    console.error('Error validating form submission against specific version:', error)
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid JSON in request body',
          data: null,
          errors: ['Request body must be valid JSON']
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to validate form submission',
        data: null,
        errors: ['Internal server error']
      },
      { status: 500 }
    )
  }
}