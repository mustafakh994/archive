'use client'

import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Download, FileSpreadsheet, Settings, Eye, CheckCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface FormField {
  id: string
  type: string
  properties: {
    label: string
    placeholder?: string
    required?: boolean
    options?: Array<{ label: string; value: string }>
  }
}

interface FormResponse {
  id: string
  formId: string
  responseData: any
  formVersion: number
  submitterIp: string
  submitterEmail: string
  submittedAt: string
}

interface ExcelExportWizardProps {
  isOpen: boolean
  onClose: () => void
  formName: string
  formFields: FormField[]
  responses: FormResponse[]
  token?: string
}

interface SelectedFields {
  [fieldId: string]: boolean
}

interface MetadataSelection {
  email: boolean
  submittedAt: boolean
  ip: boolean
  version: boolean
}

export default function ExcelExportWizard({
  isOpen,
  onClose,
  formName,
  formFields,
  responses,
  token
}: ExcelExportWizardProps) {
  const [step, setStep] = useState(1)
  const [selectedFields, setSelectedFields] = useState<SelectedFields>({})
  const [metadataSelection, setMetadataSelection] = useState<MetadataSelection>({
    email: true,
    submittedAt: true,
    ip: false,
    version: false
  })
  const [fileName, setFileName] = useState('')
  const [includeEmptyResponses, setIncludeEmptyResponses] = useState(true)
  const [dateFormat, setDateFormat] = useState<'gregorian' | 'iso'>('gregorian')
  const [previewData, setPreviewData] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')

  // Initialize selected fields - all selected by default
  useEffect(() => {
    if (formFields.length > 0 && Object.keys(selectedFields).length === 0) {
      const initialSelection: SelectedFields = {}
      formFields.forEach(field => {
        // Don't select display fields by default
        if (!field.type.startsWith('display_')) {
          initialSelection[field.id] = true
        }
      })
      setSelectedFields(initialSelection)
    }
  }, [formFields])

  // Initialize file name
  useEffect(() => {
    if (!fileName && formName) {
      const timestamp = new Date().toISOString().split('T')[0]
      setFileName(`${formName}_responses_${timestamp}`)
    }
  }, [formName])

  // Generate preview data
  useEffect(() => {
    if (step === 3) {
      generatePreviewData()
    }
  }, [step, selectedFields, metadataSelection])

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }))
  }

  const handleSelectAll = () => {
    const newSelection: SelectedFields = {}
    formFields.forEach(field => {
      if (!field.type.startsWith('display_')) {
        newSelection[field.id] = true
      }
    })
    setSelectedFields(newSelection)
  }

  const handleDeselectAll = () => {
    setSelectedFields({})
  }

  const formatFieldValue = (field: FormField, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return ''
    }

    switch (field.type) {
      case 'checkbox':
        return value ? 'نعم' : 'لا'

      case 'date':
        if (dateFormat === 'iso') {
          return value
        }
        const dateObj = new Date(value)
        return dateObj.toLocaleDateString('ar-SY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })

      case 'dropdown':
      case 'radio_group':
        const option = field.properties.options?.find(opt => opt.value === value || opt.label === value)
        return option?.label || value

      case 'file_upload':
        if (typeof value === 'string' && value.startsWith('http')) {
          return value
        }
        return value || ''

      case 'location':
        if (typeof value === 'object' && value !== null) {
          const { latitude, longitude } = value
          return `${latitude}, ${longitude}`
        }
        return String(value)

      case 'long_text':
        return String(value).replace(/\n/g, ' ')

      default:
        // Handle signatures and other fields
        if (typeof value === 'string' && field.properties.label &&
          (field.properties.label.toLowerCase().includes('signature') ||
            field.properties.label.toLowerCase().includes('توقيع'))) {
          return value.length > 50 ? 'Signature submitted' : value
        }

        if (typeof value === 'object') {
          return JSON.stringify(value)
        }

        return String(value)
    }
  }

  const generatePreviewData = () => {
    const preview = responses.slice(0, 5).map(response => {
      const row: any = {}

      // Add metadata
      if (metadataSelection.email) {
        row['البريد الإلكتروني'] = response.submitterEmail || ''
      }
      if (metadataSelection.submittedAt) {
        const date = new Date(response.submittedAt)
        row['تاريخ الإرسال'] = dateFormat === 'iso'
          ? response.submittedAt
          : date.toLocaleDateString('ar-SY', { dateStyle: 'medium' })
      }
      if (metadataSelection.ip) {
        row['عنوان IP'] = response.submitterIp || ''
      }
      if (metadataSelection.version) {
        row['إصدار القالب'] = `v${response.formVersion}`
      }

      // Add selected fields
      formFields.forEach(field => {
        if (selectedFields[field.id]) {
          const value = response.responseData[field.id]
          row[field.properties.label] = formatFieldValue(field, value)
        }
      })

      return row
    })

    setPreviewData(preview)
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      // Try server-side export first
      await handleServerSideExport()
    } catch (error) {
      console.warn('Server-side export failed, falling back to client-side:', error)
      // Fallback to client-side export
      try {
        await handleClientSideExport()
      } catch (clientError) {
        console.error('Client-side export also failed:', clientError)
        const errorMessage = clientError instanceof Error ? clientError.message : 'يرجى المحاولة مرة أخرى.'
        alert(`فشل التصدير: ${errorMessage}`)
        setExporting(false)
      }
    }
  }

  const handleServerSideExport = async () => {
    // Prepare export request
    const selectedFieldsArray = Object.keys(selectedFields).filter(fieldId => selectedFields[fieldId])

    const exportRequest = {
      formId: responses[0]?.formId, // Get formId from first response
      selectedFields: selectedFieldsArray,
      includeMetadata: {
        email: metadataSelection.email,
        submittedAt: metadataSelection.submittedAt,
        ip: metadataSelection.ip,
        version: metadataSelection.version
      },
      filters: {
        pageSize: responses.length // Export all current responses
      },
      format: "xlsx",
      fileName: fileName,
      dateFormat: dateFormat,
      includeEmptyResponses: includeEmptyResponses
    }

    // Use provided token or get from storage
    const authToken = token || localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!authToken) {
      throw new Error('Authentication token not found')
    }

    // Use server-side export API (external backend)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const response = await fetch(`${apiUrl}/export/formsubmissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(exportRequest)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Export request failed')
    }

    const exportId = result.data.exportId
    setExportStatus('جاري إنشاء الملف...')

    // Poll for export completion
    await pollExportStatus(exportId)
  }

  const handleClientSideExport = async () => {
    setExportStatus('جاري إنشاء الملف محلياً...')

    // Prepare data for export
    const exportData = responses.map(response => {
      const row: any = {}

      // Add metadata
      if (metadataSelection.email) {
        row['البريد الإلكتروني'] = response.submitterEmail || ''
      }
      if (metadataSelection.submittedAt) {
        const date = new Date(response.submittedAt)
        row['تاريخ الإرسال'] = dateFormat === 'iso'
          ? response.submittedAt
          : date.toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
      }
      if (metadataSelection.ip) {
        row['عنوان IP'] = response.submitterIp || ''
      }
      if (metadataSelection.version) {
        row['إصدار القالب'] = `v${response.formVersion}`
      }

      // Add selected fields
      formFields.forEach(field => {
        if (selectedFields[field.id]) {
          const value = response.responseData[field.id]
          row[field.properties.label] = formatFieldValue(field, value)
        }
      })

      // Check if we should include this row
      if (!includeEmptyResponses) {
        const hasData = Object.values(row).some(val => val !== '' && val !== null && val !== undefined)
        if (!hasData) return null
      }

      return row
    }).filter(row => row !== null)

    setExportStatus('جاري التنزيل...')
    setExportProgress(100)

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Set RTL direction for the worksheet
    if (!ws['!cols']) ws['!cols'] = []

    XLSX.utils.book_append_sheet(wb, ws, "Responses")

    // Download file
    XLSX.writeFile(wb, `${fileName}.xlsx`)

    // Close wizard after short delay
    setTimeout(() => {
      setExporting(false)
      setStep(4)
    }, 500)
  }

  const pollExportStatus = async (exportId: string) => {
    const maxAttempts = 30 // 1 minute timeout (30 * 2 seconds)
    let attempts = 0

    const checkStatus = async (): Promise<void> => {
      try {
        const authToken = token || localStorage.getItem('token') || sessionStorage.getItem('token')
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiUrl}/export/status/${exportId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`)
        }

        const status = await response.json()

        if (!status.success) {
          throw new Error(status.message || 'Status check failed')
        }

        const exportStatusData = status.data

        switch (exportStatusData.status) {
          case 'Completed':
            // Download the file
            setExportStatus('جاري التنزيل...')
            setExportProgress(100)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
            window.location.href = `${apiUrl}/export/download/${exportId}`
            setExporting(false)
            setStep(4)
            break

          case 'Failed':
            throw new Error(exportStatusData.errorMessage || 'Export failed on server')

          case 'Cancelled':
            throw new Error('Export was cancelled')

          case 'Processing':
            setExportProgress(exportStatusData.progress || 0)
            setExportStatus(`جاري المعالجة... ${exportStatusData.progress || 0}%`)
            attempts++
            if (attempts >= maxAttempts) {
              throw new Error('Export timeout - please try again')
            }
            // Wait 2 seconds and check again
            setTimeout(checkStatus, 2000)
            break

          default:
            throw new Error(`Unknown export status: ${exportStatusData.status}`)
        }
      } catch (error) {
        console.error('Status check failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'فشل في التحقق من حالة التصدير'
        alert(`فشل في التحقق من حالة التصدير: ${errorMessage}`)
        setExporting(false)
      }
    }

    // Start polling
    checkStatus()
  }

  const selectedFieldsCount = Object.values(selectedFields).filter(Boolean).length
  const metadataCount = Object.values(metadataSelection).filter(Boolean).length
  const totalColumns = selectedFieldsCount + metadataCount

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-green-600" size={28} />
            <h3 className="text-2xl font-bold text-gray-900">تصدير إلى Excel</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((s, idx) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                    {step > s ? <CheckCircle size={20} /> : s}
                  </div>
                  <span className={`text-sm font-medium ${step >= s ? 'text-green-600' : 'text-gray-600'}`}>
                    {s === 1 ? 'اختيار الأعمدة' : s === 2 ? 'الإعدادات' : s === 3 ? 'المعاينة' : 'التنزيل'}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Columns */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">اختر الأعمدة للتصدير</h4>
                <p className="text-base text-gray-600">حدد حقول القالب التي تريد تضمينها في ملف Excel</p>
              </div>

              {/* Metadata Fields */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h5 className="text-lg font-bold text-blue-900 mb-3">البيانات الوصفية</h5>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metadataSelection.email}
                      onChange={(e) => setMetadataSelection(prev => ({ ...prev, email: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-medium text-gray-900">البريد الإلكتروني</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metadataSelection.submittedAt}
                      onChange={(e) => setMetadataSelection(prev => ({ ...prev, submittedAt: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-medium text-gray-900">تاريخ الإرسال</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metadataSelection.ip}
                      onChange={(e) => setMetadataSelection(prev => ({ ...prev, ip: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-medium text-gray-900">عنوان IP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metadataSelection.version}
                      onChange={(e) => setMetadataSelection(prev => ({ ...prev, version: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-medium text-gray-900">إصدار القالب</span>
                  </label>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-lg font-bold text-gray-900">حقول القالب ({selectedFieldsCount} محدد)</h5>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      تحديد الكل
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {formFields.filter(f => !f.type.startsWith('display_')).map(field => (
                    <label key={field.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedFields[field.id] || false}
                        onChange={() => handleFieldToggle(field.id)}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <span className="text-base font-medium text-gray-900">{field.properties.label}</span>
                        <span className="text-sm text-gray-500 mr-2">({field.type})</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-base text-gray-700">
                  <strong>الأعمدة المحددة:</strong> {totalColumns} عمود
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Configure Options */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">إعدادات التصدير</h4>
                <p className="text-base text-gray-600">قم بتخصيص خيارات التصدير</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">اسم الملف</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                    placeholder="اسم الملف"
                  />
                  <p className="text-sm text-gray-500 mt-1">سيتم إضافة .xlsx تلقائياً</p>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-900 mb-2">تنسيق التاريخ</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="gregorian"
                        checked={dateFormat === 'gregorian'}
                        onChange={(e) => setDateFormat('gregorian')}
                        className="w-5 h-5 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-base text-gray-900">ميلادي (01/10/2024)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dateFormat"
                        value="iso"
                        checked={dateFormat === 'iso'}
                        onChange={(e) => setDateFormat('iso')}
                        className="w-5 h-5 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-base text-gray-900">ISO (2024-10-01)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEmptyResponses}
                      onChange={(e) => setIncludeEmptyResponses(e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-base font-medium text-gray-900">تضمين الإجابات الفارغة</span>
                  </label>
                  <p className="text-sm text-gray-500 mr-7">إذا تم إلغاء التحديد، سيتم استبعاد الصفوف التي لا تحتوي على بيانات</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-base text-blue-900">
                  <strong>عدد الإجابات:</strong> {responses.length} إجابة
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">معاينة البيانات</h4>
                <p className="text-base text-gray-600">معاينة أول 5 صفوف من البيانات المصدرة</p>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.length > 0 && Object.keys(previewData[0]).map(header => (
                        <th key={header} className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((value: any, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  هذه معاينة فقط. سيحتوي الملف المصدر على جميع الإجابات البالغ عددها {responses.length}.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Download Complete */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-bold text-gray-900 mb-2">تم التصدير بنجاح!</h4>
                <p className="text-lg text-gray-600">تم تنزيل ملف Excel بنجاح</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-base text-gray-700">
                  <strong>الملف:</strong> {fileName}.xlsx<br />
                  <strong>الصفوف:</strong> {responses.length}<br />
                  <strong>الأعمدة:</strong> {totalColumns}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            {step < 4 && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900"
              >
                إلغاء
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-base font-semibold"
              >
                <ChevronRight size={20} />
                السابق
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && totalColumns === 0}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
                <ChevronLeft size={20} />
              </button>
            )}
            {step === 3 && (
              <div className="flex flex-col items-center gap-3">
                {exporting && (
                  <div className="w-full max-w-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{exportStatus}</span>
                      <span className="text-sm font-medium text-gray-700">{exportProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base font-semibold disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {exportStatus}
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      تصدير إلى Excel
                    </>
                  )}
                </button>
              </div>
            )}
            {step === 4 && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base font-semibold"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


