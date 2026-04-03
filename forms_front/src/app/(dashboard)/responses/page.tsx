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
  FileSpreadsheet
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import {
  isApiAttachmentDownloadUrl,
  fetchAttachmentWithAuth,
  triggerBrowserDownload,
  openAttachmentInNewTabWithAuth,
} from '@/lib/attachment-download-client'
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
      if (typeof value === 'string' && isApiAttachmentDownloadUrl(value)) {
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void openAttachmentInNewTabWithAuth(value, token).catch((e) =>
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
                void fetchAttachmentWithAuth(value, token)
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
      if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/uploads/'))) {
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

        const fileType = getFileType(value)

        switch (fileType) {
          case 'image':
            return (
              <div className="mt-2">
                <div className="relative inline-block">
                  <img
                    src={value}
                    alt={field.properties.label}
                    className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <a
                  href={value}
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
                    href={value}
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
                    href={value}
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3" dir="rtl">البحث المتقدم للوثائق المؤرشفة</h1>
          <p className="text-lg text-gray-600" dir="rtl">استخدم محرك البحث أو الفلاتر المتاحة للعثور على الوثائق المطلوبة</p>
        </div>

        {/* Form Selector (Optional) */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <label className="block text-lg font-bold text-gray-900 mb-3">اختر قالب الوثيقة (اختياري للبحث المخصص)</label>
          <SearchableDropdown
            options={formOptions}
            value={selectedFormId}
            onChange={setSelectedFormId}
            placeholder="جميع قوالب الوثائق..."
            searchPlaceholder="البحث في القوالب..."
            loading={loadingForms}
            className="max-w-xl"
            dir="rtl"
          />
        </div>

        {/* Filters and Actions */}
        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="البحث داخل الوثائق (مثال: رقم الوثيقة، اسم الموظف)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex gap-2 items-center">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">من:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap mr-2">إلى:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                dir="rtl"
              >
                <option value="submittedAt">تاريخ الأرشفة</option>
                <option value="submitterEmail">البريد الإلكتروني</option>
              </select>

              <button
                onClick={() => setSortDescending(!sortDescending)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortDescending ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
              >
                <ArrowUpDown size={24} className={sortDescending ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>

          {/* Page Size & Stats Info */}
          {submissions && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 font-semibold" dir="rtl">إجمالي الوثائق المُطابقة: <span className="text-blue-600 text-base">{submissions.totalItems || (submissions as any).TotalItems || 0}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-black" dir="rtl">عدد العناصر:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-center text-xl text-gray-600 mt-4" dir="rtl">جاري البحث في الوثائق...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-xl text-red-800" dir="rtl">{error}</p>
          </div>
        )}

        {/* Submissions Table */}
        {!loading && !error && submissions && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedFormId && formFields.length > 0 ? (
                        // Dynamic Headers for Selected Form
                        <>
                          {formFields.slice(0, 5).map(field => (
                            <th key={field.id} className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                              {field.properties.label}
                            </th>
                          ))}
                        </>
                      ) : (
                        // Default Headers for All Forms
                        <>
                          <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            رقم الوثيقة
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            قالب الوثيقة
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            الموظف / صاحب العلاقة
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            تاريخ الأرشفة
                          </th>
                        </>
                      )}
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        المرفقات
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
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
                          attachments.push({ key, url: value })
                        } else if (key === 'system_attachments' && Array.isArray(value)) {
                          value.forEach((url, idx) => {
                            if (typeof url === 'string') {
                              attachments.push({ key: `Attachment ${idx + 1}`, url })
                            }
                          })
                        }
                      })

                      return (
                        <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                          {selectedFormId && formFields.length > 0 ? (
                            // Dynamic Cells
                            <>
                              {formFields.slice(0, 5).map(field => (
                                <td key={field.id} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
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
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-blue-800 bg-blue-50/30">
                                {data['system_documentNumber'] || data['document_number'] || '-'}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {submission.formName || 'وثيقة عامة'}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {data['system_userName'] || data['user_name'] || (submission.submitterEmail || (submission as any).SubmitterEmail || '').split('@')[0]}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                {data['system_entryDate'] || data['entry_date'] || formatDate(submission.submittedAt || (submission as any).SubmittedAt).split(',')[0]}
                              </td>
                            </>
                          )}

                          {/* Attachments Column */}
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex -space-x-reverse space-x-1">
                              {attachments.length > 0 ? (
                                attachments.slice(0, 3).map((att, idx) => {
                                  const isPdf = att.url.toLowerCase().includes('.pdf')
                                  const needsAuth = isApiAttachmentDownloadUrl(att.url)
                                  const btnClass = `p-1.5 rounded-md transition-colors ${isPdf ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`
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
                                      {isPdf ? <FileText size={16} /> : <Eye size={16} />}
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
                                      {isPdf ? <FileText size={16} /> : <Eye size={16} />}
                                    </a>
                                  )
                                })
                              ) : (
                                <span className="text-gray-300 text-xs">لا يوجد</span>
                              )}
                              {attachments.length > 3 && (
                                <span className="text-gray-400 text-xs flex items-center pr-1">+{attachments.length - 3}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4 whitespace-nowrap text-sm font-bold">
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission)
                                fetchFormSchema(submission.formId)
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Eye size={16} />
                              عرض كامل
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
            <div className="bg-white rounded-lg shadow mt-4 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-black" dir="rtl">
                  عرض <span className="font-semibold">{((page - 1) * pageSize) + 1}</span> إلى{' '}
                  <span className="font-semibold">
                    {Math.min(page * pageSize, (submissions.totalItems || (submissions as any).TotalItems || 0))}
                  </span>{' '}
                  من <span className="font-semibold">{submissions.totalItems || (submissions as any).TotalItems || 0}</span> نتيجة
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!(submissions.hasPreviousPage || (submissions as any).HasPreviousPage)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold text-black"
                    dir="rtl"
                  >
                    <ChevronRight size={16} />
                    السابق
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, (submissions.totalPages || (submissions as any).TotalPages || 0)) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50 text-black'
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
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold text-black"
                    dir="rtl"
                  >
                    التالي
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && submissions && submissions.items.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-6" size={64} />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3" dir="rtl">لا توجد إجابات</h3>
            <p className="text-lg text-gray-600" dir="rtl">لم يتم العثور على أي إجابات لهذا النموذج</p>
          </div>
        )}

        {/* Submission Detail Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h3 className="text-2xl font-bold text-gray-900" dir="rtl">تفاصيل الوثيقة المؤرشفة</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl p-2"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {(() => {
                  const data = parseResponseData(selectedSubmission)
                  return (
                    <div className="space-y-8">
                      {/* Metadata Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                          <p className="text-xs text-blue-600 mb-1 font-bold" dir="rtl">رقم الوثيقة</p>
                          <p className="font-bold text-blue-900 text-lg" dir="rtl">
                              {data['system_documentNumber'] || data['document_number'] || 'غير متوفر'}
                          </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                          <p className="text-xs text-gray-600 mb-1 font-bold" dir="rtl">الموظف المسؤول</p>
                          <p className="font-semibold text-gray-900" dir="rtl">
                              {data['system_userName'] || data['user_name'] || selectedSubmission.submitterEmail || (selectedSubmission as any).SubmitterEmail}
                          </p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                          <p className="text-xs text-gray-600 mb-1 font-bold" dir="rtl">تاريخ الأرشفة</p>
                          <p className="font-semibold text-gray-900" dir="rtl">
                              {data['system_entryDate'] || data['entry_date'] || formatDate(selectedSubmission.submittedAt || (selectedSubmission as any).SubmittedAt)}
                          </p>
                        </div>
                      </div>

                      {/* System Attachments */}
                      {data['system_attachments'] && Array.isArray(data['system_attachments']) && data['system_attachments'].length > 0 && (
                        <div className="bg-indigo-50/30 border border-indigo-100 p-5 rounded-xl">
                          <h5 className="text-base font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Download size={20} className="text-indigo-600" />
                            الملفات المرفقة بالوثيقة ({data['system_attachments'].length})
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {data['system_attachments'].map((url: string, idx: number) => {
                              const fileName = attachmentDisplayName(url)
                              const needsAuth = isApiAttachmentDownloadUrl(url)
                              return (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText size={18} className="text-indigo-400 shrink-0" />
                                      <span className="text-sm text-gray-700 truncate font-medium">{fileName}</span>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {needsAuth ? (
                                          <>
                                            <button
                                              type="button"
                                              title="عرض"
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                              onClick={() => {
                                                void openAttachmentInNewTabWithAuth(url, token).catch((e) =>
                                                  alert(e instanceof Error ? e.message : 'فشل العرض')
                                                )
                                              }}
                                            >
                                              <Eye size={18} />
                                            </button>
                                            <button
                                              type="button"
                                              title="تحميل"
                                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                              onClick={() => {
                                                void fetchAttachmentWithAuth(url, token)
                                                  .then(({ blob, filename }) => triggerBrowserDownload(blob, filename))
                                                  .catch((e) => alert(e instanceof Error ? e.message : 'فشل التحميل'))
                                              }}
                                            >
                                              <Download size={18} />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="عرض">
                                                <Eye size={18} />
                                            </a>
                                            <a href={url} download className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="تحميل">
                                                <Download size={18} />
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
                        <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-2">
                          <FileText size={20} className="text-blue-600" />
                          بيانات النموذج المؤرشف
                        </h4>

                        {loadingForm ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                            <p className="text-sm text-gray-500">جاري تحميل حقول النموذج...</p>
                          </div>
                        ) : formFields.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formFields.map((field) => {
                              const value = data[field.id]
                              return (
                                <div key={field.id} className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                                  <label className="block text-sm font-bold text-gray-600 mb-2" dir="rtl">
                                    {field.properties.label}
                                  </label>
                                  <div className="text-gray-900 text-base" dir="rtl">
                                    {renderFieldValue(field, value)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-200">
                            <p className="text-gray-500" dir="rtl">لا توجد حقول إضافية لهذا التنسيق.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold shadow-sm"
                  dir="rtl"
                >
                  إغلاق
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
    </div >
  )
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8"><div className="animate-spin text-blue-600">...</div></div>}>
      <AdvancedSearchContent />
    </Suspense>
  )
}
