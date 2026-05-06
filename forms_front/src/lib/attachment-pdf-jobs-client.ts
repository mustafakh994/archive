'use client'

export type AttachmentPdfJob = {
  id: string
  submissionId: string
  title: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  kind?: 'submission_pdf' | 'template_zip'
  progress: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
  fileName?: string
  fileSizeBytes?: number
  templateId?: string
  totalSubmissions?: number
  downloadUrl?: string
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

export async function createAttachmentPdfJob(
  token: string | null,
  payload: {
    kind?: 'submission_pdf' | 'template_zip'
    submissionId?: string
    title: string
    attachmentUrls?: string[]
    templateId?: string
    submissionAttachments?: Array<{
      submissionId: string
      attachmentUrls: string[]
    }>
  }
): Promise<AttachmentPdfJob> {
  const response = await fetch('/api/attachment-pdf-jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<AttachmentPdfJob>>
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.message || 'فشل إنشاء مهمة تجهيز PDF')
  }
  return body.data
}

export async function listAttachmentPdfJobs(token: string | null, limit = 100): Promise<AttachmentPdfJob[]> {
  const response = await fetch(`/api/attachment-pdf-jobs?limit=${limit}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  })
  const body = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<AttachmentPdfJob[]>>
  if (!response.ok || !body.success || !Array.isArray(body.data)) {
    throw new Error(body.message || 'فشل تحميل قائمة التحميلات')
  }
  return body.data
}
