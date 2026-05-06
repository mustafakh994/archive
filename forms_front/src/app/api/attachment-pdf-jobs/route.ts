import { NextRequest, NextResponse } from 'next/server'
import { authenticateAttachmentJobRequest } from '@/lib/server/attachment-pdf-auth'
import { enqueueAttachmentPdfJob, listAttachmentPdfJobs } from '@/lib/server/attachment-pdf-jobs'

type CreateAttachmentPdfJobBody = {
  kind?: 'submission_pdf' | 'template_zip'
  submissionId?: string
  title?: string
  attachmentUrls?: string[]
  templateId?: string
  submissionAttachments?: Array<{
    submissionId?: string
    attachmentUrls?: string[]
  }>
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAttachmentJobRequest(request)
  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized',
        data: null,
      },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const limitRaw = Number(url.searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50
  const jobs = await listAttachmentPdfJobs(auth.token, limit)
  return NextResponse.json({
    success: true,
    message: 'Jobs retrieved successfully',
    data: jobs,
  })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAttachmentJobRequest(request)
  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized',
        data: null,
      },
      { status: 401 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as CreateAttachmentPdfJobBody
  const kind = body.kind === 'template_zip' ? 'template_zip' : 'submission_pdf'
  const submissionId = String(body.submissionId ?? '').trim()
  const attachmentUrls = Array.isArray(body.attachmentUrls)
    ? body.attachmentUrls.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : []
  const templateId = String(body.templateId ?? '').trim()
  const submissionAttachments = Array.isArray(body.submissionAttachments)
    ? body.submissionAttachments
        .map((group) => ({
          submissionId: String(group?.submissionId ?? '').trim(),
          attachmentUrls: Array.isArray(group?.attachmentUrls)
            ? group.attachmentUrls.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            : [],
        }))
        .filter((group) => group.submissionId && group.attachmentUrls.length > 0)
    : []

  if (kind === 'submission_pdf' && !submissionId) {
    return NextResponse.json(
      {
        success: false,
        message: 'submissionId is required',
        data: null,
      },
      { status: 400 }
    )
  }

  if (kind === 'submission_pdf' && attachmentUrls.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: 'attachmentUrls is required',
        data: null,
      },
      { status: 400 }
    )
  }

  if (kind === 'template_zip' && !templateId) {
    return NextResponse.json(
      {
        success: false,
        message: 'templateId is required',
        data: null,
      },
      { status: 400 }
    )
  }

  if (kind === 'template_zip' && submissionAttachments.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: 'submissionAttachments is required',
        data: null,
      },
      { status: 400 }
    )
  }

  const job = await enqueueAttachmentPdfJob({
    token: auth.token,
    ownerKey: auth.ownerKey,
    kind,
    submissionId: submissionId || undefined,
    templateId: templateId || undefined,
    title:
      body.title?.trim() ||
      (kind === 'template_zip' ? `ZIP مرفقات القالب ${templateId}` : `مرفقات الوثيقة ${submissionId}`),
    attachmentUrls,
    submissionAttachments,
  })

  return NextResponse.json(
    {
      success: true,
      message: 'Job queued successfully',
      data: job,
    },
    { status: 202 }
  )
}
