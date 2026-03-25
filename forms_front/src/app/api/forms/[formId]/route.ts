import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Simple token verification - extract user ID from Bearer token
function verifyToken(authHeader: string | null): { userId: string } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    
    const token = authHeader.substring(7)
    
    try {
        // For development, we'll use a simple token format
        // In production, you should use proper JWT verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-here') as any
        return { userId: decoded.userId || decoded.id || decoded.sub }
    } catch (error) {
        console.error('Token verification failed:', error)
        return null
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const { formId } = await params
        const formData = await request.json()
        const authHeader = request.headers.get('authorization')

        // Verify authentication
        const auth = verifyToken(authHeader)
        if (!auth) {
            return NextResponse.json(
                { error: 'Invalid or missing authentication token' },
                { status: 401 }
            )
        }

        // Check if form exists and user has permission to update it
        const existingForm = await prisma.form.findUnique({
            where: { id: formId },
            select: { 
                id: true, 
                organizationId: true
            }
        })

        if (!existingForm) {
            return NextResponse.json(
                { error: 'Form not found' },
                { status: 404 }
            )
        }

        // For now, allow updates by the creator or any authenticated user
        // In production, you might want to add more sophisticated permission checks
        
        // Generate shareUrl if not provided and form is being published
        let shareUrl = formData.shareUrl
        if (!shareUrl && formData.isPublished) {
            shareUrl = `FORM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        // Update the form
        const updatedForm = await prisma.form.update({
            where: { id: formId },
            data: {
                title: formData.title,
                description: formData.description,
                content: formData.content || formData.schema, // Handle both content and schema
                isPublished: formData.isPublished,
                shareUrl: shareUrl,
                updatedAt: new Date(),
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

        return NextResponse.json({
            success: true,
            data: updatedForm,
            message: 'Form updated successfully'
        })
    } catch (error) {
        console.error('Error updating form:', error)
        return NextResponse.json(
            { error: 'Failed to update form' },
            { status: 500 }
        )
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const { formId } = await params
        const authHeader = request.headers.get('authorization')

        // Verify authentication
        const auth = verifyToken(authHeader)
        if (!auth) {
            return NextResponse.json(
                { error: 'Invalid or missing authentication token' },
                { status: 401 }
            )
        }

        // Fetch the form with related data
        const form = await prisma.form.findUnique({
            where: { id: formId },
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
            }
        })

        if (!form) {
            return NextResponse.json(
                { error: 'Form not found' },
                { status: 404 }
            )
        }

        // Transform form to add additional fields from content JSON
        const content = form.content as any
        const transformedForm = {
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

        return NextResponse.json({
            success: true,
            data: transformedForm,
            message: 'Form retrieved successfully'
        })
    } catch (error) {
        console.error('Error fetching form:', error)
        return NextResponse.json(
            { error: 'Failed to fetch form' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const { formId } = await params
        const updateData = await request.json()
        const authHeader = request.headers.get('authorization')

        console.log('PATCH /api/forms/[formId] called with:', { formId, updateData })

        // Verify authentication
        const auth = verifyToken(authHeader)
        if (!auth) {
            return NextResponse.json(
                { error: 'Invalid or missing authentication token' },
                { status: 401 }
            )
        }

        // Check if form exists
        const existingForm = await prisma.form.findUnique({
            where: { id: formId },
            select: { 
                id: true, 
                organizationId: true
            }
        })

        if (!existingForm) {
            return NextResponse.json(
                { error: 'Form not found' },
                { status: 404 }
            )
        }

        // Generate shareUrl if not provided and form is being published
        let shareUrl = updateData.shareUrl
        if (!shareUrl && updateData.isPublished) {
            shareUrl = `FORM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        // Update only the provided fields
        const updatedForm = await prisma.form.update({
            where: { id: formId },
            data: {
                ...updateData,
                shareUrl: shareUrl,
                updatedAt: new Date()
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

        return NextResponse.json({
            success: true,
            data: updatedForm,
            message: 'Form updated successfully'
        })
    } catch (error) {
        console.error('Error updating form:', error)
        return NextResponse.json(
            { error: 'Failed to update form' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const { formId } = await params
        const authHeader = request.headers.get('authorization')

        // Verify authentication
        const auth = verifyToken(authHeader)
        if (!auth) {
            return NextResponse.json(
                { error: 'Invalid or missing authentication token' },
                { status: 401 }
            )
        }

        // Check if form exists
        const existingForm = await prisma.form.findUnique({
            where: { id: formId },
            select: { 
                id: true, 
                organizationId: true,
                _count: {
                    select: {
                        responses: true
                    }
                }
            }
        })

        if (!existingForm) {
            return NextResponse.json(
                { error: 'Form not found' },
                { status: 404 }
            )
        }

        // Check if form has responses - you might want to prevent deletion in this case
        if (existingForm._count.responses > 0) {
            return NextResponse.json(
                { error: 'Cannot delete form with existing responses. Archive it instead.' },
                { status: 400 }
            )
        }

        // Delete the form
        await prisma.form.delete({
            where: { id: formId }
        })

        return NextResponse.json({
            success: true,
            message: 'Form deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting form:', error)
        return NextResponse.json(
            { error: 'Failed to delete form' },
            { status: 500 }
        )
    }
}