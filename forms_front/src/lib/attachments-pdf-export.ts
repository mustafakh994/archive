'use client'

import { jsPDF } from 'jspdf'
import { fetchAttachmentWithAuth, isApiAttachmentDownloadUrl } from '@/lib/attachment-download-client'

type PdfExportMode = 'single' | 'separate'

function isImageAttachmentUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.startsWith('data:image/')) return true
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].some((ext) => lower.includes(ext))
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
  const imageUrls = Array.from(new Set(attachmentUrls.filter(isImageAttachmentUrl)))
  if (imageUrls.length === 0) {
    throw new Error('لا توجد صور مرفقة للتصدير إلى PDF.')
  }

  const imageDataUrls = await Promise.all(imageUrls.map((url) => fetchImageDataUrl(url, token)))

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

  return { exportedCount: imageUrls.length }
}
