'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  Mail,
  FileText,
  User,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import {
  isApiAttachmentDownloadUrl,
  fetchAttachmentWithAuth,
  triggerBrowserDownload,
  openAttachmentInNewTabWithAuth,
} from '@/lib/attachment-download-client'
import { normalizeAttachmentUrl } from '@/lib/attachment-url'
import { createAttachmentPdfJob } from '@/lib/attachment-pdf-jobs-client'
import SearchableDropdown from '@/components/ui/SearchableDropdown'
import ExcelExportWizard from '@/components/forms/ExcelExportWizard'

interface FormField {
  id: string
  type: string
  properties: {
    label: string
    placeholder?: string
    required?: boolean
    options?: Array<{ label: string; value: string }>
    minValue?: number
    maxValue?: number
    maxLength?: number
  }
}

interface Submission {
  id: string
  formId: string
  responseData: any
  formVersion: number
  submitterIp: string
  submitterEmail: string
  submittedAt: string
  formName: string
}

interface SubmissionsResponse {
  items: Submission[]
  totalItems: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
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

function AdvancedSearchContent() {
  const searchParams = useSearchParams()
  const initialFormId = searchParams.get('formId')

  const { token } = useAuthStore()
  const [submissions, setSubmissions] = useState<SubmissionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [selectedFormName, setSelectedFormName] = useState('')

  // Helper to safely parse responseData
  const parseResponseData = (submission: any): Record<string, any> => {
    // Check both lowercase and PascalCase property names
    const rawData = submission?.responseData || submission?.ResponseData
    if (!rawData) return {}
    
    if (typeof rawData === 'object') return rawData
    
    try {
      return JSON.parse(rawData)
    } catch (e) {
      console.error('Failed to parse responseData:', e)
      return {}
    }
  }

  const [loadingForm, setLoadingForm] = useState(false)
  const [showExportWizard, setShowExportWizard] = useState(false)
  const [isExportingAttachmentsPdf, setIsExportingAttachmentsPdf] = useState(false)
  const [isExportingTemplateZip, setIsExportingTemplateZip] = useState(false)

  // Filter and pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'submittedAt' | 'submitterEmail' | 'formname' | 'formversion'>('submittedAt')
  const [sortDescending, setSortDescending] = useState(true)

  // Form selection
  const [selectedFormId, setSelectedFormId] = useState<string | null>(initialFormId)
  const [formOptions, setFormOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loadingForms, setLoadingForms] = useState(false)

  // Fetch forms for dropdown
  const fetchForms = async (searchTerm: string = '') => {
    setLoadingForms(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('pageSize', '100')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/forms?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()

      const success = result.success !== undefined ? result.success : result.Success
      const data = result.data || result.Data

      if (success && data) {
        const forms = data.items || data.Items || []
        const options = forms.map((form: any) => ({
          id: form.id || form.Id,
          label: form.title || form.Title || form.name || form.Name || 'Untitled Form'
        }))
        setFormOptions(options)
      }
    } catch (err) {
      console.error('Error fetching forms:', err)
    } finally {
      setLoadingForms(false)
    }
  }

  // Fetch submissions using Advanced Search API
  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!token) {
        setError('لم يتم تسجيل الدخول. يرجى تسجيل الدخول أولاً.')
        setLoading(false)
        return
      }

      const requestBody = {
        page,
        pageSize,
        sortBy,
        sortDescending,
        formId: selectedFormId || null,
        search: search || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/formsubmissions/advanced-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      const success = result.success !== undefined ? result.success : result.Success
      const data = result.data || result.Data

      if (success || response.ok) {
        setSubmissions(data || result)
      } else {
        setError(result.message || result.Message || 'فشل في تحميل البيانات')
      }
    } catch (err) {
      console.error('Error fetching submissions:', err)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // Load forms on mount
  useEffect(() => {
    if (token) {
      fetchForms()
    }
  }, [token])

  // Fetch form schema when form changes
  useEffect(() => {
    if (token && selectedFormId) {
      fetchFormSchema(selectedFormId)
    } else {
      setFormFields([])
      setSelectedFormName('')
    }
  }, [selectedFormId, token])

  // Fetch submissions when filters change
  useEffect(() => {
    if (token) {
      fetchSubmissions()
    }
  }, [selectedFormId, page, pageSize, sortBy, sortDescending, startDate, endDate, token])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) {
        if (page === 1) {
          fetchSubmissions()
        } else {
          setPage(1)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search, token])

