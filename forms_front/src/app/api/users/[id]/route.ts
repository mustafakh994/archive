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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    // Verify token and get user information
    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get current user information to check role
    const currentUser = await prisma.user.findUnique({
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

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userRole = currentUser.roleAssignments?.[0]?.role?.name
    if (userRole !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin can access user management' },
        { status: 403 }
      )
    }

    // Get the target user to check department
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            role: true,
            department: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/${id}`,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch user' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    // Verify token and get user information
    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get current user information to check role
    const currentUser = await prisma.user.findUnique({
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

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userRole = currentUser.roleAssignments?.[0]?.role?.name
    if (userRole !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin can manage users' },
        { status: 403 }
      )
    }

    // Get the target user to check department
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: {
          include: {
            department: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/${id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to update user' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userRole = currentUser.roleAssignments?.[0]?.role?.name
    if (userRole !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin can manage users' },
        { status: 403 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to delete user' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}




