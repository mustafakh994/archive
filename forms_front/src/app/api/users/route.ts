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
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    let departmentId = searchParams.get('departmentId')
    const roleId = searchParams.get('roleId')
    const isActive = searchParams.get('isActive')

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

    if (userRole !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin can access user management' },
        { status: 403 }
      )
    }

    // Build query string
    const queryParams = new URLSearchParams()
    if (departmentId) queryParams.append('departmentId', departmentId)
    if (roleId) queryParams.append('roleId', roleId)
    if (isActive) queryParams.append('isActive', isActive)

    const query = queryParams.toString()

    // Forward request to backend API
    // NOTE: The backend API at localhost:5000/api also needs to implement department filtering
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users${query ? `?${query}` : ''}`,
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
        { error: data.message || 'Failed to fetch users' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
    if (userRole !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin can manage users' },
        { status: 403 }
      )
    }

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users`,
      {
        method: 'POST',
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
        { error: data.message || 'Failed to create user' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}





