'use client'

import { useState, useEffect } from 'react'
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
  User
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import SearchableDropdown from '@/components/ui/SearchableDropdown'

// Location Display Component for reverse geocoding
interface LocationDisplayProps {
  lat: number
  lng: number
}

// Simple cache for addresses to avoid repeated API calls
const addressCache = new Map<string, string>()
let lastApiCall = 0
const API_DELAY = 1000 // 1 second delay between API calls (Nominatim requires respectful usage)

function LocationDisplay({ lat, lng }: LocationDisplayProps) {
  const [address, setAddress] = useState<string>('Loading address...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reverseGeocode = async () => {
      try {
        setLoading(true)
        setError(null)

        // Round coordinates to avoid too many cache entries for similar locations
        const roundedLat = Math.round(lat * 10000) / 10000 // 4 decimal places
        const roundedLng = Math.round(lng * 10000) / 10000
        const cacheKey = `${roundedLat},${roundedLng}`

        // Check cache first
        if (addressCache.has(cacheKey)) {
          setAddress(addressCache.get(cacheKey)!)
          setLoading(false)
          return
        }

        // Rate limiting: wait if we made a call recently
        const now = Date.now()
        if (now - lastApiCall < API_DELAY) {
          await new Promise(resolve => setTimeout(resolve, API_DELAY - (now - lastApiCall)))
        }
        lastApiCall = Date.now()

        // Use OpenStreetMap Nominatim API for reverse geocoding (free)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Forms-App/1.0' // Required by Nominatim
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch address')
        }

        const data = await response.json()

        let displayAddress = 'Address not found'
        if (data && data.display_name) {
          displayAddress = data.display_name
          // Cache the successful result
          addressCache.set(cacheKey, displayAddress)
        }

        setAddress(displayAddress)
      } catch (err) {
        console.error('Reverse geocoding error:', err)
        setError('Failed to load address')
        setAddress(`${lat}, ${lng}`) // Fallback to coordinates
      } finally {
        setLoading(false)
      }
    }

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      reverseGeocode()
    } else {
      setAddress('Invalid coordinates')
      setLoading(false)
    }
  }, [lat, lng])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Loading address...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        <span className="font-medium">Error:</span> {error}
        <div className="text-xs text-gray-500 mt-1">
          Coordinates: {lat}, {lng}
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-900">
      <div className="font-medium">{address}</div>
      <div className="text-xs text-gray-500 mt-1">
        Coordinates: {lat}, {lng}
      </div>
    </div>
  )
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

interface SubmissionsResponse {
  items: Submission[]
  totalItems: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function SubmissionsPage() {
  const { token } = useAuthStore()
  const [submissions, setSubmissions] = useState<SubmissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [loadingForm, setLoadingForm] = useState(false)

  // Filter and pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'submittedAt' | 'submitterEmail' | 'formname' | 'formversion'>('submittedAt')
  const [sortDescending, setSortDescending] = useState(true)

  // Filter states
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)

