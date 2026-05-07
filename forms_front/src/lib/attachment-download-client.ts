'use client'

/**
 * Encrypted/private attachments require Authorization; plain <a href> cannot send Bearer tokens.
 */
export function isApiAttachmentDownloadUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    if (url.startsWith('http')) {
      const u = new URL(url)
      return (
        u.pathname.includes('/api/attachments/download') ||
        u.pathname.includes('/api/files/download/')
      )
    }
  } catch {
    return false
  }
  return (
    url.includes('/api/attachments/download') ||
    url.includes('/api/files/download/')
  )
}

export async function fetchAttachmentWithAuth(
  url: string,
  token: string | null
): Promise<{ blob: Blob; filename: string }> {
  if (!token) {
    throw new Error('يجب تسجيل الدخول لتنزيل المرفق')
  }
  const absolute =
    url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${url.startsWith('/') ? url : `/${url}`}`

  const res = await fetch(absolute, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`فشل التنزيل (${res.status})`)
  }
  const cd = res.headers.get('Content-Disposition')
  let filename = 'download'
  if (cd) {
    const m = cd.match(/filename\*=UTF-8''([^;]+)/i)
    if (m?.[1]) {
      try {
        filename = decodeURIComponent(m[1])
      } catch {
        filename = m[1]
      }
    } else {
      const m2 = cd.match(/filename="?([^";]+)"?/i)
      if (m2?.[1]) filename = m2[1]
    }
  }
  const blob = await res.blob()
  return { blob, filename }
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  const href = URL.createObjectURL(blob)
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

/**
 * Download any URL as a blob and trigger browser download.
 * Works for both same-origin and cross-origin URLs.
 * Uses auth token when available; falls back to unauthenticated fetch.
 */
export async function downloadFileAsBlob(
  url: string,
  token: string | null
): Promise<void> {
  const absolute =
    url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${url.startsWith('/') ? url : `/${url}`}`

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(absolute, { headers })
  if (!res.ok) {
    throw new Error(`فشل التنزيل (${res.status})`)
  }

  const cd = res.headers.get('Content-Disposition')
  let filename = 'download'
  if (cd) {
    const m = cd.match(/filename\*=UTF-8''([^;]+)/i)
    if (m?.[1]) {
      try {
        filename = decodeURIComponent(m[1])
      } catch {
        filename = m[1]
      }
    } else {
      const m2 = cd.match(/filename="?([^";]+)"?/i)
      if (m2?.[1]) filename = m2[1]
    }
  } else {
    try {
      const u = new URL(absolute)
      const segments = u.pathname.split('/').filter(Boolean)
      if (segments.length > 0) {
        const last = decodeURIComponent(segments[segments.length - 1])
        if (last.includes('.')) filename = last
      }
    } catch { /* keep default */ }
  }

  const blob = await res.blob()
  triggerBrowserDownload(blob, filename)
}

export async function openAttachmentInNewTabWithAuth(url: string, token: string | null): Promise<void> {
  const { blob, filename } = await fetchAttachmentWithAuth(url, token)
  const href = URL.createObjectURL(blob)
  const w = window.open(href, '_blank', 'noopener,noreferrer')
  if (!w) {
    triggerBrowserDownload(blob, filename)
  }
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}
