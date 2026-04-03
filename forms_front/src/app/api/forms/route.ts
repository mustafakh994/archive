import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { getJwtVerificationSecret } from '@/lib/server-jwt-secret'

// Simple token verification - extract user ID from Bearer token
function verifyToken(authHeader: string | null): { userId: string } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    
    const token = authHeader.substring(7)
    
    try {
        const secret = getJwtVerificationSecret()
        if (!secret) return null
        const decoded = jwt.verify(token, secret) as any
        return { userId: decoded.userId || decoded.id || decoded.sub }
    } catch (error) {
        console.error('Token verification failed:', error)
        return null
    }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')
    const createdBy = searchParams.get('createdBy')

    // Verify authentication and get user information
    const auth = verifyToken(authHeader)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Get user information to check role
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        roleAssignments: {
          include: {
            role: true,
            department: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's role name
    const userRole = user.roleAssignments?.[0]?.role?.name
    const userDepartmentId = user.roleAssignments?.[0]?.department?.id

    // Build where clause for filtering
    const where: any = {}
    
    // Apply department-based filtering based on role
    if (userRole === 'DepartmentAdmin' && userDepartmentId) {
      // DepartmentAdmin can only see forms from their department
      where.organizationId = userDepartmentId
    } else if (departmentId) {
      // SuperAdmin or explicit department filter
      where.organizationId = departmentId
    }
    // SuperAdmin without departmentId filter sees all forms
    
    if (status) {
      where.status = status
    }
    
    if (createdBy) {
      where.createdBy = createdBy
    }

    // Fetch forms with related data
    // Note: Form model doesn't have createdByUser, department, or status fields
    // It only has: id, title, description, isPublished, shareUrl, organizationId, content (JSON), createdAt, updatedAt
    const forms = await prisma.form.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            responses: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform forms to add additional fields from content JSON
    const transformedForms = forms.map(form => {
      const content = form.content as any
      return {
        ...form,
        // Extract additional fields from content if they exist
        code: content?.code || content?.settings?.formCode || form.shareUrl,
        version: content?.version || 1,
        status: content?.status || (form.isPublished ? 'Active' : 'Draft'),
        // Backward compatibility fields
        name: form.title,
        formSchema: content?.formSchema,
        settings: content?.settings,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        items: transformedForms,
        totalItems: transformedForms.length,
        page: 1,
        pageSize: transformedForms.length,
        totalPages: 1
      },
      message: 'Forms retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authHeader = request.headers.get('authorization')

    console.log('=== API ROUTE: POST /api/forms ===')
    console.log('Request Body:', body)
    console.log('body.departmentId:', body.departmentId)
    console.log('body.organizationId:', body.organizationId)

    // Verify authentication
    const auth = verifyToken(authHeader)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Get user information to check role
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        roleAssignments: {
          include: {
            role: true,
            department: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's role name and department
    const userRole = user.roleAssignments?.[0]?.role?.name
    const userDepartmentId = user.roleAssignments?.[0]?.department?.id

    // Determine final organizationId
    let finalOrganizationId = body.organizationId || body.departmentId

    // Apply department restrictions for DepartmentAdmin
    if (userRole === 'DepartmentAdmin') {
      if (!userDepartmentId) {
        return NextResponse.json(
          { error: 'Department information not found for user' },
          { status: 403 }
        )
      }
      // DepartmentAdmin can only create forms in their department
      finalOrganizationId = userDepartmentId
      
      // If they tried to create in a different department, reject
      if (body.organizationId && body.organizationId !== userDepartmentId) {
        return NextResponse.json(
          { error: 'You can only create forms in your own department' },
          { status: 403 }
        )
      }
    }

    console.log('Final Organization ID to be saved:', finalOrganizationId)

    // Generate a unique shareUrl
    const shareUrl = body.code || `FORM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare content with additional metadata
    const content = body.content || body.schema || {}
    const formContent = {
      ...content,
      code: body.code,
      version: 1,
      status: body.status || 'Active',
      formSchema: body.formSchema || content.formSchema,
      settings: body.settings || content.settings
    }

    // Create the form
    const newForm = await prisma.form.create({
      data: {
        title: body.title,
        description: body.description,
        content: formContent,
        isPublished: body.isPublished || false,
        shareUrl: shareUrl,
        organizationId: finalOrganizationId, // Support both for backward compatibility
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('Form created in database:', newForm)
    console.log('Organization from DB:', newForm.organization)

    // Transform the response to include departmentName
    const transformedForm = {
      ...newForm,
      departmentName: newForm.organization?.name,
      code: body.code,
      version: 1,
      status: body.status || 'Active',
      name: newForm.title,
      formSchema: body.formSchema,
      settings: body.settings
    }

    console.log('Transformed form response:', transformedForm)
    console.log('departmentName in response:', transformedForm.departmentName)

    return NextResponse.json({
      success: true,
      data: transformedForm,
      message: 'Form created successfully'
    })
  } catch (error) {
    console.error('Error creating form:', error)
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    )
  }
}





