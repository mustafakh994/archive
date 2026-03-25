import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareUrl: string }> }
) {
  try {
    const { shareUrl } = await params

    // Look up form by shareUrl directly from the database
    const form = await prisma.form.findUnique({
      where: { shareUrl: shareUrl },
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
        { error: 'Form not found or no longer available' },
        { status: 404 }
      )
    }

    // Check if form is published (only published forms should be accessible via share URL)
    if (!form.isPublished) {
      return NextResponse.json(
        { error: 'Form is not published and cannot be accessed' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          content: form.content,
          isPublished: form.isPublished,
          shareUrl: form.shareUrl,
          organizationId: form.organizationId,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
          organization: form.organization,
          responseCount: form._count.responses
        }
      },
      message: 'Form retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching shared form:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    )
  }
} 