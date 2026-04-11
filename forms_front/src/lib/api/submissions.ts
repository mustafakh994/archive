// API Client for Form Submissions
// Handles all requests to the formsubmissions endpoint

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api'

export interface SubmissionQuery {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'submittedAt' | 'submitterEmail' | 'formname' | 'formversion' | 'department'
  sortDescending?: boolean
}

export interface Submission {
  id: string
  formId: string
  responseData: any
  formVersion: number
  submitterIp: string
  submitterEmail: string
  submittedAt: string
  formName: string
}

export interface SubmissionsResponse {
  items: Submission[]
  totalItems: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
  errors?: string[]
}

/**
 * Fetch all submissions with filtering and pagination
 */
export async function getAllSubmissions(
  query: SubmissionQuery = {}
): Promise<ApiResponse<SubmissionsResponse>> {
  const {
    page = 1,
    pageSize = 10,
    search,
    sortBy = 'submittedAt',
    sortDescending = true
  } = query

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
    sortDescending: sortDescending.toString()
  })

  if (search) {
    params.append('search', search)
  }

  try {
    // Get token from auth storage (persisted by Zustand)
    let token: string | null = null
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          token = parsed.state?.token || null
        } catch (e) {
          console.error('Failed to parse auth storage:', e)
        }
      }
    }

    if (!token) {
      return {
        success: false,
        message: 'Authentication required',
        data: null,
        errors: ['No authentication token found']
      }
    }
    
    const response = await fetch(`${API_BASE_URL}/formsubmissions?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return {
      success: false,
      message: 'Failed to fetch submissions',
      data: null,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Export submissions to CSV format
 */
export function exportSubmissionsToCSV(submissions: Submission[], filename?: string): void {
  if (submissions.length === 0) {
    console.warn('No submissions to export')
    return
  }

  const headers = ['التاريخ', 'البريد الإلكتروني', 'النموذج', 'الإصدار', 'IP', 'البيانات']
  const rows = submissions.map(sub => [
    new Date(sub.submittedAt).toLocaleString('ar-SY'),
    sub.submitterEmail,
    sub.formName,
    sub.formVersion.toString(),
    sub.submitterIp,
    JSON.stringify(sub.responseData)
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename || `submissions_${new Date().toISOString()}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Export submissions to JSON format
 */
export function exportSubmissionsToJSON(submissions: Submission[], filename?: string): void {
  if (submissions.length === 0) {
    console.warn('No submissions to export')
    return
  }

  const jsonContent = JSON.stringify(submissions, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename || `submissions_${new Date().toISOString()}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Format date for display
 */
export function formatSubmissionDate(dateString: string, locale: string = 'ar-SY'): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * Get submission statistics
 */
export function getSubmissionStats(submissions: Submission[]) {
  if (submissions.length === 0) {
    return {
      total: 0,
      uniqueForms: 0,
      uniqueSubmitters: 0,
      dateRange: null
    }
  }

  const uniqueForms = new Set(submissions.map(s => s.formId)).size
  const uniqueSubmitters = new Set(submissions.map(s => s.submitterEmail)).size
  const dates = submissions.map(s => new Date(s.submittedAt).getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))

  return {
    total: submissions.length,
    uniqueForms,
    uniqueSubmitters,
    dateRange: {
      from: minDate,
      to: maxDate
    }
  }
}

