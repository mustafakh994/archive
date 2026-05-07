import { NextRequest, NextResponse } from 'next/server'
import { AUTH_ACCESS_COOKIE } from '@/lib/auth-cookie'

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  return configured.endsWith('/api') ? configured : `${configured}/api`
}

function extractJwt(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  const raw = request.cookies.get(AUTH_ACCESS_COOKIE)?.value
  if (raw) {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return null
}

async function verifyJwt(request: NextRequest): Promise<boolean> {
  const token = extractJwt(request)
  if (!token) return false

  const apiBase = getApiBaseUrl()
  const profileUrl = `${apiBase}/Auth/profile`

  try {
    const res = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  if (!(await verifyJwt(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fileName } = await params
    const apiBase = getApiBaseUrl()
    const upstreamUrl = `${apiBase}/Files/download/by-name/${encodeURIComponent(fileName)}`

    const token = extractJwt(request)
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: request.headers.get('accept') || '*/*',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('Content-Disposition') || 'inline',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('File proxy by-name download failed:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