  // Fetch form schema
  const fetchFormSchema = async (formId: string) => {
    setLoadingForm(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/forms/${formId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()
      const success = result.success !== undefined ? result.success : result.Success
      const data = result.data || result.Data

      if (success && data) {
        const form = data
        setSelectedFormName(form.title || form.Title || form.name || form.Name || 'Untitled Form')
        
        let schema: any = null
        if (typeof form.formSchema === 'string') {
          try { schema = JSON.parse(form.formSchema) } catch(e) {}
        } else if (form.formSchema) {
          schema = form.formSchema
        } else if (typeof form.FormSchema === 'string') {
          try { schema = JSON.parse(form.FormSchema) } catch(e) {}
        } else if (form.FormSchema) {
          schema = form.FormSchema
        } else if (form.content) {
          if (typeof form.content === 'string') {
            try { schema = JSON.parse(form.content) } catch(e) {}
          } else {
            schema = form.content
          }
        }
        
        const fields = schema?.formSchema?.fields || 
                       schema?.fields || 
                       []
                       
        setFormFields(fields.filter((f: FormField) => !f.type.startsWith('display_')))
      }
    } catch (err) {
      console.error('Error fetching form schema:', err)
    } finally {
      setLoadingForm(false)
    }
  }

  // Render field value
  const renderFieldValue = (field: FormField, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">لم يتم الإجابة</span>
    }

    // Handle signature fields - check if it's a signature field by label or field type
    if (field.type === 'signature' ||
      (field.properties.label &&
        (field.properties.label.toLowerCase().includes('signature') ||
          field.properties.label.toLowerCase().includes('توقيع')))) {

      console.log('Signature field detected in responses page:', {
        fieldId: field.id,
        label: field.properties.label,
        valueLength: value.length,
        valueStart: value.substring(0, 50)
      })

      // Check if it's valid base64 (with or without data: prefix)
      const isValidBase64 = value.startsWith('data:image/') || /^[A-Za-z0-9+/]+=*$/.test(value)

      if (isValidBase64 && value.length > 10) {
        const displayUrl = value.startsWith('data:') ? value : `data:image/png;base64,${value}`
        console.log('Rendering signature as image:', { displayUrl: displayUrl.substring(0, 50) + '...' })

        return (
          <div className="mt-2">
            <div className="relative inline-block">
              <img
                src={displayUrl}
                alt={field.properties.label}
                className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onError={(e) => {
                  console.error('Image failed to load:', e)
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <a
              href={displayUrl}
              download={`signature-${field.id}.png`}
              className="inline-flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              تحميل التوقيع
            </a>
          </div>
        )
      }
    }

    // Handle file upload fields
    if (field.type === 'file_upload') {
      const resolvedValue = typeof value === 'string' ? normalizeAttachmentUrl(value) : value

      if (typeof resolvedValue === 'string' && isApiAttachmentDownloadUrl(resolvedValue)) {
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void openAttachmentInNewTabWithAuth(resolvedValue, token).catch((e) =>
                  alert(e instanceof Error ? e.message : 'فشل العرض')
                )
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50"
            >
              عرض المرفق
            </button>
            <button
              type="button"
              onClick={() => {
                void fetchAttachmentWithAuth(resolvedValue, token)
                  .then(({ blob, filename }) => triggerBrowserDownload(blob, filename))
                  .catch((e) => alert(e instanceof Error ? e.message : 'فشل التحميل'))
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50"
            >
              تحميل
            </button>
          </div>
        )
      }
      // Check if it's a URL (Cloudflare R2 or other)
      if (typeof resolvedValue === 'string' && (resolvedValue.startsWith('http') || resolvedValue.startsWith('/uploads/'))) {
        const getFileExtension = (url: string): string => {
          try {
            if (url.startsWith('http')) {
              const urlObj = new URL(url)
              const pathname = urlObj.pathname
              const extension = pathname.split('.').pop()?.toLowerCase() || ''
              return extension
            } else {
              const extension = url.split('.').pop()?.toLowerCase() || ''
              return extension
            }
          } catch {
            return ''
          }
        }

        const getFileType = (url: string): string => {
          const extension = getFileExtension(url)
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
          const pdfExtensions = ['pdf']
          const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
          const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a']

          if (imageExtensions.includes(extension)) return 'image'
          if (pdfExtensions.includes(extension)) return 'pdf'
          if (videoExtensions.includes(extension)) return 'video'
          if (audioExtensions.includes(extension)) return 'audio'
          return 'file'
        }

        const fileType = getFileType(resolvedValue)

        switch (fileType) {
          case 'image':
            return (
              <div className="mt-2">
                <div className="relative inline-block">
                  <img
                    src={resolvedValue}
                    alt={field.properties.label}
                    className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <a
                  href={resolvedValue}
                  download
                  className="inline-flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تحميل الصورة
                </a>
              </div>
            )

          case 'pdf':
            return (
              <div className="mt-2">
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">PDF Document</p>
                    <p className="text-xs text-red-600">Click to download</p>
                  </div>
                  <a
                    href={resolvedValue}
                    download
                    className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    تحميل
                  </a>
                </div>
              </div>
            )

          default:
            return (
              <div className="mt-2">
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">File Attachment</p>
                    <p className="text-xs text-gray-600">Click to download</p>
                  </div>
                  <a
                    href={resolvedValue}
                    download
                    className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    تحميل
                  </a>
                </div>
              </div>
            )
        }
      }
    }

    // Handle other field types
    switch (field.type) {
      case 'checkbox':
        return (
          <span className={`px-3 py-1.5 rounded-md text-sm font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {value ? 'نعم ✓' : 'لا'}
          </span>
        )

      case 'date':
        const dateObj = new Date(value)
        const formattedDate = dateObj.toLocaleDateString('ar-SY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        return <span className="text-gray-900 font-medium">{formattedDate}</span>

      case 'dropdown':
      case 'radio_group':
        const option = field.properties.options?.find(opt => opt.value === value || opt.label === value)
        return (
          <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-900 rounded-md text-sm font-medium">
            {option?.label || value}
          </span>
        )

      default:
        // For any other field types, check if it might be a base64 image
        if (typeof value === 'string' && value.length > 100) {
          const isValidBase64 = /^[A-Za-z0-9+/]+=*$/.test(value)
          const hasImageSignature = value.includes('iVBORw0KGgo') || value.includes('/9j/') ||
            value.includes('SuQmCC') || value.includes('AAAAB3NzaC1yc2E')

          if (isValidBase64 && hasImageSignature) {
            const displayUrl = value.startsWith('data:') ? value : `data:image/png;base64,${value}`
            return (
              <div className="mt-2">
                <div className="relative inline-block">
                  <img
                    src={displayUrl}
                    alt={field.properties.label}
                    className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <a
                  href={displayUrl}
                  download={`image-${field.id}.png`}
                  className="inline-flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تحميل الصورة
                </a>
              </div>
            )
          }
        }

        return <span className="text-gray-900 font-medium">{String(value).substring(0, 100)}</span>
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const exportSelectedSubmissionAttachmentsPdf = async (mode: 'single' | 'separate') => {
    if (!selectedSubmission) return
    const data = parseResponseData(selectedSubmission)
    const systemAttachments = Array.isArray(data['system_attachments'])
      ? (data['system_attachments']
          .filter((v: unknown) => typeof v === 'string')
          .map((v) => normalizeAttachmentUrl(v as string)) as string[])
      : []
    if (systemAttachments.length === 0) {
      alert('لا توجد ملفات مرفقة لإرسالها إلى التحميلات.')
      return
    }

    setIsExportingAttachmentsPdf(true)
    try {
      if (mode === 'single') {
        await createAttachmentPdfJob(token, {
          submissionId: selectedSubmission.id,
          title: `PDF مرفقات الوثيقة ${selectedSubmission.id}`,
          attachmentUrls: systemAttachments,
        })
      } else {
        await Promise.all(
          systemAttachments.map((url, idx) =>
            createAttachmentPdfJob(token, {
              submissionId: selectedSubmission.id,
              title: `PDF مرفق ${idx + 1} للوثيقة ${selectedSubmission.id}`,
              attachmentUrls: [url],
            })
          )
        )
      }
      alert('تم إرسال تجهيز ملفات PDF إلى صفحة التحميلات.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر إرسال المهمة إلى التحميلات.')
    } finally {
      setIsExportingAttachmentsPdf(false)
    }
  }

  const exportTemplateAttachmentsZip = async () => {
    if (!token) {
      alert('يجب تسجيل الدخول أولاً.')
      return
    }
    if (!selectedFormId) {
      alert('اختر قالبًا أولاً.')
      return
    }

    setIsExportingTemplateZip(true)
    try {
      const allSubmissions: Submission[] = []
      const maxPages = 200
      for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiUrl}/forms/${selectedFormId}/submissions?page=${currentPage}&pageSize=200`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
        const result = await response.json().catch(() => ({}))
        const success = result.success !== undefined ? result.success : result.Success
        const data = result.data || result.Data
        if (!success || !data) {
          throw new Error(result.message || result.Message || 'فشل تحميل إرسالات القالب.')
        }

        const pageItems = Array.isArray(data.items) ? data.items : Array.isArray(data.Items) ? data.Items : []
        if (pageItems.length === 0) break
        allSubmissions.push(...pageItems)
        const hasNext = Boolean(data.hasNextPage || data.HasNextPage)
        if (!hasNext) break
      }

      const grouped = allSubmissions
        .map((submission) => {
          const data = parseResponseData(submission)
          const attachmentUrls = Array.isArray(data['system_attachments'])
            ? (data['system_attachments']
                .filter((v: unknown) => typeof v === 'string')
                .map((v) => normalizeAttachmentUrl(v as string)) as string[])
            : []
          return {
            submissionId: submission.id,
            attachmentUrls,
          }
        })
        .filter((group) => group.attachmentUrls.length > 0)

      if (grouped.length === 0) {
        alert('لا توجد مرفقات ضمن إرسالات هذا القالب.')
        return
      }

      await createAttachmentPdfJob(token, {
        kind: 'template_zip',
        templateId: selectedFormId,
        title: `ZIP مرفقات القالب ${selectedFormId}`,
        submissionAttachments: grouped,
      })
      alert(`تم إرسال تجهيز ${grouped.length} وثيقة إلى صفحة التحميلات.`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر إرسال المهمة إلى التحميلات.')
    } finally {
      setIsExportingTemplateZip(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
            <Search className="text-indigo-600" size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">البحث المتقدم للوثائق</h1>
            <p className="text-[15px] font-medium text-slate-500 mt-1">استخدم محرك البحث أو الفلاتر المتاحة للعثور على الوثائق المطلوبة.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Form Selector (Optional) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <label className="block text-[15px] font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" strokeWidth={2.5} />
            اختر قالب الوثيقة (اختياري للبحث المخصص)
          </label>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <SearchableDropdown
              options={formOptions}
              value={selectedFormId}
              onChange={setSelectedFormId}
              placeholder="جميع قوالب الوثائق..."
              searchPlaceholder="البحث في القوالب..."
              loading={loadingForms}
              className="max-w-xl w-full"
              dir="rtl"
            />
            <button
              type="button"
              disabled={!selectedFormId || isExportingTemplateZip || loading}
              onClick={() => {
                void exportTemplateAttachmentsZip()
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
            >
              <FileText size={16} />
              {isExportingTemplateZip ? 'جاري تجهيز ZIP...' : 'تجهيز مرفقات القالب ZIP'}
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-5">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="البحث داخل الوثائق (مثال: رقم الوثيقة، اسم الموظف)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 text-[14px] font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 hover:bg-slate-50/50 transition-colors text-slate-900 placeholder:text-slate-400"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <label className="text-[13px] font-bold text-slate-500 whitespace-nowrap">من</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-[14px] font-medium text-slate-700 outline-none p-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <label className="text-[13px] font-bold text-slate-500 whitespace-nowrap">إلى</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-[14px] font-medium text-slate-700 outline-none p-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 text-[14px] font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-slate-700 cursor-pointer"
                dir="rtl"
              >
                <option value="submittedAt">تاريخ الأرشفة</option>
                <option value="submitterEmail">البريد الإلكتروني</option>
              </select>

              <button
                onClick={() => setSortDescending(!sortDescending)}
                className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-500 transition-colors"
                title={sortDescending ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
              >
                <ArrowUpDown size={20} className={sortDescending ? 'rotate-180 transition-transform' : 'transition-transform'} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Page Size & Stats Info */}
          {submissions && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[13px] font-bold border border-indigo-100/50">
                  إجمالي الوثائق المُطابقة:
                  <span className="text-indigo-900 bg-white px-2 py-0.5 rounded shadow-sm">{submissions.totalItems || (submissions as any).TotalItems || 0}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[13px] font-bold text-slate-500" dir="rtl">النتائج في الصفحة:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-2 py-1 text-[13px] font-bold border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-center text-[17px] font-bold text-slate-700" dir="rtl">جاري البحث في الوثائق...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 mb-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="text-rose-600 mb-3" size={32} strokeWidth={2.5} />
            <p className="text-[17px] font-bold text-rose-800" dir="rtl">{error}</p>
          </div>
        )}

        {/* Submissions Table */}
        {!loading && !error && submissions && submissions.items.length > 0 && (
          <>
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/80">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {selectedFormId && formFields.length > 0 ? (
                        // Dynamic Headers for Selected Form
                        <>
                          {formFields.slice(0, 5).map(field => (
                            <th key={field.id} className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                              {field.properties.label}
                            </th>
                          ))}
                        </>
                      ) : (
                        // Default Headers for All Forms
                        <>
                          <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                            رقم الوثيقة
                          </th>
                          <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                            قالب الوثيقة
                          </th>
                          <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                            الموظف / صاحب العلاقة
                          </th>
                          <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                            تاريخ الأرشفة
                          </th>
                        </>
                      )}
                      <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                        المرفقات
                      </th>
                      <th className="px-4 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {(submissions.items || (submissions as any).Items || []).map((submission: any) => {
                      const data = parseResponseData(submission)

                      // Find attachments in responseData (handling both individual fields and the system_attachments array)
                      const attachments: { key: string; url: string }[] = []

                      Object.entries(data || {}).forEach(([key, value]) => {
                        if (typeof value === 'string' && (
                          value.startsWith('http') ||
                          value.startsWith('/uploads/') ||
                          value.includes('/api/attachments/download') ||
                          value.toLowerCase().includes('.pdf') ||
                          value.toLowerCase().includes('.jpg') ||
                          value.toLowerCase().includes('.png')
                        )) {
                          attachments.push({ key, url: normalizeAttachmentUrl(value) })
                        } else if (key === 'system_attachments' && Array.isArray(value)) {
                          value.forEach((url, idx) => {
                            if (typeof url === 'string') {
                              attachments.push({ key: `Attachment ${idx + 1}`, url: normalizeAttachmentUrl(url) })
                            }
                          })
                        }
                      })

                      return (
                        <tr key={submission.id} className="hover:bg-indigo-50/30 transition-colors group">
                          {selectedFormId && formFields.length > 0 ? (
                            // Dynamic Cells
                            <>
                              {formFields.slice(0, 5).map(field => (
                                <td key={field.id} className="px-4 py-4 whitespace-nowrap text-[14px] font-medium text-slate-700">
                                  {data[field.id] ? (
                                    typeof data[field.id] === 'string' && data[field.id].length > 30
                                      ? data[field.id].substring(0, 30) + '...'
                                      : String(data[field.id])
                                  ) : '-'}
                                </td>
                              ))}
                            </>
                          ) : (
                            // Default Cells
                            <>
                              <td className="px-4 py-4 whitespace-nowrap text-[14px] font-bold text-indigo-700">
                                {data['system_documentNumber'] || data['document_number'] || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-[14px] font-bold text-slate-700">
                                {submission.formName || 'وثيقة عامة'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-[14px] font-medium text-slate-600">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User size={12} strokeWidth={2.5} />
                                  </div>
                                  {data['system_userName'] || data['user_name'] || (submission.submitterEmail || (submission as any).SubmitterEmail || '').split('@')[0]}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-[13px] font-bold text-slate-600">
                                {data['system_entryDate'] || data['entry_date'] || formatDate(submission.submittedAt || (submission as any).SubmittedAt).split(',')[0]}
                              </td>
                            </>
                          )}

                          {/* Attachments Column */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex -space-x-reverse space-x-1.5">
                              {attachments.length > 0 ? (
                                attachments.slice(0, 3).map((att, idx) => {
                                  const isPdf = att.url.toLowerCase().includes('.pdf')
                                  const needsAuth = isApiAttachmentDownloadUrl(att.url)
                                  const btnClass = `p-1.5 rounded-lg border transition-colors flex items-center justify-center w-8 h-8 ${isPdf ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`
                                  return needsAuth ? (
                                    <button
                                      key={idx}
                                      type="button"
                                      title={`View ${att.key}`}
                                      className={btnClass}
                                      onClick={() => {
                                        void openAttachmentInNewTabWithAuth(att.url, token).catch((e) =>
                                          alert(e instanceof Error ? e.message : 'فشل العرض')
                                        )
                                      }}
                                    >
                                      {isPdf ? <FileText size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
                                    </button>
                                  ) : (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`View ${att.key}`}
                                      className={btnClass}
                                    >
                                      {isPdf ? <FileText size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
                                    </a>
                                  )
                                })
                              ) : (
                                <span className="text-slate-400 text-[13px] font-medium bg-slate-50 px-2 py-1 rounded-lg">لا يوجد</span>
                              )}
                              {attachments.length > 3 && (
                                <span className="text-slate-500 text-[12px] font-bold flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 border border-slate-200">+{attachments.length - 3}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-[14px]">
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission)
                                fetchFormSchema(submission.formId)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                              التفاصيل
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_14px_rgb(0,0,0,0.02)] mt-6 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[14px] font-bold text-slate-600" dir="rtl">
                  عرض <span className="text-indigo-600">{((page - 1) * pageSize) + 1}</span> إلى{' '}
                  <span className="text-indigo-600">
                    {Math.min(page * pageSize, (submissions.totalItems || (submissions as any).TotalItems || 0))}
                  </span>{' '}
                  من <span className="text-indigo-600">{submissions.totalItems || (submissions as any).TotalItems || 0}</span> نتيجة
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!(submissions.hasPreviousPage || (submissions as any).HasPreviousPage)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-[13px] font-bold text-slate-700 shadow-sm"
                    dir="rtl"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                    السابق
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(5, (submissions.totalPages || (submissions as any).TotalPages || 0)) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-[14px] font-bold shadow-sm border ${page === pageNum
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white border-transparent'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!(submissions.hasNextPage || (submissions as any).HasNextPage)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-[13px] font-bold text-slate-700 shadow-sm"
                    dir="rtl"
                  >
                    التالي
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && submissions && submissions.items.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <FileText className="text-slate-400" size={32} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2" dir="rtl">لا توجد إجابات</h3>
            <p className="text-[15px] font-medium text-slate-500 max-w-md" dir="rtl">لم يتم العثور على أي نتائج تطابق شروط البحث الحالية. يرجى محاولة تغيير الفلاتر للحصول على نتائج.</p>
          </div>
        )}

        {/* Submission Detail Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" dir="rtl">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300">
              <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100/50 bg-white relative">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight" dir="rtl">التفاصيل الكاملة للوثيقة</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <span className="text-xl leading-none">✕</span>
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {(() => {
                  const data = parseResponseData(selectedSubmission)
                  return (
                    <div className="space-y-8">
                      {/* Metadata Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 border border-indigo-100/50 p-5 rounded-2xl flex flex-col justify-center">
                          <p className="text-[13px] text-indigo-600 mb-1 font-bold" dir="rtl">رقم الوثيقة</p>
                          <p className="font-black text-indigo-950 text-xl" dir="rtl">
                              {data['system_documentNumber'] || data['document_number'] || 'غير متوفر'}
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center">
                          <p className="text-[13px] text-slate-500 mb-1 font-bold" dir="rtl">الموظف المسؤول</p>
                          <p className="font-bold text-slate-900 text-lg flex items-center gap-2" dir="rtl">
                              <User size={18} className="text-slate-400" />
                              {data['system_userName'] || data['user_name'] || selectedSubmission.submitterEmail || (selectedSubmission as any).SubmitterEmail}
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center">
                          <p className="text-[13px] text-slate-500 mb-1 font-bold" dir="rtl">تاريخ الأرشفة</p>
                          <p className="font-bold text-slate-900 text-lg flex items-center gap-2" dir="rtl">
                              <Calendar size={18} className="text-slate-400" />
                              {data['system_entryDate'] || data['entry_date'] || formatDate(selectedSubmission.submittedAt || (selectedSubmission as any).SubmittedAt)}
                          </p>
                        </div>
                      </div>

                      {/* System Attachments */}
                      {data['system_attachments'] && Array.isArray(data['system_attachments']) && data['system_attachments'].length > 0 && (
                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h5 className="text-[16px] font-black text-slate-900 flex items-center gap-2">
                              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                                <Download size={18} strokeWidth={2.5} />
                              </div>
                              الملفات المرفقة بالوثيقة ({data['system_attachments'].length})
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isExportingAttachmentsPdf}
                                onClick={() => {
                                  void exportSelectedSubmissionAttachmentsPdf('single')
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FileText size={14} />
                                تجهيز PDF واحد
                              </button>
                              <button
                                type="button"
                                disabled={isExportingAttachmentsPdf}
                                onClick={() => {
                                  void exportSelectedSubmissionAttachmentsPdf('separate')
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FileText size={14} />
                                تجهيز PDF لكل صورة
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {data['system_attachments'].map((url: string, idx: number) => {
                              const resolvedUrl = normalizeAttachmentUrl(url)
                              const fileName = attachmentDisplayName(resolvedUrl)
                              const needsAuth = isApiAttachmentDownloadUrl(resolvedUrl)
                              return (
                                <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
                                    <div className="flex items-center gap-3 overflow-hidden ml-2">
                                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                        <FileText size={18} strokeWidth={2} className="text-indigo-500" />
                                      </div>
                                      <span className="text-[14px] text-slate-700 truncate font-bold">{fileName}</span>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        {needsAuth ? (
                                          <>
                                            <button
                                              type="button"
                                              title="عرض"
                                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded-lg transition-colors bg-white shadow-sm"
                                              onClick={() => {
                                                void openAttachmentInNewTabWithAuth(resolvedUrl, token).catch((e) =>
                                                  alert(e instanceof Error ? e.message : 'فشل العرض')
                                                )
                                              }}
                                            >
                                              <Eye size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                              type="button"
                                              title="تحميل"
                                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-emerald-600 rounded-lg transition-colors bg-white shadow-sm"
                                              onClick={() => {
                                                void fetchAttachmentWithAuth(resolvedUrl, token)
                                                  .then(({ blob, filename }) => triggerBrowserDownload(blob, filename))
                                                  .catch((e) => alert(e instanceof Error ? e.message : 'فشل التحميل'))
                                              }}
                                            >
                                              <Download size={16} strokeWidth={2.5} />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded-lg transition-colors bg-white shadow-sm" title="عرض">
                                                <Eye size={16} strokeWidth={2.5} />
                                            </a>
                                            <a href={resolvedUrl} download className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-emerald-600 rounded-lg transition-colors bg-white shadow-sm" title="تحميل">
                                                <Download size={16} strokeWidth={2.5} />
                                            </a>
                                          </>
                                        )}
                                    </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Data Fields */}
                      <div>
                        <h4 className="text-[18px] font-black text-slate-900 mb-6 flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={20} strokeWidth={2.5} />
                          </div>
                          بيانات النموذج المؤرشف
                        </h4>

                        {loadingForm ? (
                          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-[14px] font-bold text-slate-500">جاري تحميل حقول النموذج...</p>
                          </div>
                        ) : formFields.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {formFields.map((field) => {
                              const value = data[field.id]
                              return (
                                <div key={field.id} className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                                  <label className="block text-[13px] font-bold text-slate-500 mb-2" dir="rtl">
                                    {field.properties.label}
                                  </label>
                                  <div className="text-slate-900 text-[15px] font-bold break-words" dir="rtl">
                                    {renderFieldValue(field, value)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-50/50 rounded-2xl p-12 text-center border border-dashed border-slate-300">
                            <FileSpreadsheet size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-[15px] font-bold text-slate-500" dir="rtl">لا توجد حقول إضافية لهذا التنسيق.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-white">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="w-full sm:w-auto sm:mr-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  dir="rtl"
                >
                  إغلاق التفاصيل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Wizard Modal */}
        {showExportWizard && submissions && (
          <ExcelExportWizard
            isOpen={showExportWizard}
            onClose={() => setShowExportWizard(false)}
            formName={selectedFormName}
            formFields={formFields}
            responses={submissions.items}
            token={token || undefined}
          />
        )}
      </div>
    )

}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin text-blue-600">...</div></div>}>
      <AdvancedSearchContent />
    </Suspense>
  )
}