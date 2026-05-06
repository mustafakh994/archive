import { NextRequest, NextResponse } from 'next/server'
import { authenticateAttachmentJobRequest } from '@/lib/server/attachment-pdf-auth'
import { getAttachmentPdfJob } from '@/lib/server/attachment-pdf-jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

  const { jobId } = await params
  const job = await getAttachmentPdfJob(auth.token, jobId)
  if (!job) {
    return NextResponse.json(
      {
        success: false,
        message: 'Job not found',
        data: null,
      },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Job retrieved successfully',
    data: job,
  })
}
