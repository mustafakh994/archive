'use client'

import { jsPDF } from 'jspdf'
import { fetchAttachmentWithAuth, isApiAttachmentDownloadUrl } from '@/lib/attachment-download-client'

type PdfExportMode = 'single' | 'separate'

function isImageAttachmentUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.startsWith('data:image/')) return true
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif', '.heic', '.heif', '.tif', '.tiff'].some((ext) => lower.includes(ext))
}

function hasImageFileExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif', '.heic', '.heif', '.tif', '.tiff'].some((ext) => lower.includes(ext))
}

function extractAttachmentFilename(url: string): string {
  try {
    const full = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `http://local${url.startsWith('/') ? url : `/${url}`}`
    const parsed = new URL(full)
    const fromQuery = parsed.searchParams.get('file')
      || parsed.searchParams.get('filename')
      || parsed.searchParams.get('name')
    if (fromQuery) return decodeURIComponent(fromQuery)
    return parsed.pathname.split('/').pop() || ''
  } catch {
    return url
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read image data'))
    reader.readAsDataURL(blob)
  })
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
    img.onerror = () => reject(new Error('Failed to load image for PDF export'))
    img.src = src
  })
}

async function fetchImageDataUrl(url: string, token: string | null): Promise<string> {
  if (url.startsWith('data:image/')) return url
  if (isApiAttachmentDownloadUrl(url)) {
    const { blob } = await fetchAttachmentWithAuth(url, token)
    return blobToDataUrl(blob)
  }
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`)
  }
  return blobToDataUrl(await res.blob())
}

async function toImageDataUrlIfPossible(url: string, token: string | null): Promise<string | null> {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:image/')) return trimmed

  if (isApiAttachmentDownloadUrl(trimmed)) {
    const { blob, filename } = await fetchAttachmentWithAuth(trimmed, token)
    const fromMimeType = blob.type.toLowerCase().startsWith('image/')
    const fromFilename = hasImageFileExtension(filename)
    const fromUrlFilename = hasImageFileExtension(extractAttachmentFilename(trimmed))
    if (!fromMimeType && !fromFilename && !fromUrlFilename) return null
    return blobToDataUrl(blob)
  }

  if (!isImageAttachmentUrl(trimmed) && !hasImageFileExtension(extractAttachmentFilename(trimmed))) {
    return null
  }

  return fetchImageDataUrl(trimmed, token)
}

async function addImagePage(pdf: jsPDF, dataUrl: string): Promise<void> {
  const { width, height } = await getImageDimensions(dataUrl)
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const ratio = Math.min(pageWidth / width, pageHeight / height)
  const renderWidth = width * ratio
  const renderHeight = height * ratio
  const x = (pageWidth - renderWidth) / 2
  const y = (pageHeight - renderHeight) / 2
  pdf.addImage(dataUrl, 'JPEG', x, y, renderWidth, renderHeight)
}

export async function exportAttachmentImagesToPdf(
  attachmentUrls: string[],
  mode: PdfExportMode,
  token: string | null,
  baseName: string
): Promise<{ exportedCount: number }> {
  const uniqueUrls = Array.from(new Set(attachmentUrls.map((u) => u.trim()).filter(Boolean)))
  const imageDataUrls: string[] = []

  for (const url of uniqueUrls) {
    try {
      const dataUrl = await toImageDataUrlIfPossible(url, token)
      if (dataUrl) imageDataUrls.push(dataUrl)
    } catch {
      // Skip broken/unreadable attachment and continue exporting other images.
    }
  }

  if (imageDataUrls.length === 0) {
    throw new Error('لا توجد صور مرفقة للتصدير إلى PDF.')
  }

  if (mode === 'single') {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    for (let i = 0; i < imageDataUrls.length; i++) {
      if (i > 0) pdf.addPage()
      await addImagePage(pdf, imageDataUrls[i])
    }
    pdf.save(`${baseName}.pdf`)
  } else {
    for (let i = 0; i < imageDataUrls.length; i++) {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      await addImagePage(pdf, imageDataUrls[i])
      pdf.save(`${baseName}-${i + 1}.pdf`)
    }
  }

  return { exportedCount: imageDataUrls.length }
}
