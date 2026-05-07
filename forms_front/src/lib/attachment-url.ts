const API_BASE_FALLBACK = 'https://api.forms.hamaprov.net'

function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || API_BASE_FALLBACK
  const withoutApiSuffix = raw.replace(/\/api\/?$/, '')
  return withoutApiSuffix.replace(/\/+$/, '')
}

function extractLegacyFilename(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (!trimmed.includes('/') && /\.[A-Za-z0-9]{2,10}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://local.invalid')
    const path = parsed.pathname.replace(/^\/+/, '')
    if (!path || path.includes('/')) return null
    if (!/\.[A-Za-z0-9]{2,10}$/.test(path)) return null
    return path
  } catch {
    return null
  }
}

export function normalizeAttachmentUrl(url: string): string {
  if (!url || typeof url !== 'string') return url

  if (url.includes('/api/attachments/download') || url.includes('/api/files/download/')) {
    return url
  }

  const legacyName = extractLegacyFilename(url)
  if (!legacyName) return url

  return `/api/files/download/by-name/${encodeURIComponent(legacyName)}`
}
