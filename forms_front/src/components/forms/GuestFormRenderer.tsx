'use client'

import React, { useState } from 'react'
import { Form } from '@/lib/api/client'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface GuestFormRendererProps {
  form: Form
  onSubmit: (responseData: any, submitterEmail?: string) => Promise<boolean>
  isSubmitting?: boolean
}

interface FormField {
  name: string
  type: string
  title: string
  required?: boolean
  options?: string[]
  format?: string
  minimum?: number
  maximum?: number
  maxLength?: number
}

export default function GuestFormRenderer({ form, onSubmit, isSubmitting = false }: GuestFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [documentAttachments, setDocumentAttachments] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  // Parse form schema to extract fields - keep original structure
  const parseFormFields = (): any[] => {
    // Support both old schema format (properties) and new format (fields array)
    if (form.formSchema?.fields && Array.isArray(form.formSchema.fields)) {
      // New format from form builder - return all fields including display elements
      return form.formSchema.fields
    } else if (form.formSchema?.properties) {
      // Old format (JSON Schema)
      const fields: FormField[] = []
      const properties = form.formSchema.properties
      const required = form.formSchema.required || []

      Object.entries(properties).forEach(([name, field]: [string, any]) => {
        fields.push({
          name,
          type: field.type,
          title: field.title || name,
          required: required.includes(name),
          options: field.enum,
          format: field.format,
          minimum: field.minimum,
          maximum: field.maximum,
          maxLength: field.maxLength
        })
      })

      return fields
    }

    return []
  }

  const fields = parseFormFields()

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field: any) => {
      const value = formData[field.id]
      const props = field.properties || {}

      // Check required fields
      if (props.required && (!value || value === '' || value === null || value === undefined)) {
        newErrors[field.id] = `${props.label} مطلوب`
        return
      }

      if (value) {
        // Validate email format
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.id] = 'البريد الإلكتروني غير صحيح'
        }

        // Validate number ranges
        if (field.type === 'number') {
          const numValue = Number(value)
          if (isNaN(numValue)) {
            newErrors[field.id] = 'يجب أن يكون رقم صحيح'
          } else {
            if (props.minValue !== undefined && numValue < props.minValue) {
              newErrors[field.id] = `القيمة يجب أن تكون ${props.minValue} أو أكثر`
            }
            if (props.maxValue !== undefined && numValue > props.maxValue) {
              newErrors[field.id] = `القيمة يجب أن تكون ${props.maxValue} أو أقل`
            }
          }
        }

        // Validate string length
        if ((field.type === 'short_text' || field.type === 'long_text') && props.maxLength && value.length > props.maxLength) {
          newErrors[field.id] = `النص يجب أن يكون ${props.maxLength} حرف أو أقل`
        }
      }
    })

    if (documentAttachments.length === 0) {
      newErrors['documentAttachments'] = 'يجب إرفاق وثيقة واحدة على الأقل'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsValidating(true)

    try {
      const payload = {
        ...formData,
        system_attachments: documentAttachments
      }
      const success = await onSubmit(payload, submitterEmail || undefined)
      if (success) {
        // Reset form on successful submission
        setFormData({})
        setDocumentAttachments([])
        setSubmitterEmail('')
        setErrors({})
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const renderDisplayElement = (field: any) => {
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

  const renderField = (field: any) => {
    const props = field.properties || {}
    const value = formData[field.id] || ''
    const hasError = !!errors[field.id]

    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-black ${hasError ? 'border-red-500' : 'border-gray-300'
      }`

    // Handle display elements (read-only)
    if (field.type.startsWith('display_')) {
      return (
        <div key={field.id} className="mb-6">
          {renderDisplayElement(field)}
        </div>
      )
    }

    switch (field.type) {
      case 'short_text':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={props.placeholder}
              className={baseInputClasses}
              required={props.required}
              maxLength={props.maxLength}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'long_text':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={props.placeholder}
              className={baseInputClasses}
              required={props.required}
              maxLength={props.maxLength || 1000}
              rows={4}
            />
            {props.maxLength && (
              <p className="text-sm text-gray-900 mt-1">
                {value.length}/{props.maxLength} حرف
              </p>
            )}
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'email':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="email"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={props.placeholder}
              className={baseInputClasses}
              required={props.required}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'number':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
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
            {(props.minValue !== undefined || props.maxValue !== undefined) && (
              <p className="text-sm text-gray-900 mt-1">
                {props.minValue !== undefined && props.maxValue !== undefined
                  ? `القيمة بين ${props.minValue} و ${props.maxValue}`
                  : props.minValue !== undefined
                    ? `الحد الأدنى: ${props.minValue}`
                    : `الحد الأقصى: ${props.maxValue}`
                }
              </p>
            )}
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'date':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={baseInputClasses}
              required={props.required}
            />
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'dropdown':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
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
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'radio_group':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <div className="space-y-3">
              {props.options?.map((option: any) => (
                <div key={option.id} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`radio-${field.id}`}
                    id={`radio-${field.id}-${option.id}`}
                    checked={value === option.label}
                    onChange={(e) => e.target.checked && handleInputChange(field.id, option.label)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required={props.required && !value}
                  />
                  <label htmlFor={`radio-${field.id}-${option.id}`} className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-700">{option.label}</span>
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
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'checkbox':
        // Single checkbox
        if (!props.options || props.options.length === 0) {
          return (
            <div key={field.id} className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => handleInputChange(field.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required={props.required}
                />
                <span className="text-sm font-medium text-gray-700" style={{ color: '#374151' }}>
                  {props.label}
                  {props.required && <span className="text-red-500 mr-1">*</span>}
                </span>
              </label>
              {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
            </div>
          )
        }
        // Multiple checkboxes
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
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
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`checkbox-${field.id}-${option.id}`} className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-700">{option.label}</span>
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
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      case 'file_upload':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
              {props.label}
              {props.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Upload to Cloudflare R2
                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append('file', file)
                      uploadFormData.append('submissionId', `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
                      uploadFormData.append('fieldId', field.id)

                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: uploadFormData
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || 'Failed to upload file')
                      }

                      const result = await response.json()
                      console.log('File uploaded to Cloudflare R2:', result)

                      // Store the Cloudflare R2 URL in form data
                      handleInputChange(field.id, result.url)
                    } catch (error) {
                      console.error('Error uploading file:', error)
                      const errorMessage = error instanceof Error ? error.message : 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
                      alert(errorMessage)
                    }
                  }
                }}
                className="hidden"
                id={`file-${field.id}`}
                required={props.required && !value}
                accept={props.acceptedFileTypes?.join(',')}
              />
              <label htmlFor={`file-${field.id}`} className="cursor-pointer">
                <div className="text-gray-900">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {value ? (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      تم رفع الملف بنجاح
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-gray-900">اضغط لاختيار ملف أو اسحبه هنا</p>
                      {props.maxFileSize && (
                        <p className="text-xs text-gray-900 mt-1">الحد الأقصى: {props.maxFileSize} MB</p>
                      )}
                    </>
                  )}
                </div>
              </label>
            </div>
            {hasError && <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Form Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ color: '#111827' }}>{form.title}</h1>
        {form.description && (
          <p className="text-gray-900" style={{ color: '#111827' }}>{form.description}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Render form fields */}
        {fields.map(renderField)}

        {/* Submitter Email (optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: '#374151' }}>
            البريد الإلكتروني (اختياري)
          </label>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            placeholder="your.email@example.com"
          />
          <p className="text-sm text-gray-900 mt-1">
            سيتم استخدام البريد الإلكتروني للتواصل معك حول إجابتك
          </p>
        </div>

        {/* Document Attachments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2" style={{ color: '#374151' }}>
            مرفقات الوثيقة (إلزامي)
            <span className="text-red-500 mr-1">*</span>
          </label>
          <div className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${errors['documentAttachments'] ? 'border-red-500' : 'border-gray-300 hover:border-blue-400'}`}>
            <input
              type="file"
              multiple
              onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  // Upload to Cloudflare R2 or local
                  try {
                    const newAttachments = [...documentAttachments]
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i]
                      const uploadFormData = new FormData()
                      uploadFormData.append('file', file)
                      uploadFormData.append('submissionId', `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
                      uploadFormData.append('fieldId', 'system_attachments')

                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: uploadFormData
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || 'Failed to upload file')
                      }

                      const result = await response.json()
                      newAttachments.push(result.url)
                    }
                    setDocumentAttachments(newAttachments)
                    if (errors['documentAttachments']) {
                      setErrors((prev: Record<string, string>) => ({ ...prev, documentAttachments: '' }))
                    }
                  } catch (error) {
                    console.error('Error uploading file:', error)
                    const errorMessage = error instanceof Error ? error.message : 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
                    alert(errorMessage)
                  }
                }
              }}
              className="hidden"
              id="system-attachments-upload"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
            <label htmlFor="system-attachments-upload" className="cursor-pointer">
              <div className="text-gray-900">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-900">اضغط لاختيار ملفات مستندات أو اسحبها هنا</p>
                <p className="text-xs text-gray-500 mt-1">PDF, الصور, والمستندات</p>
              </div>
            </label>

            {/* List uploaded files */}
            {documentAttachments.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {documentAttachments.map((url: string, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="text-sm text-gray-700 truncate text-left" dir="ltr">
                      {url.split('/').pop() || `Attachment ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        setDocumentAttachments((prev: string[]) => prev.filter((_: string, i: number) => i !== idx));
                      }}
                      className="text-red-500 hover:text-red-700 mx-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors['documentAttachments'] && <p className="text-red-500 text-sm mt-1">{errors['documentAttachments']}</p>}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isValidating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isValidating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send size={16} />
                {form.settings?.submitButtonText || 'إرسال'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}