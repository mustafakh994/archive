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

export async function PATCH(
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
                { 
                    success: false,
                    message: 'Unauthorized',
                    data: null,
                    errors: []
                },
                { status: 401 }
            )
        }

        // Fetch the current form
        const form = await prisma.form.findUnique({
            where: { id: formId },
            select: {
                id: true,
                isPublished: true,
                content: true,
                organizationId: true
            }
        })

        if (!form) {
            return NextResponse.json(
                { 
                    success: false,
                    message: 'Form not found.',
                    data: false,
                    errors: []
                },
                { status: 404 }
            )
        }

        // Determine the new status
        // Current logic: Active → Inactive, Inactive/Draft/any → Active
        const content = form.content as any
        const currentStatus = content?.status || (form.isPublished ? 'Active' : 'Draft')
        const newIsPublished = currentStatus !== 'Active'
        const newStatus = newIsPublished ? 'Active' : 'Inactive'

        // Update the form's content to include the new status
        const updatedContent = {
            ...content,
            status: newStatus
        }

        // Update the form
        await prisma.form.update({
            where: { id: formId },
            data: {
                isPublished: newIsPublished,
                content: updatedContent,
                updatedAt: new Date()
            }
        })

        // Return success response
        const message = newStatus === 'Active' 
            ? 'Form activated successfully.' 
            : 'Form deactivated successfully.'

        return NextResponse.json({
            success: true,
            message: message,
            data: true,
            errors: []
        })

    } catch (error) {
        console.error('Error toggling form status:', error)
        return NextResponse.json(
            { 
                success: false,
                message: `An error occurred while toggling form status: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data: false,
                errors: []
            },
            { status: 500 }
        )
    }
}



