import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import {
  decryptAttachmentBuffer,
  isAttachmentEncryptionEnabled,
  looksLikeEncryptedAttachmentPackage,
} from '@/lib/attachment-crypto'
import { AUTH_ACCESS_COOKIE } from '@/lib/auth-cookie'

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

  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const apiBase = configured.endsWith('/api') ? configured : `${configured}/api`
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
  if (!(await verifyJwt(request))) {
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
  const storedParam = searchParams.get('stored')
  if (!submissionId || !fileParam) {
    return NextResponse.json({ error: 'Missing submissionId or file' }, { status: 400 })
  }

  // fileParam is the user-visible original filename; storedParam is the encrypted blob name on disk.
  const downloadName = safeBasename(fileParam)
  const storageName = safeBasename(storedParam || fileParam)
  if (!downloadName || !storageName) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  // NOTE:
  // الملفات محفوظة مباشرة داخل data/uploads_private بدون مجلد فرعي لكل submissionId.
  // نحتفظ بـ submissionId في الـ query string فقط لأغراض منطقية/تتبّع، وليس كجزء من مسار الملفات.
  const privateRoot = join(process.cwd(), 'data', 'uploads_private')
  const filePath = join(privateRoot, storageName)

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

    const ext = downloadName.split('.').pop()?.toLowerCase() ?? ''
    const inlineTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf']
    const disposition = inlineTypes.includes(ext) ? 'inline' : 'attachment'

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForFilename(downloadName),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('Attachment download failed:', e)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
