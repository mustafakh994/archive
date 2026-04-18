import { NextRequest, NextResponse } from 'next/server'
import { signArchiveDocToken } from '@/lib/archive-doc-public-jwt'
import { extractArchiveDisplayFields } from '@/lib/archive-document-fields'
import { buildPublicFieldRows } from '@/lib/archive-public-snapshot'
import { compressJsonForArchiveSnap } from '@/lib/archive-snap-compress'

function resolvePublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost) {
    const proto = forwardedProto || 'https'
    return `${proto}://${forwardedHost}`
  }
  const self = new URL(request.url)
  return self.origin
}

export async function POST(request: NextRequest) {
  const secret = process.env.ARCHIVE_QR_LINK_SECRET?.trim()
  if (!secret || secret.length < 16) {
    return NextResponse.json({ success: false, code: 'PUBLIC_LINK_DISABLED' as const })
  }

  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { submissionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const submissionId = body.submissionId?.trim()
  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
  const upstream = await fetch(`${apiBase}/formsubmissions/${submissionId}`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'غير مصرح أو الوثيقة غير موجودة' }, { status: 403 })
  }

  const json = (await upstream.json()) as { success?: boolean; data?: Record<string, unknown> }
  if (!json.success || !json.data) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  const f = extractArchiveDisplayFields(json.data)
  const formId = String(json.data.formId ?? json.data.FormId ?? '')
  let formData: unknown = null
  if (formId) {
    const formRes = await fetch(`${apiBase}/forms/${formId}`, {
      headers: { Authorization: auth, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (formRes.ok) {
      const formJson = (await formRes.json()) as { success?: boolean; data?: unknown }
      if (formJson.success && formJson.data) formData = formJson.data
    }
  }

  let rows = buildPublicFieldRows(json.data, formData)
  const shrinkRowValues = (maxChars: number) => {
    rows = rows.map((r) => ({
      label: r.label,
      value: r.value.length > maxChars ? `${r.value.slice(0, maxChars)}…` : r.value,
    }))
  }

  const MAX_SNAP_CHARS = 28000
  const pack = (truncated: boolean) =>
    compressJsonForArchiveSnap(truncated ? { rows, truncated: true } : { rows })

  let packed = pack(false)
  if (packed.length > MAX_SNAP_CHARS) {
    shrinkRowValues(4000)
    packed = pack(true)
  }
  if (packed.length > MAX_SNAP_CHARS) {
    shrinkRowValues(1500)
    packed = pack(true)
  }
  if (packed.length > MAX_SNAP_CHARS) {
    shrinkRowValues(400)
    packed = pack(true)
  }

  const token = signArchiveDocToken(
    {
      sid: f.submissionId,
      doc: f.documentNumber,
      form: f.formName,
      emp: f.employeeName,
      ad: f.archiveDate,
      snap: packed.length <= MAX_SNAP_CHARS ? packed : undefined,
    },
    secret
  )

  const origin = resolvePublicOrigin(request)
  const publicUrl = `${origin}/public/archive-doc?t=${encodeURIComponent(token)}`

  return NextResponse.json({ success: true as const, publicUrl })
}
