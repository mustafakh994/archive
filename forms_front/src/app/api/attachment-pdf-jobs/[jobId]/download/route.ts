import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { authenticateAttachmentJobRequest } from '@/lib/server/attachment-pdf-auth'
import { resolveAttachmentPdfDownload } from '@/lib/server/attachment-pdf-jobs'

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
      },
      { status: 401 }
    )
  }

  const { jobId } = await params
  const resolved = await resolveAttachmentPdfDownload(auth.token, jobId)
  if (!resolved) {
    return NextResponse.json(
      {
        success: false,
        message: 'File not ready for download',
      },
      { status: 404 }
    )
  }

  try {
    const bytes = await readFile(resolved.filePath)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': resolved.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(resolved.fileName)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to read prepared PDF',
      },
      { status: 500 }
    )
  }
}
