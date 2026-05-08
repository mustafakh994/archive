import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import {
  decryptAttachmentBuffer,
  isAttachmentEncryptionEnabled,
  looksLikeEncryptedAttachmentPackage,
} from '@/lib/attachment-crypto'

export type AttachmentPdfJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type AttachmentPdfJobPublic = {
  id: string
  submissionId: string
  title: string
  status: AttachmentPdfJobStatus
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

type EnqueueAttachmentPdfJobInput = {
  token: string
  ownerKey: string
  title: string
  kind?: 'submission_pdf' | 'template_zip'
  submissionId?: string
  attachmentUrls?: string[]
  templateId?: string
  submissionAttachments?: Array<{
    submissionId: string
    attachmentUrls: string[]
  }>
}

type QueuedJob = {
  id: string
  kind: 'submission_pdf' | 'template_zip'
  submissionId: string
  templateId?: string
  title: string
  attachmentUrls: string[]
  submissionAttachments: Array<{ submissionId: string; attachmentUrls: string[] }>
  token?: string
}

const EXPORT_ROOT = join(process.cwd(), 'data', 'attachment_pdf_exports')
const queuedJobIds: string[] = []
const queuedJobs = new Map<string, QueuedJob>()
let isWorkerRunning = false
let bootstrapPromise: Promise<void> | null = null

type BackendJobDto = {
  id: string
  submissionId: string
  title: string
  status: string
  kind?: 'submission_pdf' | 'template_zip'
  progress: number
  errorMessage?: string | null
  createdAt: string
  completedAt?: string | null
  fileName?: string | null
  fileSizeBytes?: number | null
  templateId?: string | null
  totalSubmissions?: number | null
  filePath?: string | null
  attachmentUrls?: string[] | null
  submissionAttachments?: Array<{ submissionId: string; attachmentUrls?: string[] | null }> | null
}

type BackendEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

function getBackendApiBase(): string {
  let base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '')
  if (!base) base = 'http://localhost:5000/api'
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`
  }
  return base
}

/**
 * Matches Next.js file proxy routes: same upstream shape as `/api/files/download/*`.
 * See `src/app/api/files/download/` routes (uses `/Files/...` on the API origin).
 */
function mapRelativeFilesDownloadToUpstream(relativeUrl: string): string | null {
  const pathname = relativeUrl.trim().startsWith('/') ? relativeUrl.trim() : `/${relativeUrl.trim()}`
  let pathOnly = pathname.split('?')[0] || pathname
  try {
    if (!pathOnly.startsWith('/')) pathOnly = `/${pathOnly}`
    const normalized = pathOnly.replace(/\/+$/, '') || pathOnly

    const byName = /^\/api\/files\/download\/by-name\/(.+)$/i.exec(normalized)
    if (byName?.[1]) {
      try {
        const nameSeg = decodeURIComponent(byName[1])
        if (nameSeg.includes('/') || nameSeg.includes('\\')) return null
        return `${getBackendApiBase()}/Files/download/by-name/${encodeURIComponent(nameSeg)}`
      } catch {
        return `${getBackendApiBase()}/Files/download/by-name/${encodeURIComponent(byName[1])}`
      }
    }

    const byId = /^\/api\/files\/download\/([^/]+)$/i.exec(normalized)
    if (!byId?.[1]) return null
    if (byId[1].toLowerCase() === 'by-name') return null
    return `${getBackendApiBase()}/Files/download/${encodeURIComponent(byId[1])}`
  } catch {
    return null
  }
}

function internalKey(): string {
  return process.env.ATTACHMENT_PDF_JOBS_INTERNAL_API_KEY || ''
}

function toPublic(job: BackendJobDto): AttachmentPdfJobPublic {
  const kind = job.kind === 'template_zip' ? 'template_zip' : 'submission_pdf'
  return {
    id: job.id,
    submissionId: job.submissionId,
    title: job.title,
    status: job.status as AttachmentPdfJobStatus,
    kind,
    progress: job.progress,
    errorMessage: job.errorMessage ?? undefined,
    createdAt: job.createdAt,
    completedAt: job.completedAt ?? undefined,
    fileName: job.fileName ?? undefined,
    fileSizeBytes: job.fileSizeBytes ?? undefined,
    templateId: job.templateId ?? undefined,
    totalSubmissions: job.totalSubmissions ?? undefined,
    downloadUrl: job.status === 'completed' ? `/api/attachment-pdf-jobs/${job.id}/download` : undefined,
  }
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBackendApiBase()}${path}`, {
    ...init,
    cache: 'no-store',
  })
  const body = (await res.json().catch(() => ({}))) as Partial<BackendEnvelope<T>>
  if (!res.ok || !body.success || body.data === undefined) {
    throw new Error(body.message || `Backend request failed (${res.status})`)
  }
  return body.data
}

async function patchJobInternal(jobId: string, payload: Record<string, unknown>): Promise<void> {
  const queued = queuedJobs.get(jobId)
  const key = internalKey()
  if (key) {
    await backendFetch<BackendJobDto>(`/AttachmentPdfJobs/internal/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Attachment-Pdf-Internal-Key': key,
      },
      body: JSON.stringify(payload),
    })
    return
  }
  if (queued?.token) {
    await backendFetch<BackendJobDto>(`/AttachmentPdfJobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${queued.token}`,
      },
      body: JSON.stringify(payload),
    })
  }
}

