'use client'

import React, { useEffect, useState } from 'react'
import { useGuestForm } from '@/lib/hooks/useGuestForm'
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react'
import { loadGoogleFont } from '@/lib/utils/arabicGoogleFonts'
import SignaturePad from '@/components/forms/SignaturePad'
import ScannerCaptureDialog from '@/components/forms/ScannerCaptureDialog'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { uploadFormDataWithProgress } from '@/lib/uploadWithProgress'

interface GuestFormViewerProps {
  formCode?: string
  formId?: string
  onSubmissionSuccess?: (submission: any) => void
}

export default function GuestFormViewer({
  formCode,
  formId,
  onSubmissionSuccess
}: GuestFormViewerProps) {
  const {
    form,
    isLoading,
    error,
    isSubmitting,
    submitError,
    isValidating,
    validationError,
    loadForm,
    submitForm,
    validateForm,
    clearErrors
  } = useGuestForm()

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  const [fileUploading, setFileUploading] = useState<Record<string, boolean>>({})
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({})
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [attachmentsUploadPercent, setAttachmentsUploadPercent] = useState(0)
  const [tempSubmissionId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [documentAttachments, setDocumentAttachments] = useState<string[]>([])
  const [attachmentsError, setAttachmentsError] = useState<string>('')

  // Fixed document archiving fields
  const { user } = useAuthStore()
  const [documentNumber, setDocumentNumber] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0])

  const getFormSettings = (currentForm: any): Record<string, any> => {
    if (!currentForm) return {}
    if (currentForm.settings && typeof currentForm.settings === 'object') return currentForm.settings
    if (currentForm.content?.settings && typeof currentForm.content.settings === 'object') return currentForm.content.settings
    return {}
  }

  const formSettings = getFormSettings(form)
  const allowAnonymousSubmissions = (form as any)?.allowAnonymousSubmissions ?? formSettings.allowAnonymousSubmissions ?? true
  const collectSubmitterEmail = formSettings.requestSubmitterEmail ?? formSettings.requireSubmitterEmail ?? formSettings.collectSubmitterEmail ?? formSettings.askForSubmitterEmail ?? false
  const showSubmitterEmailField = collectSubmitterEmail || allowAnonymousSubmissions === false

  useEffect(() => {
    if (formCode) {
      loadForm(formCode, true)
    } else if (formId) {
      loadForm(formId, false)
    }
  }, [formCode, formId, loadForm])

  // Load custom font from Google Fonts if specified
  useEffect(() => {
    if (form) {
      const theme = (form as any).settings?.theme || form.settings?.theme || {}
      const fontFamily = theme.fontFamily

      if (fontFamily) {
        console.log('Loading Google Font:', fontFamily)
        loadGoogleFont(fontFamily)
      }
    }
  }, [form])

  const handleFileUpload = async (fieldId: string, file: File) => {
    setFileUploading(prev => ({ ...prev, [fieldId]: true }))
    setFileUploadProgress(prev => ({ ...prev, [fieldId]: 0 }))

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('submissionId', tempSubmissionId)
      uploadFormData.append('fieldId', fieldId)

      const result = await uploadFormDataWithProgress('/api/upload', uploadFormData, (pct) => {
        setFileUploadProgress(prev => ({ ...prev, [fieldId]: pct }))
      })

      console.log('File saved locally:', result)

      setFileUploadProgress(prev => ({ ...prev, [fieldId]: 100 }))
      const url = typeof result.url === 'string' ? result.url : ''
      handleInputChange(fieldId, url)
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
      alert(errorMessage)
      handleInputChange(fieldId, '')
    } finally {
      setFileUploading(prev => ({ ...prev, [fieldId]: false }))
      setFileUploadProgress(prev => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
    }
  }

  const uploadSystemAttachments = async (files: File[]) => {
    if (!files.length) return

    setAttachmentsUploading(true)
    setAttachmentsUploadPercent(0)
    try {
      const newAttachments = [...documentAttachments]
      const total = files.length
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('submissionId', tempSubmissionId)
        uploadFormData.append('fieldId', 'system_attachments')

        const result = await uploadFormDataWithProgress('/api/upload', uploadFormData, (pct) => {
          const overall = Math.round(((i + pct / 100) / total) * 100)
          setAttachmentsUploadPercent(Math.min(100, overall))
        })

        const url = typeof result.url === 'string' ? result.url : ''
        if (url) newAttachments.push(url)
      }
      setDocumentAttachments(newAttachments)
      setAttachmentsError('')
      setAttachmentsUploadPercent(100)
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
      setAttachmentsError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setAttachmentsUploading(false)
      setAttachmentsUploadPercent(0)
    }
  }

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    clearErrors()
  }

  const handleValidate = async () => {
    if (!form) return

    // Client-side validation for required fields
    const fields = form.formSchema?.fields || []
    const errors: string[] = []

    // Check each field
    fields.forEach((field: any) => {
      const props = field.properties || {}
      if (props.required) {
        const value = formData[field.id]
        const label = props.label || field.id

        // Check if field is empty
        if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
          errors.push(`${label} مطلوب`)
        }
      }
    })

    // Check submitter email
    if (showSubmitterEmailField && submitterEmail && submitterEmail.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      errors.push('البريد الإلكتروني غير صحيح')
    }

    if (documentAttachments.length === 0) {
      errors.push('يجب إرفاق ملف واحد على الأقل للمستند.')
      setAttachmentsError('يرجى إرفاق المستند قبل الإرسال')
    } else {
      setAttachmentsError('')
    }

    if (errors.length > 0) {
      alert('يرجى تعبئة الحقول التالية:\n\n' + errors.join('\n'))
      return
    }

    alert('البيانات صحيحة! يمكنك الآن إرسال الوثيقة.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form) return

    // Client-side validation for required fields before submission
    const fields = form.formSchema?.fields || []
    const errors: string[] = []

    // Check each field
    fields.forEach((field: any) => {
      const props = field.properties || {}
      if (props.required) {
        const value = formData[field.id]
        const label = props.label || field.id

        // Check if field is empty
        if (value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
          errors.push(`${label} مطلوب`)
        }
      }
    })

    // Check submitter email
    if (showSubmitterEmailField && submitterEmail && submitterEmail.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      errors.push('البريد الإلكتروني غير صحيح')
    }

    if (documentAttachments.length === 0) {
      errors.push('يجب إرفاق ملف واحد على الأقل للمستند.')
      setAttachmentsError('يرجى إرفاق المستند قبل الإرسال')
    } else {
      setAttachmentsError('')
    }

    if (errors.length > 0) {
      alert('يرجى تعبئة الحقول التالية:\n\n' + errors.join('\n'))
      return
    }

    // Submit form
    const trimmedEmail = submitterEmail.trim()
    const submitData = {
      ...formData,
      system_documentNumber: documentNumber,
      system_entryDate: entryDate,
      system_userName: user?.name || 'مستخدم غير معروف',
      system_attachments: documentAttachments
    }
    const result = await submitForm(
      submitData,
      showSubmitterEmailField && trimmedEmail !== '' ? trimmedEmail : undefined
    )
    if (result) {
      // Files are already saved locally
      console.log('Form submitted successfully with local file uploads')

      setSubmissionResult(result)
      setShowSuccess(true)
      setFormData({})
      setSubmitterEmail('')
      onSubmissionSuccess?.(result)
    }
  }

  const renderDisplayElement = (field: any, primaryColor: string) => {
    const props = field.properties || {}

    switch (field.type) {
      case 'display_text':
        return (
          <div className="prose max-w-none" dir="rtl">
            <div
              className="text-gray-800 leading-relaxed"
              style={{
                fontSize: props.fontSize || '16px',
                textAlign: props.textAlign || 'right',
                lineHeight: props.lineHeight || '1.6'
              }}
              dangerouslySetInnerHTML={{
                __html: props.label || '<p>محتوى كتلة النص</p>'
              }}
            />
          </div>
        )

      case 'display_image':
        return (
          <div className="space-y-2">
            {props.label && (
              <h3 className="text-lg font-medium text-gray-900 text-center" dir="rtl">
                {props.label}
              </h3>
            )}
            <div className="flex justify-center">
              <img
                src={props.src || props.imageUrl}
                alt={props.placeholder || props.alt || 'Image'}
                className="max-w-full h-auto rounded-lg shadow-sm"
                style={{
                  maxHeight: props.maxHeight || '400px',
                  objectFit: props.objectFit || 'contain'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const errorDiv = document.createElement('div')
                  errorDiv.className = 'text-center p-4 text-gray-500 bg-gray-100 rounded-lg'
                  errorDiv.textContent = 'Image could not be loaded'
                  e.currentTarget.parentNode?.insertBefore(errorDiv, e.currentTarget.nextSibling)
                }}
              />
            </div>
          </div>
        )

      case 'display_video':
        return (
          <div className="space-y-2">
            {props.label && (
              <h3 className="text-lg font-medium text-gray-900 text-center" dir="rtl">
                {props.label}
              </h3>
            )}
            <div className="w-full">
              <video
                src={props.src || props.videoUrl}
                controls
                className="w-full max-w-full rounded-lg shadow-sm"
                style={{
                  maxHeight: props.maxHeight || '400px'
                }}
                poster={props.poster}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-gray-500 italic" dir="rtl">
            Display element type "{field.type}" is not supported
          </div>
        )
    }
  }

  const renderNewFormatField = (field: any, primaryColor: string) => {
    const props = field.properties || {}
    const value = formData[field.id] || ''

    const baseInputClasses = "w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400"
    const focusRingStyle = { '--tw-ring-color': primaryColor } as React.CSSProperties

    switch (field.type) {
      case 'short_text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={props.placeholder}
            className={baseInputClasses}
            style={{ ...focusRingStyle }}
            required={props.required}
            maxLength={props.maxLength}
          />
        )

      case 'long_text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={props.placeholder}
            className={baseInputClasses}
            required={props.required}
            maxLength={props.maxLength || 1000}
            rows={4}
          />
        )

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={props.placeholder}
            className={baseInputClasses}
            required={props.required}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.id, parseFloat(e.target.value) || '')}
            placeholder={props.placeholder}
            className={baseInputClasses}
            required={props.required}
            min={props.minValue}
            max={props.maxValue}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            required={props.required}
          />
        )

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
            required={props.required}
          >
            <option value="">اختر...</option>
            {props.options?.map((option: any) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'radio_group':
        return (
          <div className="space-y-3">
            {props.options?.map((option: any) => (
              <div key={option.id} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`radio-${field.id}`}
                  id={`radio-${field.id}-${option.id}`}
                  checked={value === option.label}
                  onChange={(e) => e.target.checked && handleInputChange(field.id, option.label)}
                  className="h-5 w-5 border-gray-300"
                  style={{ accentColor: primaryColor }}
                  required={props.required && !value}
                />
                <label htmlFor={`radio-${field.id}-${option.id}`} className="flex items-center gap-2 cursor-pointer">
                  <span className="text-base text-gray-700">{option.label}</span>
                  {option.imageUrl && (
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      className="w-12 h-12 object-cover rounded border border-gray-200"
                    />
                  )}
                </label>
              </div>
            ))}
          </div>
        )

      case 'checkbox':
        if (!props.options || props.options.length === 0) {
          return (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                style={{ accentColor: primaryColor }}
                required={props.required}
              />
              <span className="text-base text-gray-900">نعم</span>
            </div>
          )
        }
        return (
          <div className="space-y-3">
            {props.options?.map((option: any) => {
              const isChecked = Array.isArray(value) && value.includes(option.label)
              return (
                <div key={option.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`checkbox-${field.id}-${option.id}`}
                    checked={isChecked}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : []
                      if (e.target.checked) {
                        handleInputChange(field.id, [...currentValue, option.label])
                      } else {
                        handleInputChange(field.id, currentValue.filter((v: string) => v !== option.label))
                      }
                    }}
                    className="h-5 w-5 rounded border-gray-300"
                    style={{ accentColor: primaryColor }}
                  />
                  <label htmlFor={`checkbox-${field.id}-${option.id}`} className="flex items-center gap-2 cursor-pointer">
                    <span className="text-base text-gray-700">{option.label}</span>
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt={option.label}
                        className="w-12 h-12 object-cover rounded border border-gray-200"
                      />
                    )}
                  </label>
                </div>
              )
            })}
          </div>
        )

      case 'file_upload':
        const isUploading = fileUploading[field.id]
        const uploadPct = fileUploadProgress[field.id]
        return (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileUpload(field.id, file)
                }
              }}
              className="hidden"
              id={`file-${field.id}`}
              required={props.required && !value}
              accept={props.acceptedFileTypes?.join(',')}
              disabled={isUploading}
            />
            <label htmlFor={`file-${field.id}`} className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="text-gray-900">
                {isUploading ? (
                  <>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
                    <p className="mt-2 text-base text-blue-600">جاري رفع الملف...</p>
                    <div className="w-full max-w-sm mx-auto mt-4 px-2" dir="ltr">
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-[width] duration-200 ease-out rounded-full"
                          style={{ width: `${uploadPct ?? 0}%` }}
                        />
                      </div>
                      <p className="text-sm text-blue-600 mt-2 font-medium">
                        {uploadPct != null && uploadPct > 0 ? `${uploadPct}%` : 'جاري الإرسال...'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {value ? (
                      <div className="mt-2">
                        <p className="text-base text-green-600 font-medium flex items-center justify-center gap-2">
                          <CheckCircle size={16} />
                          تم رفع الملف بنجاح
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-base text-gray-900">اضغط لاختيار ملف أو اسحبه هنا</p>
                      </>
                    )}
                  </>
                )}
              </div>
            </label>
            </div>
            <div className="flex justify-end">
              <ScannerCaptureDialog
                disabled={isUploading}
                buttonText="مسح مباشر"
                title="مسح مرفق الحقل"
                onSave={async (file) => {
                  await handleFileUpload(field.id, file)
                }}
              />
            </div>
          </div>
        )

      case 'linear_scale':
        const minValue = props.minValue || 1
        const maxValue = props.maxValue || 5
        const minLabel = props.minLabel || ''
        const maxLabel = props.maxLabel || ''

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              {Array.from({ length: maxValue - minValue + 1 }, (_, i) => {
                const scaleValue = minValue + i
                return (
                  <div key={scaleValue} className="flex flex-col items-center">
                    <input
                      type="radio"
                      name={`linear-scale-${field.id}`}
                      id={`scale-${field.id}-${scaleValue}`}
                      checked={value === scaleValue}
                      onChange={(e) => e.target.checked && handleInputChange(field.id, scaleValue)}
                      className="h-5 w-5 border-gray-300"
                      style={{ accentColor: primaryColor }}
                      required={props.required && !value}
                    />
                    <label htmlFor={`scale-${field.id}-${scaleValue}`} className="mt-1 text-sm text-gray-700 cursor-pointer">
                      {scaleValue}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'location':
        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                      }
                      handleInputChange(field.id, locationData)
                    },
                    (error) => {
                      console.error('Geolocation error:', error)
                      alert('فشل في الحصول على الموقع. يرجى التأكد من تفعيل خدمات الموقع.')
                    }
                  )
                } else {
                  alert('المتصفح لا يدعم خدمات الموقع.')
                }
              }}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              disabled={!!value}
            >
              {value ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle size={20} />
                  <span>تم الحصول على الموقع</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>الحصول على الموقع الحالي</span>
                </div>
              )}
            </button>
            {value && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p><strong>خط العرض:</strong> {value.latitude}</p>
                <p><strong>خط الطول:</strong> {value.longitude}</p>
                <p><strong>الدقة:</strong> {value.accuracy} متر</p>
              </div>
            )}
          </div>
        )

      case 'signature':
        return (
          <SignaturePad
            value={value}
            onChange={(signatureData) => handleInputChange(field.id, signatureData)}
            required={props.required}
            label=""
            penColor={props.penColor || '#000000'}
            backgroundColor={props.backgroundColor || '#ffffff'}
            width={props.width || 500}
            height={props.height || 200}
            placeholder={props.placeholder || 'ارسم توقيعك هنا'}
          />
        )

      case 'display_text':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: props.content || 'نص العرض'
                }}
              />
            </div>
          </div>
        )

      case 'display_image':
        return (
          <div className="text-center">
            {props.src ? (
              <img
                src={props.src}
                alt={props.alt || 'صورة'}
                className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">لم يتم تحديد صورة</p>
              </div>
            )}
          </div>
        )

      case 'display_video':
        return (
          <div className="text-center">
            {props.src ? (
              <video
                src={props.src}
                controls
                className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
                style={{ maxHeight: '400px' }}
              >
                المتصفح لا يدعم تشغيل الفيديو
              </video>
            ) : (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">لم يتم تحديد فيديو</p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={baseInputClasses}
          />
        )
    }
  }

  const renderFormField = (fieldName: string, fieldSchema: any) => {
    const { type, title, enum: enumValues, minimum, maximum, maxLength } = fieldSchema
    const value = formData[fieldName] || ''

    switch (type) {
      case 'string':
        if (enumValues) {
          return (
            <select
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required={form?.formSchema?.required?.includes(fieldName)}
            >
              <option value="">اختر...</option>
              {enumValues.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        }

        if (fieldSchema.format === 'email') {
          return (
            <input
              type="email"
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              required={form?.formSchema?.required?.includes(fieldName)}
              maxLength={maxLength}
            />
          )
        }

        if (maxLength && maxLength > 100) {
          return (
            <textarea
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              rows={4}
              required={form?.formSchema?.required?.includes(fieldName)}
              maxLength={maxLength}
            />
          )
        }

        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            required={form?.formSchema?.required?.includes(fieldName)}
            maxLength={maxLength}
          />
        )

      case 'integer':
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldName, parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required={form?.formSchema?.required?.includes(fieldName)}
            min={minimum}
            max={maximum}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(fieldName, e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-base text-gray-900">نعم</span>
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            required={form?.formSchema?.required?.includes(fieldName)}
          />
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-900">جاري تحميل القالب...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <h3 className="font-medium">خطأ في تحميل القالب</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    )
  }

  if (showSuccess && submissionResult) {
    // Format date in Georgian (Gregorian) calendar
    const submissionDate = new Date(submissionResult.submittedAt)
    const formattedDate = submissionDate.toLocaleDateString('ar-SY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const formattedTime = submissionDate.toLocaleTimeString('ar-SY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-green-800 mb-4">
          <CheckCircle size={20} />
          <h3 className="font-medium">تم إرسال الوثيقة بنجاح!</h3>
        </div>
        <div className="text-green-700 space-y-2">
          <p><strong>رقم الإرسال:</strong> {submissionResult.id}</p>
          <p><strong>تاريخ الإرسال:</strong> {formattedDate} {formattedTime}</p>
          {submissionResult.formName && (
            <p><strong>اسم القالب:</strong> {submissionResult.formName}</p>
          )}
        </div>
        <button
          onClick={() => {
            setShowSuccess(false)
            setSubmissionResult(null)
          }}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          إرسال وثيقة أخرى
        </button>
      </div>
    )
  }

  if (!form && !isLoading && !error) {
    // Still initializing, don't show anything yet
    return null
  }

  if (!form && !isLoading && error) {
    // Loaded but form not found
    return (
      <div className="text-center py-12">
        <p className="text-gray-900">لم يتم العثور على القالب</p>
      </div>
    )
  }

  if (!form) {
    // Form is null but we're still loading or in some other state
    return null
  }

  // Check if form is Active before allowing submissions
  // Only check status field - if it's 'Active', allow access
  const formContent = form.content as any
  const formStatus = (form as any).status || formContent?.status
  const isFormActive = formStatus === 'Active'

  if (!isFormActive) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center" style={{ color: '#111827' }} dir="rtl">{form.title}</h1>
          {form.description && (
            <p className="text-lg text-gray-700 text-center leading-relaxed" style={{ color: '#374151' }} dir="rtl">{form.description}</p>
          )}
        </div>

        {/* Form Not Active Message */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="w-16 h-16 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-xl font-bold text-orange-900 mb-2" dir="rtl">
                هذا القالب غير متاح حالياً
              </h3>
              <p className="text-lg text-orange-800" dir="rtl">
                {formStatus === 'Draft'
                  ? 'القالب في وضع المسودة ولا يقبل إجابات في الوقت الحالي.'
                  : formStatus === 'Inactive'
                    ? 'القالب معطل مؤقتاً ولا يقبل إجابات جديدة.'
                    : 'القالب غير نشط حالياً.'}
              </p>
              <p className="text-base text-orange-700 mt-3" dir="rtl">
                يرجى التواصل مع مدير القالب للمزيد من المعلومات.
              </p>
            </div>
            <div className="mt-4 bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-gray-700" dir="rtl">
                <strong>حالة القالب:</strong>{' '}
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${formStatus === 'Active' ? 'bg-green-100 text-green-800' :
                  formStatus === 'Inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                  {formStatus === 'Active' ? 'نشط' : formStatus === 'Inactive' ? 'غير نشط' : 'مسودة'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Extract theme settings
  const theme = (form as any).settings?.theme || form.settings?.theme || {}
  const backgroundColor = theme.backgroundColor || '#F3F4F6'
  const primaryColor = theme.primaryColor || '#7C3AED'
  const fontFamily = theme.fontFamily || 'Inter'
  const logoUrl = theme.logoUrl
  const backgroundImageUrl = theme.backgroundImageUrl
  const cardStyleSetting = theme.cardStyle ?? 'solid'
  const cardBackgroundColor = theme.cardBackgroundColor || 'rgba(255,255,255,0.9)'
  const cardBorderColor = theme.cardBorderColor || '#e5e7eb'
  const backdropBlurEnabled = theme.cardBackdropBlur ?? true
  const backgroundStyle: React.CSSProperties = {
    backgroundColor,
    ...(backgroundImageUrl
      ? {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
      : {})
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: cardStyleSetting === 'transparent' ? 'transparent' : cardBackgroundColor,
    borderColor: cardBorderColor,
    ...(backdropBlurEnabled ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } : {}),
  }
  const cardClasses = `w-full max-w-3xl mx-auto rounded-2xl shadow-lg border border-gray-200/70 ${backdropBlurEnabled ? 'backdrop-blur-md' : ''
    }`

  return (
    <div
      className="min-h-screen py-8 md:py-12 px-4 md:px-8 flex items-start md:items-center justify-center"
      style={{ ...backgroundStyle, fontFamily }}
    >
      <div className={`${cardClasses} bg-white/85`} style={{ ...cardStyle, fontFamily }}>
        <div className="px-5 sm:px-8 md:px-10 py-6 sm:py-8">
          {/* Logo */}
          {logoUrl && (
            <div className="mb-5 flex justify-center">
              <img
                src={logoUrl}
                alt="Form Logo"
                className="max-w-xs max-h-32 object-contain"
              />
            </div>
          )}

          <div className="mb-6 text-center space-y-2">
            <h1 className="text-3xl font-bold sm:text-[2.1rem] text-gray-900" dir="rtl">{form.title}</h1>
            {form.description && (
              <p className="text-lg text-gray-700 leading-relaxed" dir="rtl">{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" style={{ fontFamily }}>
            {/* Fixed Archiving Fields */}
            <div className={`w-full rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6`} style={{ backgroundColor: '#ffffff' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2" dir="rtl">
                    رقم الوثيقة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2" dir="rtl">
                    تاريخ الإدخال <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2" dir="rtl">
                    اسم الموظف (المدخل) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            {form.formSchema?.fields && Array.isArray(form.formSchema.fields) ? (
              // New format: fields array from form builder
              form.formSchema.fields.map((field: any) => {
                const props = field.properties || {}
                const containerStyleSetting = props.containerStyle ?? 'solid'
                const containerBackgroundColor = props.containerBackgroundColor || '#ffffff'
                const containerStyle: React.CSSProperties =
                  containerStyleSetting === 'transparent'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: containerBackgroundColor }
                const borderClasses = containerStyleSetting === 'transparent'
                  ? 'border border-dashed border-gray-300'
                  : 'border border-gray-200'

                const questionBackgroundStyle: React.CSSProperties = {}
                if (props.questionBackgroundColor) {
                  questionBackgroundStyle.backgroundColor = props.questionBackgroundColor
                }
                if (props.questionBackgroundImageUrl) {
                  questionBackgroundStyle.backgroundImage = `url(${props.questionBackgroundImageUrl})`
                  questionBackgroundStyle.backgroundSize = 'cover'
                  questionBackgroundStyle.backgroundPosition = 'center'
                  questionBackgroundStyle.backgroundRepeat = 'no-repeat'
                }

                let content: React.ReactNode

                // Handle display elements (read-only)
                if (field.type.startsWith('display_')) {
                  content = renderDisplayElement(field, primaryColor)
                  const questionWrapped = Object.keys(questionBackgroundStyle).length > 0 ? (
                    <div className="rounded-lg p-4" style={questionBackgroundStyle}>
                      {content}
                    </div>
                  ) : content

                  return (
                    <div
                      key={field.id}
                      className={`w-full rounded-2xl shadow-sm ${borderClasses} p-5 sm:p-6 transition-shadow hover:shadow-md`}
                      style={containerStyle}
                    >
                      {questionWrapped}
                    </div>
                  )
                }

                // Handle regular form fields
                content = (
                  <>
                    <label className="block text-lg font-semibold text-gray-800 mb-3" dir="rtl">
                      {props.label || 'Untitled Field'}
                      {props.required && (
                        <span className="text-red-500 ml-2 text-xl">*</span>
                      )}
                    </label>
                    {renderNewFormatField(field, primaryColor)}
                  </>
                )

                const questionWrapped = Object.keys(questionBackgroundStyle).length > 0 ? (
                  <div className="rounded-lg p-3.5" style={questionBackgroundStyle}>
                    {content}
                  </div>
                ) : content

                return (
                  <div
                    key={field.id}
                    className={`w-full rounded-xl shadow-sm ${borderClasses} p-4 sm:p-5 transition-shadow hover:shadow-md`}
                    style={containerStyle}
                  >
                    {questionWrapped}
                  </div>
                )
              })
            ) : form.formSchema?.properties ? (
              // Old format: properties object
              Object.entries(form.formSchema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
                <div key={fieldName} className="w-full bg-gray-50/70 rounded-xl p-4 sm:p-5 border border-gray-100">
                  <label className="block text-lg font-semibold text-gray-800 mb-3" style={{ color: '#1f2937' }} dir="rtl">
                    {fieldSchema.title || fieldName}
                    {form.formSchema?.required?.includes(fieldName) && (
                      <span className="text-red-500 ml-2 text-xl">*</span>
                    )}
                  </label>
                  {renderFormField(fieldName, fieldSchema)}
                </div>
              ))
            ) : null}

            {/* Document Attachments */}
            <div className={`bg-white/90 rounded-xl p-4 sm:p-5 shadow-sm border ${attachmentsError ? 'border-red-500' : 'border-gray-200'}`}>
              <label className="block text-lg font-semibold text-gray-800 mb-3" dir="rtl">
                مرفقات الوثيقة (إلزامي)
                <span className="text-red-500 ml-2 text-xl">*</span>
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${attachmentsError ? 'border-red-500' : 'border-gray-300 hover:border-blue-400'}`}>
                <input
                  type="file"
                  multiple
                  onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      try {
                        await uploadSystemAttachments(Array.from(files))
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
                        alert(errorMessage)
                      } finally {
                        e.target.value = ''
                      }
                    }
                  }}
                  className="hidden"
                  id="system-attachments-upload"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  disabled={attachmentsUploading}
                />
                <label
                  htmlFor="system-attachments-upload"
                  className={attachmentsUploading ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'cursor-pointer'}
                >
                  <div className="text-gray-900">
                    {attachmentsUploading ? (
                      <>
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
                        <p className="mt-2 text-base text-blue-600">جاري رفع المرفقات...</p>
                        <div className="w-full max-w-sm mx-auto mt-4 px-2" dir="ltr">
                          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-[width] duration-200 ease-out rounded-full"
                              style={{ width: `${attachmentsUploadPercent}%` }}
                            />
                          </div>
                          <p className="text-sm text-blue-600 mt-2 font-medium">{attachmentsUploadPercent}%</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-base text-gray-900">اضغط لاختيار ملفات مستندات أو اسحبها هنا</p>
                        <p className="text-sm text-gray-500 mt-1">PDF, الصور, والمستندات</p>
                      </>
                    )}
                  </div>
                </label>
                <div className="mt-4 flex justify-end">
                  <ScannerCaptureDialog
                    disabled={attachmentsUploading}
                    onSave={async (file) => {
                      await uploadSystemAttachments([file])
                    }}
                  />
                </div>

                {/* List uploaded files */}
                {documentAttachments.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3">
                    {documentAttachments.map((url: string, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700 truncate text-left" dir="ltr">
                          {url.split('/').pop() || `Attachment ${idx + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setDocumentAttachments((prev: string[]) => prev.filter((_: string, i: number) => i !== idx));
                          }}
                          className="text-red-500 hover:text-red-700 mx-2 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {attachmentsError && <p className="text-red-500 text-sm mt-2 font-medium">{attachmentsError}</p>}
            </div>

            {/* Submitter Email */}
            {showSubmitterEmailField && (
              <div className="bg-white/90 rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm">
                <label className="block text-lg font-semibold text-gray-800 mb-3" dir="rtl">
                  البريد الإلكتروني <span className="text-sm font-normal text-gray-500">(اختياري)</span>
                </label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400"
                  placeholder="your@email.com"
                  dir="ltr"
                />
                <p className="text-sm text-gray-600 mt-2" dir="rtl">
                  يمكنك ترك الحقل فارغاً إذا كنت لا ترغب في تلقي تأكيد عبر البريد الإلكتروني.
                </p>
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">خطأ في التحقق</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{validationError}</p>
              </div>
            )}

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">خطأ في الإرسال</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{submitError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4 pt-2 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className="px-6 py-3 text-lg font-semibold border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 sm:w-auto sm:min-w-[210px]"
                dir="rtl"
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'التحقق من البيانات'
                )}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isValidating}
                className="w-full sm:flex-1 flex items-center justify-center gap-3 px-6 py-3 text-lg font-semibold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  backgroundColor: primaryColor,
                  borderColor: primaryColor
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && !isValidating) {
                    e.currentTarget.style.opacity = '0.9'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                dir="rtl"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send size={20} />
                    {(form as any).settings?.submitButtonText || form.settings?.submitButtonText || 'إرسال الوثيقة'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}