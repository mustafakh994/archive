/**
 * Builds a flat list of field labels + plain-text values for public archive view (embedded in QR JWT).
 */

export type PublicArchiveRow = { label: string; value: string }

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extractFormFieldsFromSchemaBlob(blob: unknown): any[] {
  const root = parseMaybeJson(blob) ?? blob
  if (!root || typeof root !== 'object') return []
  const o = root as Record<string, unknown>
  if (Array.isArray(o.fields)) return o.fields as any[]
  if (Array.isArray(o.Fields)) return o.Fields as any[]
  const nested = o.formSchema as Record<string, unknown> | undefined
  if (nested && Array.isArray(nested.fields)) return nested.fields as any[]
  if (nested && Array.isArray(nested.Fields)) return nested.Fields as any[]
  return []
}

function getFieldsFromFormDto(form: any): any[] {
  if (!form) return []
  const fromRoot = extractFormFieldsFromSchemaBlob(form?.formSchema)
  const fromContent = extractFormFieldsFromSchemaBlob(form?.content?.formSchema)
  if (fromRoot.length > 0) return fromRoot
  if (fromContent.length > 0) return fromContent
  const direct = form?.content?.fields
  if (Array.isArray(direct)) return direct
  return []
}

function normalizeField(f: any): { id: string; type: string; label: string; options?: Array<{ label: string; value: string }> } {
  const props = (f?.properties ?? f?.Properties ?? {}) as Record<string, any>
  const options = props.options ?? props.Options
  return {
    id: String(f.id ?? f.Id ?? ''),
    type: String(f.type ?? f.Type ?? ''),
    label: String(props.label ?? props.Label ?? f.id ?? ''),
    options: Array.isArray(options) ? options : undefined,
  }
}

function attachmentDisplayName(url: string): string {
  try {
    if (url.includes('/api/attachments/download')) {
      const full = url.startsWith('http://') || url.startsWith('https://') ? url : `http://local${url.startsWith('/') ? url : `/${url}`}`
      const f = new URL(full).searchParams.get('file')
      if (f) return decodeURIComponent(f)
    }
  } catch {
    /* ignore */
  }
  const noQuery = url.split('?')[0]
  return noQuery.split('/').pop() || 'مرفق'
}

const MAX_VALUE_LEN = 8000

function truncate(s: string): string {
  if (s.length <= MAX_VALUE_LEN) return s
  return `${s.slice(0, MAX_VALUE_LEN)}… [مختصر]`
}

function formatGeneric(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (value.includes('/api/attachments/download') || value.startsWith('http') || value.startsWith('/uploads/')) {
      return truncate(value.includes('download') ? `مرفق: ${attachmentDisplayName(value)}` : `رابط: ${truncate(value)}`)
    }
    return truncate(value)
  }
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'string')) {
      return truncate(value.map((x) => (typeof x === 'string' && x.length > 200 ? `${x.slice(0, 200)}…` : x)).join('، '))
    }
    return truncate(JSON.stringify(value, null, 0))
  }
  if (typeof value === 'object') {
    return truncate(JSON.stringify(value, null, 2))
  }
  return truncate(String(value))
}

function formatByFieldType(
  type: string,
  value: unknown,
  options?: Array<{ label: string; value: string }>
): string {
  if (value === null || value === undefined || value === '') return '—'

  switch (type) {
    case 'checkbox':
      return value ? 'نعم' : 'لا'
    case 'date': {
      const d = new Date(value as string)
      if (Number.isNaN(d.getTime())) return String(value)
      return d.toLocaleDateString('ar-SY', { dateStyle: 'long' })
    }
    case 'dropdown':
    case 'radio_group': {
      const v = value as string
      const opt = options?.find((o) => o.value === v || o.label === v)
      return truncate(opt?.label || v)
    }
    case 'number':
      return String(value)
    case 'email':
      return String(value)
    case 'file_upload':
      if (typeof value === 'string') {
        return truncate(`مرفق: ${attachmentDisplayName(value)}`)
      }
      return formatGeneric(value)
    case 'location': {
      if (typeof value === 'object' && value !== null) {
        const o = value as Record<string, unknown>
        const lat = o.latitude ?? o.lat
        const lng = o.longitude ?? o.lng
        if (lat != null && lng != null) {
          return `خط العرض: ${lat}، خط الطول: ${lng} — خرائط: https://www.google.com/maps?q=${lat},${lng}`
        }
      }
      return formatGeneric(value)
    }
    case 'long_text':
    case 'short_text':
    default:
      return formatGeneric(value)
  }
}

const SYSTEM_KEY_LABELS: Record<string, string> = {
  system_documentNumber: 'رقم الوثيقة (نظام)',
  system_userName: 'المستخدم (نظام)',
  system_entryDate: 'تاريخ الإدخال (نظام)',
  system_attachments: 'مرفقات النظام',
  document_number: 'رقم الوثيقة',
  user_name: 'اسم المستخدم',
  entry_date: 'تاريخ الإدخال',
}

function parseSubmissionData(submission: Record<string, unknown>): Record<string, unknown> {
  const raw = submission.responseData ?? submission.ResponseData
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

/** Ordered form fields + values; includes empty fields as "—". Skips display_* types. */
export function buildPublicFieldRows(submission: Record<string, unknown>, formApiData: any | null): PublicArchiveRow[] {
  const data = parseSubmissionData(submission)
  const rawFields = getFieldsFromFormDto(formApiData)
  const fields = rawFields.map(normalizeField).filter((f) => f.id && !f.type.startsWith('display_'))

  const usedIds = new Set<string>()
  const rows: PublicArchiveRow[] = []

  for (const f of fields) {
    usedIds.add(f.id)
    const rawVal = data[f.id]
    rows.push({
      label: f.label || f.id,
      value: formatByFieldType(f.type, rawVal, f.options),
    })
  }

  for (const [key, val] of Object.entries(data)) {
    if (usedIds.has(key)) continue
    if (key.startsWith('_')) continue

    const label = SYSTEM_KEY_LABELS[key] || key
    if (key === 'system_attachments' && Array.isArray(val)) {
      const parts = val.filter((x): x is string => typeof x === 'string').map((u) => attachmentDisplayName(u))
      rows.push({ label, value: parts.length ? parts.join('، ') : '—' })
      continue
    }
    rows.push({ label, value: formatGeneric(val) })
  }

  return rows
}