async function markFailed(jobId: string, message: string): Promise<void> {
  await patchJobInternal(jobId, {
    status: 'failed',
    progress: 100,
    errorMessage: message,
    completedAt: new Date().toISOString(),
  })
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8
}

function parseAttachmentDownloadStoredName(url: string): string | null {
  if (!url.includes('/api/attachments/download')) return null
  try {
    const full = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `http://local${url.startsWith('/') ? url : `/${url}`}`
    const parsed = new URL(full)
    const stored = parsed.searchParams.get('stored')
    if (!stored) return null
    const decoded = decodeURIComponent(stored)
    if (!decoded || decoded.includes('/') || decoded.includes('\\') || decoded.includes('..')) return null
    return decoded
  } catch {
    return null
  }
}

function toSafeBaseName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return cleaned || 'file'
}

async function fetchAttachmentBytes(url: string, bearerToken?: string): Promise<Uint8Array | null> {
  if (url.startsWith('data:image/')) {
    const encoded = url.split(',')[1]
    if (!encoded) return null
    return Buffer.from(encoded, 'base64')
  }

  const storedName = parseAttachmentDownloadStoredName(url)
  if (storedName) {
    const privateRoot = join(process.cwd(), 'data', 'uploads_private')
    const filePath = join(privateRoot, storedName)
    try {
      const stored = await readFile(filePath)
      if (!looksLikeEncryptedAttachmentPackage(stored)) {
        return new Uint8Array(stored)
      }
      if (!isAttachmentEncryptionEnabled()) return null
      return new Uint8Array(decryptAttachmentBuffer(stored))
    } catch {
      return null
    }
  }

  let fetchUrl: string
  if (url.startsWith('http://') || url.startsWith('https://')) {
    fetchUrl = url
  } else {
    const upstream = mapRelativeFilesDownloadToUpstream(url)
    if (upstream) {
      fetchUrl = upstream
    } else {
      const apiOrigin = getBackendApiBase().replace(/\/api$/i, '')
      fetchUrl = `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`
    }
  }

  const headers: Record<string, string> = { Accept: '*/*' }
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  const response = await fetch(fetchUrl, { cache: 'no-store', headers })
  if (!response.ok) {
    return null
  }
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/**
 * Embed WebP/GIF/etc. PDF export jobs run server-side — pdf-lib only accepts PNG/JPEG.
 */
async function normalizeRasterBytesForPdf(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (isPng(bytes) || isJpeg(bytes)) return bytes
  try {
    const sharp = (await import('sharp')).default
    const out = await sharp(Buffer.from(bytes)).png().toBuffer()
    return new Uint8Array(out)
  } catch {
    return null
  }
}

async function addImageToPdf(pdf: PDFDocument, bytes: Uint8Array): Promise<boolean> {
  let image:
    | Awaited<ReturnType<PDFDocument['embedPng']>>
    | Awaited<ReturnType<PDFDocument['embedJpg']>>
    | null = null

  if (isPng(bytes)) {
    image = await pdf.embedPng(bytes)
  } else if (isJpeg(bytes)) {
    image = await pdf.embedJpg(bytes)
  } else {
    return false
  }

  const pageWidth = 595.28
  const pageHeight = 841.89
  const page = pdf.addPage([pageWidth, pageHeight])
  const scale = Math.min(pageWidth / image.width, pageHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale
  const x = (pageWidth - width) / 2
  const y = (pageHeight - height) / 2
  page.drawImage(image, { x, y, width, height })
  return true
}

async function addPdfToPdf(target: PDFDocument, pdfBytes: Uint8Array): Promise<number> {
  const src = await PDFDocument.load(pdfBytes)
  const pageIndices = src.getPageIndices()
  if (pageIndices.length === 0) return 0
  const copied = await target.copyPages(src, pageIndices)
  copied.forEach((p) => target.addPage(p))
  return copied.length
}

async function buildPdfFromAttachmentUrls(attachmentUrls: string[], bearerToken?: string): Promise<Uint8Array | null> {
  const uniqueUrls = Array.from(new Set((attachmentUrls || []).map((x) => x.trim()).filter(Boolean)))
  if (uniqueUrls.length === 0) return null

  const pdf = await PDFDocument.create()
  let addedPages = 0

  for (const url of uniqueUrls) {
    const bytes = await fetchAttachmentBytes(url, bearerToken)
    if (!bytes) continue
    if (isPdf(bytes)) {
      addedPages += await addPdfToPdf(pdf, bytes)
      continue
    }
    if (await addImageToPdf(pdf, bytes)) {
      addedPages += 1
      continue
    }
    const normalized = await normalizeRasterBytesForPdf(bytes)
    if (normalized && (await addImageToPdf(pdf, normalized))) {
      addedPages += 1
    }
  }

  if (addedPages === 0) return null
  return await pdf.save()
}

function mapSubmissionGroups(
  groups: BackendJobDto['submissionAttachments'] | EnqueueAttachmentPdfJobInput['submissionAttachments']
): Array<{ submissionId: string; attachmentUrls: string[] }> {
  if (!Array.isArray(groups)) return []
  return groups
    .map((group) => ({
      submissionId: String(group?.submissionId || '').trim(),
      attachmentUrls: Array.isArray(group?.attachmentUrls)
        ? group.attachmentUrls.map((x) => String(x || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((group) => group.submissionId && group.attachmentUrls.length > 0)
}

async function processJob(jobId: string): Promise<void> {
  try {
    const queued = queuedJobs.get(jobId)
    const key = internalKey()
    const job = queued
      ? queued
      : key
        ? await backendFetch<BackendJobDto>(`/AttachmentPdfJobs/internal/${jobId}`, {
            headers: { 'X-Attachment-Pdf-Internal-Key': key },
          }).then((x) => ({
            id: x.id,
            kind: x.kind === 'template_zip' ? 'template_zip' : 'submission_pdf',
            submissionId: x.submissionId,
            templateId: x.templateId ?? undefined,
            title: x.title,
            attachmentUrls: Array.isArray(x.attachmentUrls) ? x.attachmentUrls : [],
            submissionAttachments: mapSubmissionGroups(x.submissionAttachments),
            token: undefined,
          }))
        : null
    if (!job) return

    const bearerToken = queued?.token

    await patchJobInternal(jobId, { status: 'processing', progress: 5, errorMessage: null, completedAt: null })
    await mkdir(EXPORT_ROOT, { recursive: true })

    if (job.kind === 'template_zip') {
      const groups = mapSubmissionGroups(job.submissionAttachments)
      if (groups.length === 0) {
        await markFailed(jobId, 'لا توجد مرفقات صالحة داخل القالب المحدد.')
        return
      }

      const zip = new JSZip()
      let filesAdded = 0

      for (let i = 0; i < groups.length; i++) {
        const percent = 10 + Math.round(((i + 1) / groups.length) * 80)
        await patchJobInternal(jobId, { progress: Math.min(percent, 90) })

        const group = groups[i]
        const pdfBytes = await buildPdfFromAttachmentUrls(group.attachmentUrls, bearerToken)
        if (!pdfBytes) continue

        zip.file(`submission-${toSafeBaseName(group.submissionId)}.pdf`, Buffer.from(pdfBytes))
        filesAdded += 1
      }

      if (filesAdded === 0) {
        await markFailed(jobId, 'تعذر تجهيز أي PDF ضمن القالب المحدد.')
        return
      }

      const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const targetId = job.templateId || job.submissionId
      const fileName = `template-${toSafeBaseName(targetId)}-attachments-${job.id}.zip`
      const filePath = join(EXPORT_ROOT, fileName)
      await writeFile(filePath, zipBytes)

      await patchJobInternal(jobId, {
        filePath,
        fileName,
        fileSizeBytes: zipBytes.length,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
      })
      return
    }

    const pdfBytes = await buildPdfFromAttachmentUrls(job.attachmentUrls, bearerToken)
    if (!pdfBytes) {
      await markFailed(jobId, 'لا توجد ملفات قابلة للتحويل (صور أو PDF).')
      return
    }

    const fileName = `submission-${toSafeBaseName(job.submissionId)}-attachments-${job.id}.pdf`
    const filePath = join(EXPORT_ROOT, fileName)
    await writeFile(filePath, pdfBytes)

    await patchJobInternal(jobId, {
      filePath,
      fileName,
      fileSizeBytes: pdfBytes.length,
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل تجهيز الملف.'
    await markFailed(jobId, message)
  }
}

function enqueueInMemory(jobId: string): void {
  if (queuedJobIds.includes(jobId)) return
  queuedJobIds.push(jobId)
}

async function ensureWorkerBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const key = internalKey()
      if (!key) return
      const pending = await backendFetch<BackendJobDto[]>(`/AttachmentPdfJobs/internal/pending`, {
        headers: { 'X-Attachment-Pdf-Internal-Key': key },
      })
      for (const p of pending) {
        queuedJobs.set(p.id, {
          id: p.id,
          kind: p.kind === 'template_zip' ? 'template_zip' : 'submission_pdf',
          submissionId: p.submissionId,
          templateId: p.templateId ?? undefined,
          title: p.title,
          attachmentUrls: Array.isArray(p.attachmentUrls) ? p.attachmentUrls : [],
          submissionAttachments: mapSubmissionGroups(p.submissionAttachments),
          token: undefined,
        })
        enqueueInMemory(p.id)
      }
      if (queuedJobIds.length > 0) void runWorker()
    })()
  }
  await bootstrapPromise
}

async function runWorker(): Promise<void> {
  if (isWorkerRunning) return
  isWorkerRunning = true
  try {
    while (queuedJobIds.length > 0) {
      const nextId = queuedJobIds.shift()
      if (!nextId) continue
      await processJob(nextId)
    }
  } finally {
    isWorkerRunning = false
    if (queuedJobIds.length > 0) {
      void runWorker()
    }
  }
}

export async function enqueueAttachmentPdfJob(input: EnqueueAttachmentPdfJobInput): Promise<AttachmentPdfJobPublic> {
  await ensureWorkerBootstrapped()
  const kind = input.kind === 'template_zip' ? 'template_zip' : 'submission_pdf'
  const job = await backendFetch<BackendJobDto>('/AttachmentPdfJobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      kind,
      submissionId: kind === 'submission_pdf' ? input.submissionId : undefined,
      templateId: kind === 'template_zip' ? input.templateId : undefined,
      title: input.title,
      attachmentUrls: kind === 'submission_pdf' ? input.attachmentUrls ?? [] : undefined,
      submissionAttachments: kind === 'template_zip' ? mapSubmissionGroups(input.submissionAttachments) : undefined,
    }),
  })
  queuedJobs.set(job.id, {
    id: job.id,
    kind: job.kind === 'template_zip' ? 'template_zip' : 'submission_pdf',
    submissionId: job.submissionId,
    templateId: job.templateId ?? undefined,
    title: job.title,
    attachmentUrls: Array.isArray(input.attachmentUrls) ? input.attachmentUrls : [],
    submissionAttachments: mapSubmissionGroups(input.submissionAttachments),
    token: input.token,
  })
  enqueueInMemory(job.id)
  void runWorker()
  return toPublic(job)
}

export async function listAttachmentPdfJobs(token: string, limit = 100): Promise<AttachmentPdfJobPublic[]> {
  await ensureWorkerBootstrapped()
  const rows = await backendFetch<BackendJobDto[]>(`/AttachmentPdfJobs?limit=${Math.max(1, limit)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return rows.map((row) => toPublic(row))
}

export async function getAttachmentPdfJob(token: string, id: string): Promise<AttachmentPdfJobPublic | null> {
  await ensureWorkerBootstrapped()
  try {
    const row = await backendFetch<BackendJobDto>(`/AttachmentPdfJobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return toPublic(row)
  } catch {
    return null
  }
}

export async function resolveAttachmentPdfDownload(token: string, id: string): Promise<{
  filePath: string
  fileName: string
  contentType: string
} | null> {
  await ensureWorkerBootstrapped()
  let job: BackendJobDto
  try {
    job = await backendFetch<BackendJobDto>(`/AttachmentPdfJobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return null
  }
  if (!job) return null
  if (job.status !== 'completed' || !job.filePath || !job.fileName) return null
  return {
    filePath: job.filePath,
    fileName: job.fileName,
    contentType: job.fileName.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/pdf',
  }
}
