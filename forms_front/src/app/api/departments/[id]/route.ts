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

// Check if user is SuperAdmin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleAssignments: {
        include: {
          role: true
        }
      }
    }
  })

  if (!user) return false
  
  const userRole = user.roleAssignments?.[0]?.role?.name
  return userRole === 'SuperAdmin'
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

    // Verify token and check if user is SuperAdmin
    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const isAdmin = await isSuperAdmin(auth.userId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only SuperAdmin can access departments' },
        { status: 403 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/departments/${id}`,
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
        { error: data.message || 'Failed to fetch department' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching department:', error)
    return NextResponse.json(
      { error: 'Failed to fetch department' },
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

    // Verify token and check if user is SuperAdmin
    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const isAdmin = await isSuperAdmin(auth.userId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only SuperAdmin can update departments' },
        { status: 403 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/departments/${id}`,
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
        { error: data.message || 'Failed to update department' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating department:', error)
    return NextResponse.json(
      { error: 'Failed to update department' },
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

    // Verify token and check if user is SuperAdmin
    const auth = verifyToken(token)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const isAdmin = await isSuperAdmin(auth.userId)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only SuperAdmin can delete departments' },
        { status: 403 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/departments/${id}`,
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
        { error: data.message || 'Failed to delete department' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    )
  }
}




