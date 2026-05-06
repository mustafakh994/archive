import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { AUTH_ACCESS_COOKIE } from '@/lib/auth-cookie'

type AttachmentJobAuthContext = {
  token: string
  ownerKey: string
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

function fallbackOwnerKey(token: string): string {
  const digest = createHash('sha256').update(token).digest('hex')
  return `token:${digest}`
}

export async function authenticateAttachmentJobRequest(
  request: NextRequest
): Promise<AttachmentJobAuthContext | null> {
  const token = extractJwt(request)
  if (!token) return null

  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const apiBase = configured.endsWith('/api') ? configured : `${configured}/api`
  const profileUrl = `${apiBase}/Auth/profile`

  try {
    const response = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return null

    const body = (await response.json().catch(() => ({}))) as Record<string, any>
    const userId = body?.data?.id || body?.id || null
    return {
      token,
      ownerKey: userId ? `user:${String(userId)}` : fallbackOwnerKey(token),
    }
  } catch {
    return null
  }
}
