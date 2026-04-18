/**
 * Shared helpers for archive document display / QR payloads (no secrets).
 */

export type ArchiveDisplayFields = {
  submissionId: string
  documentNumber: string
  employeeName: string
  formName: string
  archiveDate: string
  formVersion?: number
}

function parseResponseDataBlob(raw: unknown): Record<string, unknown> {
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

/** Normalize API row (camelCase or PascalCase) + optional nested submission shape. */
export function extractArchiveDisplayFields(submission: Record<string, unknown>): ArchiveDisplayFields {
  const id = String(submission.id ?? submission.Id ?? '')
  const formName = String(submission.formName ?? submission.FormName ?? '—')
  const formVersion = (submission.formVersion ?? submission.FormVersion) as number | undefined
  const submittedAt = String(submission.submittedAt ?? submission.SubmittedAt ?? '')
  const data = parseResponseDataBlob(submission.responseData ?? submission.ResponseData)

  const documentNumber = String(
    data['system_documentNumber'] ?? data['document_number'] ?? '-'
  )
  const employeeName = String(
    data['system_userName'] ?? data['user_name'] ?? submission.submitterEmail ?? submission.SubmitterEmail ?? 'غير محدد'
  )
  const archiveDate = String(
    data['system_entryDate'] ?? data['entry_date'] ?? submittedAt.split('T')[0] ?? submittedAt
  )

  return {
    submissionId: id,
    documentNumber,
    employeeName,
    formName,
    archiveDate,
    formVersion: typeof formVersion === 'number' ? formVersion : undefined,
  }
}

export function buildArchiveDocumentPlainText(f: ArchiveDisplayFields): string {
  const lines = [
    'وثيقة مؤرشفة — نظام الأرشفة',
    `رقم الوثيقة: ${f.documentNumber}`,
    `القالب: ${f.formName}`,
    `الموظف: ${f.employeeName}`,
    `تاريخ الأرشفة: ${f.archiveDate}`,
    `معرّف السجل: ${f.submissionId}`,
  ]
  if (f.formVersion != null) {
    lines.push(`إصدار القالب: ${f.formVersion}`)
  }
  return lines.join('\n')
}
