import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import jwt from 'jsonwebtoken'
import {
  decryptAttachmentBuffer,
  isAttachmentEncryptionEnabled,
  looksLikeEncryptedAttachmentPackage,
} from '@/lib/attachment-crypto'
import { AUTH_ACCESS_COOKIE } from '@/lib/auth-cookie'
import { getJwtVerificationSecret } from '@/lib/server-jwt-secret'

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

function verifyJwt(request: NextRequest): boolean {
  const token = extractJwt(request)
  if (!token) return false
  const secret = getJwtVerificationSecret()
  if (!secret) return false
  try {
    jwt.verify(token, secret)
    return true
  } catch {
    return false
  }
}

function contentTypeForFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    zip: 'application/zip',
  }
  return map[ext] ?? 'application/octet-stream'
}

/** Prevent path traversal: only allow a single path segment filename */
function safeBasename(name: string): string | null {
  const decoded = decodeURIComponent(name)
  if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null
  }
  return decoded
}

export async function GET(request: NextRequest) {
  if (!verifyJwt(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        hint: 'سجّل الدخول من لوحة التحكم أو افتح الرابط في نفس المتصفح بعد تسجيل الدخول (يُرسل التوكن عبر الكوكي).',
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get('submissionId')
  const fileParam = searchParams.get('file')
  if (!submissionId || !fileParam) {
    return NextResponse.json({ error: 'Missing submissionId or file' }, { status: 400 })
  }

  if (submissionId.includes('..') || submissionId.includes('/') || submissionId.includes('\\')) {
    return NextResponse.json({ error: 'Invalid submissionId' }, { status: 400 })
  }

  const basename = safeBasename(fileParam)
  if (!basename) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const privateRoot = join(process.cwd(), 'data', 'uploads_private', submissionId)
  const filePath = join(privateRoot, basename)

  if (!filePath.startsWith(privateRoot)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const stored = await readFile(filePath)
    let body: Buffer = stored

    if (looksLikeEncryptedAttachmentPackage(stored)) {
      if (!isAttachmentEncryptionEnabled()) {
        return NextResponse.json(
          { error: 'Encrypted file but server encryption key is not configured' },
          { status: 500 }
        )
      }
      body = decryptAttachmentBuffer(stored)
    }

    const ext = basename.split('.').pop()?.toLowerCase() ?? ''
    const inlineTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf']
    const disposition = inlineTypes.includes(ext) ? 'inline' : 'attachment'

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForFilename(basename),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(basename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('Attachment download failed:', e)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
