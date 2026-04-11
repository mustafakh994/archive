import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const departmentId = searchParams.get('departmentId')
    const page = searchParams.get('page')
    const pageSize = searchParams.get('pageSize')

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    // Build query string
    const queryParams = new URLSearchParams()
    if (departmentId) queryParams.append('departmentId', departmentId)
    if (page) queryParams.append('page', page)
    if (pageSize) queryParams.append('pageSize', pageSize)

    const query = queryParams.toString()

    // Forward request to backend API
    let endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/Roles`

    // Use department-specific endpoint if departmentId is provided
    if (departmentId) {
      endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/Roles/department/${departmentId}`
      // Add pagination parameters if any other params exist
      const otherParams = new URLSearchParams()
      searchParams.forEach((value, key) => {
        if (key !== 'departmentId') {
          otherParams.append(key, value)
        }
      })
      if (otherParams.toString()) {
        endpoint += `?${otherParams.toString()}`
      }
    } else if (query) {
      endpoint += `?${query}`
    }

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'accept': 'text/plain',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch roles' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
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

    // Forward request to backend API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/Roles`,
      {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'accept': 'text/plain',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create role' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}