  // Filter options
  const [formOptions, setFormOptions] = useState<Array<{ id: string; label: string }>>([])
  const [emailOptions, setEmailOptions] = useState<Array<{ id: string; label: string }>>([])
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; label: string }>>([])

  // Loading states for filters
  const [loadingForms, setLoadingForms] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(false)

  // Fetch submissions
  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!token) {
        setError('لم يتم تسجيل الدخول. يرجى تسجيل الدخول أولاً.')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortDescending: sortDescending.toString()
      })

      if (search) {
        params.append('search', search)
      }

      if (selectedFormId) {
        params.append('formId', selectedFormId)
      }

      if (selectedEmail) {
        params.append('submitterEmail', selectedEmail)
      }

      if (selectedDepartmentId) {
        params.append('departmentId', selectedDepartmentId)
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/formsubmissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        setSubmissions(result.data)
      } else {
        setError(result.message || 'فشل في تحميل البيانات')
      }
    } catch (err) {
      console.error('Error fetching submissions:', err)
      setError('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [page, pageSize, sortBy, sortDescending, selectedFormId, selectedEmail, selectedDepartmentId])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchSubmissions()
      } else {
        setPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Fetch forms for filter
  const fetchForms = async (searchTerm: string = '') => {
    setLoadingForms(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('pageSize', '100') // Get more forms for dropdown

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/forms?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Backend returns { data: { items: [...], totalItems, page, etc. } }
        const forms = result.data.items || []
        const options = forms.map((form: any) => ({
          id: form.id,
          label: form.title || form.name || 'Untitled Form'
        }))
        setFormOptions(options)
      }
    } catch (err) {
      console.error('Error fetching forms:', err)
    } finally {
      setLoadingForms(false)
    }
  }

  // Fetch emails for filter
  const fetchEmails = async (searchTerm: string = '') => {
    setLoadingEmails(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('pageSize', '100') // Get more emails for dropdown

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/formsubmissions/emails?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Backend returns { data: ['email1@example.com', 'email2@example.com', ...] }
        const emails = result.data || []
        const options = emails.map((email: string) => ({
          id: email,
          label: email
        }))
        setEmailOptions(options)
      }
    } catch (err) {
      console.error('Error fetching emails:', err)
    } finally {
      setLoadingEmails(false)
    }
  }

  // Fetch departments for filter
  const fetchDepartments = async (searchTerm: string = '') => {
    setLoadingDepartments(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('pageSize', '100') // Get more departments for dropdown

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/departments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Backend returns { data: { items: [...], totalItems, page, etc. } }
        const departments = result.data.items || []
        const options = departments.map((dept: any) => ({
          id: dept.id,
          label: dept.name || 'Untitled Department'
        }))
        setDepartmentOptions(options)
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
    } finally {
      setLoadingDepartments(false)
    }
  }

  // Load initial filter options
  useEffect(() => {
    if (token) {
      fetchForms()
      fetchEmails()
      fetchDepartments()
    }
  }, [token])

  // Fetch form schema when submission is selected
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

      if (result.success && result.data) {
        const form = result.data
        // Extract fields from form content/schema
        const fields = form.content?.formSchema?.fields ||
          form.formSchema?.fields ||
          form.content?.fields ||
          []
        setFormFields(fields.filter((f: FormField) => !f.type.startsWith('display_')))
      }
    } catch (err) {
      console.error('Error fetching form schema:', err)
    } finally {
      setLoadingForm(false)
    }
  }

  // Open submission detail and fetch form schema
  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission)
    setFormFields([])
    fetchFormSchema(submission.formId)
  }

  // Render field value based on type
  const renderFieldValue = (field: FormField, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">لم يتم الإجابة</span>
    }

    switch (field.type) {
      case 'checkbox':
        return (
          <span className={`px-3 py-1.5 rounded-md text-sm font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {value ? 'نعم ✓' : 'لا'}
          </span>
        )

      case 'date':
        // Format date in Gregorian calendar (dd/mm/yyyy)
        const dateObj = new Date(value)
        const formattedDate = dateObj.toLocaleDateString('ar-SY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-medium">{formattedDate}</span>
            <span className="text-xs text-gray-500">({dateObj.toLocaleDateString('ar-SY', { dateStyle: 'long' })})</span>
          </div>
        )

      case 'dropdown':
        const dropdownOption = field.properties.options?.find(opt => opt.value === value || opt.label === value)
        return (
          <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-900 rounded-md text-sm font-medium">
            {dropdownOption?.label || value}
          </span>
        )

      case 'radio_group':
        const radioOption = field.properties.options?.find(opt => opt.value === value || opt.label === value) as any
        return (
          <div className="flex items-center gap-3 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
            <span className="text-blue-900 font-medium">{radioOption?.label || value}</span>
            {radioOption?.imageUrl && (
              <img
                src={radioOption.imageUrl}
                alt={radioOption.label}
                className="w-16 h-16 object-cover rounded border border-blue-300"
              />
            )}
          </div>
        )

      case 'number':
        return <span className="text-gray-900 font-mono font-medium">{value}</span>

      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline flex items-center gap-2 font-medium">
            <Mail size={16} />
            <span className="text-gray-900">{value}</span>
          </a>
        )

      case 'file_upload':
        // Check if value is a Cloudflare R2 URL or a filename
        const isR2Url = typeof value === 'string' && value.startsWith('http')

        if (isR2Url) {
          // Cloudflare R2 URL - use directly
          return (
            <div className="space-y-2">
              <a
                href={value}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-800 rounded-md hover:bg-green-100 border border-green-200 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download File</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <p className="text-xs text-gray-500">
                انقر للتحميل • ملف مخزن في السحابة
              </p>
            </div>
          )
        } else {
          // Legacy filename - use download API
          const fileUrl = `/api/download/${selectedSubmission?.id}/${field.id}/${value}`

          return (
            <div className="space-y-2">
              <a
                href={fileUrl}
                download={value}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-800 rounded-md hover:bg-green-100 border border-green-200 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{value}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <p className="text-xs text-gray-500">
                انقر للتحميل • {(value.length * 1024).toLocaleString()} بايت تقريباً
              </p>
            </div>
          )
        }

      case 'long_text':
        return (
          <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200 leading-relaxed">
            {value}
          </div>
        )

      case 'location':
        // Handle location objects with accuracy, latitude, longitude, timestamp
        if (typeof value === 'object' && value !== null) {
          const { accuracy, latitude, longitude, timestamp } = value

          // Create a LocationDisplay component for better UX
          return (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="space-y-3">
                {/* Human-readable address */}
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold text-blue-900">Address:</span>
                  </div>
                  <LocationDisplay lat={latitude} lng={longitude} />
                </div>

                {/* Technical details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-blue-900">Latitude:</span>
                    <span className="text-blue-800 ml-2">{latitude}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Longitude:</span>
                    <span className="text-blue-800 ml-2">{longitude}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Accuracy:</span>
                    <span className="text-blue-800 ml-2">{accuracy}m</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Timestamp:</span>
                    <span className="text-blue-800 ml-2">
                      {timestamp ? new Date(timestamp).toLocaleString('ar-SY') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Map link */}
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          )
        }
        return <span className="text-gray-900 font-medium">{JSON.stringify(value)}</span>

      case 'short_text':
      default:
        // Handle objects that might be passed to default case
        if (typeof value === 'object' && value !== null) {
          return (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          )
        }

        // Special handling for signature fields
        if (typeof value === 'string' && field.properties.label &&
          (field.properties.label.toLowerCase().includes('signature') ||
            field.properties.label.toLowerCase().includes('توقيع'))) {

          console.log('Signature field detected in submissions page:', {
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

        return <span className="text-gray-900 font-medium">{value}</span>
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!submissions || submissions.items.length === 0) return

    const headers = ['التاريخ', 'البريد الإلكتروني', 'مسودة الوثيقة', 'الإصدار', 'IP']
    const rows = submissions.items.map(sub => [
      new Date(sub.submittedAt).toLocaleString('ar-SY'),
      sub.submitterEmail,
      sub.formName,
      sub.formVersion.toString(),
      sub.submitterIp
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `submissions_${new Date().toISOString()}.csv`
    link.click()
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3" dir="rtl">جميع الوثائق المرسلة</h1>
          <p className="text-lg text-gray-600" dir="rtl">عرض وإدارة جميع إرسالات مسودات الوثائق</p>
        </div>

        {/* Stats Cards */}
        {submissions && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-gray-600" dir="rtl">إجمالي الإرسالات</p>
                  <p className="text-3xl font-bold text-gray-900">{submissions.totalItems}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileText className="text-blue-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-gray-600" dir="rtl">الصفحة الحالية</p>
                  <p className="text-3xl font-bold text-gray-900">{submissions.page} / {submissions.totalPages}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Calendar className="text-green-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-gray-600" dir="rtl">إرسالات في الصفحة</p>
                  <p className="text-3xl font-bold text-gray-900">{submissions.items.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <User className="text-purple-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-gray-600" dir="rtl">حجم الصفحة</p>
                  <p className="text-3xl font-bold text-gray-900">{pageSize}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Filter className="text-orange-600" size={28} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="البحث في البريد الإلكتروني، اسم القالب، أو البيانات..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="min-w-[200px]">
                <SearchableDropdown
                  options={formOptions}
                  value={selectedFormId}
                  onChange={setSelectedFormId}
                  placeholder="جميع القوالب"
                  searchPlaceholder="البحث في القوالب..."
                  loading={loadingForms}
                  className="w-full"
                  dir="rtl"
                />
              </div>

              <div className="min-w-[200px]">
                <SearchableDropdown
                  options={emailOptions}
                  value={selectedEmail}
                  onChange={setSelectedEmail}
                  placeholder="جميع البريد الإلكتروني"
                  searchPlaceholder="البحث في البريد الإلكتروني..."
                  loading={loadingEmails}
                  className="w-full"
                  dir="rtl"
                />
              </div>

              <div className="min-w-[200px]">
                <SearchableDropdown
                  options={departmentOptions}
                  value={selectedDepartmentId}
                  onChange={setSelectedDepartmentId}
                  placeholder="جميع الأقسام"
                  searchPlaceholder="البحث في الأقسام..."
                  loading={loadingDepartments}
                  className="w-full"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Sort and Actions Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sort By */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                dir="rtl"
              >
                <option value="submittedAt">تاريخ الإرسال</option>
                <option value="submitterEmail">البريد الإلكتروني</option>
                <option value="formname">اسم القالب</option>
                <option value="formversion">إصدار القالب</option>
              </select>

              <button
                onClick={() => setSortDescending(!sortDescending)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortDescending ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
              >
                <ArrowUpDown size={24} className={sortDescending ? 'rotate-180' : ''} />
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                dir="rtl"
              >
                <Download size={24} />
                <span className="hidden sm:inline">تصدير CSV</span>
              </button>
            </div>
          </div>

          {/* Page Size Selector */}
          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-black" dir="rtl">عدد العناصر في الصفحة:</label>
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

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-center text-xl text-gray-600 mt-4" dir="rtl">جاري تحميل الإرسالات...</p>
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
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        القالب
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        البريد الإلكتروني
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        تاريخ الإرسال
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        الإصدار
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        IP
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.items.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="text-blue-600 ml-2" size={16} />
                            <div>
                              <div className="text-xs font-semibold text-gray-900">
                                {submission.formName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {submission.formId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center text-xs text-gray-900">
                            <Mail className="text-gray-400 ml-1" size={14} />
                            {submission.submitterEmail}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {formatDate(submission.submittedAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800">
                            v{submission.formVersion}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {submission.submitterIp}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold">
                          <button
                            onClick={() => handleViewSubmission(submission)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Eye size={14} />
                            عرض
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    {Math.min(page * pageSize, submissions.totalItems)}
                  </span>{' '}
                  من <span className="font-semibold">{submissions.totalItems}</span> نتيجة
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!submissions.hasPreviousPage}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold text-black"
                    dir="rtl"
                  >
                    <ChevronRight size={16} />
                    السابق
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, submissions.totalPages) }, (_, i) => {
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
                    {submissions.totalPages > 5 && (
                      <>
                        <span className="px-2">...</span>
                        <button
                          onClick={() => setPage(submissions.totalPages)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${page === submissions.totalPages
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50 text-black'
                            }`}
                        >
                          {submissions.totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!submissions.hasNextPage}
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
            <h3 className="text-2xl font-semibold text-gray-900 mb-3" dir="rtl">لا توجد إرسالات</h3>
            <p className="text-lg text-gray-600" dir="rtl">لم يتم العثور على أي إرسالات تطابق معايير البحث</p>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900" dir="rtl">تفاصيل الإرسال</h3>
              <button
                onClick={() => {
                  setSelectedSubmission(null)
                  setFormFields([])
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-base text-gray-600 mb-2" dir="rtl">القالب</p>
                  <p className="font-semibold text-gray-900 text-lg" dir="rtl">{selectedSubmission.formName}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-base text-gray-600 mb-2" dir="rtl">البريد الإلكتروني</p>
                  <p className="font-semibold text-gray-900 text-lg" dir="rtl">{selectedSubmission.submitterEmail}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-base text-gray-600 mb-2" dir="rtl">تاريخ الإرسال</p>
                  <p className="font-semibold text-gray-900 text-lg" dir="rtl">{formatDate(selectedSubmission.submittedAt)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-base text-gray-600 mb-2" dir="rtl">عنوان IP</p>
                  <p className="font-semibold text-gray-900 font-mono text-lg" dir="rtl">{selectedSubmission.submitterIp}</p>
                </div>
              </div>

              {/* Response Data */}
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3" dir="rtl">
                  <FileText size={24} className="text-blue-600" />
                  بيانات الإرسال
                </h4>

                {loadingForm ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : formFields.length > 0 ? (
                  <div className="space-y-3">
                    {formFields.map((field) => {
                      const value = selectedSubmission.responseData[field.id]
                      return (
                        <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                          <label className="block text-lg font-bold text-gray-800 mb-4" dir="rtl">
                            {field.properties.label}
                            {field.properties.required && (
                              <span className="text-red-500 mr-2 text-xl">*</span>
                            )}
                          </label>
                          <div>
                            {renderFieldValue(field, value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-base text-gray-600 mb-3" dir="rtl">لم يتم العثور على تفاصيل الحقول. عرض البيانات الخام:</p>
                    <pre className="text-base text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedSubmission.responseData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedSubmission(null)
                  setFormFields([])
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-lg font-semibold"
                dir="rtl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

