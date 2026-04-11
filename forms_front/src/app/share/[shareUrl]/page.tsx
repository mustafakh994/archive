'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/lib/store/useFormStore'

interface FormResponse {
  formId: string
  title: string
  description: string
  userId: string
  fields: FormField[]
  settings?: {
    theme?: {
      backgroundColor?: string
      backgroundImageUrl?: string
      primaryColor?: string
      fontFamily?: string
      logoUrl?: string
      cardStyle?: 'solid' | 'transparent'
      cardBackgroundColor?: string
      cardBorderColor?: string
      cardBackdropBlur?: boolean
    }
    [key: string]: any
  }
  theme?: {
    backgroundColor?: string
    backgroundImageUrl?: string
    primaryColor?: string
    fontFamily?: string
    logoUrl?: string
    cardStyle?: 'solid' | 'transparent'
    cardBackgroundColor?: string
    cardBorderColor?: string
    cardBackdropBlur?: boolean
  }
}

interface SharePageProps {
  params: Promise<{
    shareUrl: string
  }>
}

export default function SharePage({ params }: SharePageProps) {
  const [form, setForm] = useState<FormResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)

  const normalizeFormResponse = (rawForm: any): FormResponse => {
    if (!rawForm) {
      return {
        formId: '',
        title: '',
        description: '',
        userId: '',
        fields: [],
        settings: {},
        theme: {},
      }
    }

    let content = rawForm.content
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content)
      } catch (error) {
        console.warn('Failed to parse form content:', error)
        content = undefined
      }
    }

    let formSchema = rawForm.formSchema ?? content?.formSchema
    if (typeof formSchema === 'string') {
      try {
        formSchema = JSON.parse(formSchema)
      } catch (error) {
        console.warn('Failed to parse form schema:', error)
        formSchema = { fields: [] }
      }
    }

    let settings = rawForm.settings ?? content?.settings ?? {}
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings)
      } catch (error) {
        console.warn('Failed to parse form settings:', error)
        settings = {}
      }
    }

    const rawFields = Array.isArray(formSchema?.fields) ? formSchema.fields : []
    const normalizedFields: FormField[] = rawFields.map((field: any) => ({
      id: field.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: field.type || 'short_text',
      properties: {
        label: field.properties?.label || 'حقل بدون عنوان',
        placeholder: field.properties?.placeholder || '',
        required: field.properties?.required || false,
        options: field.properties?.options || [],
        validation: field.properties?.validation,
        ...field.properties,
      },
    }))

    const theme =
      settings?.theme ||
      rawForm.theme ||
      content?.settings?.theme ||
      {}

    return {
      formId: rawForm.id,
      title: rawForm.title,
      description: rawForm.description || content?.description || '',
      userId: rawForm.userId || rawForm.createdBy || '',
      fields: normalizedFields,
      settings,
      theme,
    }
  }

  const extractTheme = (formData: FormResponse | null) => {
    if (!formData) return {}
    const themeFromTopLevel = formData.theme ?? (formData as any)?.Theme
    if (themeFromTopLevel) return themeFromTopLevel
    const settings = formData.settings ?? (formData as any)?.settings ?? (formData as any)?.content?.settings
    if (settings && 'theme' in settings) {
      return (settings as any).theme ?? {}
    }
    return {}
  }

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const { shareUrl } = await params

        // Try platform share API first (handles Prisma-stored forms by shareUrl)
        try {
          const shareResponse = await fetch(`/api/forms/share/${shareUrl}`)
          if (shareResponse.ok) {
            const sharePayload = await shareResponse.json()
            const rawForm = sharePayload?.data?.form || sharePayload?.form
            if (rawForm) {
              setForm(normalizeFormResponse(rawForm))
              return
            }
          }
        } catch (shareError) {
          console.warn('Share API lookup failed, falling back to preview API:', shareError)
        }

        // Fallback to ASP.NET preview API (requires form code)
        const response = await fetch(`/api/forms/code/${shareUrl}/preview`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Form not found' }))
          throw new Error(errorData.message || 'Form not found or no longer available')
        }

        const previewResult = await response.json()

        if (!previewResult?.success || !previewResult?.data) {
          throw new Error(previewResult?.message || 'Form not found or no longer available')
        }

        setForm(normalizeFormResponse(previewResult.data))
      } catch (err) {
        console.error('Failed to load shared form:', err)
        setError('Form not found or no longer available')
      } finally {
        setLoading(false)
      }
    }

    fetchForm()
  }, [params])

  const theme = extractTheme(form)

  const backgroundStyles = {
    backgroundColor: theme.backgroundColor || '#F3F4F6',
    backgroundImage: theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form) return

    try {
      const response = await fetch(`/api/forms/${form.formId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form.formId,
          responses,
          submittedAt: new Date().toISOString()
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        throw new Error('Failed to submit response')
      }
    } catch (err) {
      console.error('Error submitting response:', err)
      alert('فشل في إرسال الرد. يرجى المحاولة مرة أخرى.')
    }
  }

  const renderField = (field: FormField) => {
    const fieldId = field.id
    const value = responses[fieldId]

    switch (field.type) {
      case 'short_text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              placeholder={field.properties.placeholder || 'أدخل إجابتك'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
            />
          </div>
        )

      case 'long_text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              placeholder={field.properties.placeholder || 'أدخل إجابتك'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
            />
          </div>
        )

      case 'email':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="email"
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              placeholder={field.properties.placeholder || 'أدخل بريدك الإلكتروني'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              placeholder={field.properties.placeholder || 'أدخل رقماً'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
            />
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
              aria-label={field.properties.label}
            />
          </div>
        )

      case 'radio_group':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.properties.options?.map((option) => (
                <div key={option.id} className="flex items-start gap-3 rtl-flex-row-reverse">
                  <input
                    type="radio"
                    name={`radio-${fieldId}`}
                    id={`radio-${fieldId}-${option.id}`}
                    value={option.id}
                    checked={value === option.id}
                    onChange={(e) => handleInputChange(fieldId, e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required={field.properties.required}
                    aria-label={option.label}
                  />
                  <div className="flex items-center gap-2 rtl-flex-row-reverse">
                    <span className="text-sm text-gray-700">{option.label}</span>
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt={option.label}
                        className="w-8 h-8 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
            </label>
            <div className="space-y-2">
              {field.properties.options?.map((option) => (
                <div key={option.id} className="flex items-start gap-3 rtl-flex-row-reverse">
                  <input
                    type="checkbox"
                    id={`checkbox-${fieldId}-${option.id}`}
                    value={option.id}
                    checked={value?.includes(option.id) || false}
                    onChange={(e) => {
                      const currentValues = value || []
                      const newValues = e.target.checked
                        ? [...currentValues, option.id]
                        : currentValues.filter((v: string) => v !== option.id)
                      handleInputChange(fieldId, newValues)
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={option.label}
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'dropdown':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(fieldId, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.properties.required}
              aria-label={field.properties.label}
            >
              <option value="">اختر خياراً</option>
              {field.properties.options?.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'linear_scale':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {field.properties.label}
              {field.properties.required && <span className="text-red-500 mr-1">*</span>}
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map((scaleValue) => (
                  <input
                    key={scaleValue}
                    type="radio"
                    name={`scale-${fieldId}`}
                    value={scaleValue}
                    checked={value === scaleValue}
                    onChange={(e) => handleInputChange(fieldId, parseInt(e.target.value))}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    required={field.properties.required}
                    aria-label={`${field.properties.label} - ${scaleValue}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>أوافق بشدة</span>
                <span>أوافق بشدة</span>
              </div>
            </div>
          </div>
        )

      case 'display_text':
        return (
          <div className="space-y-2">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: field.properties.label || '<p>محتوى كتلة النص</p>'
              }}
            />
          </div>
        )

      case 'display_image':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <img
                src={field.properties.label || 'https://via.placeholder.com/400x200?text=صورة'}
                alt="صورة عرض"
                className="max-w-full h-auto rounded-lg"
                style={{ maxHeight: '300px' }}
              />
              {field.properties.placeholder && (
                <p className="text-sm text-gray-600 mt-2">{field.properties.placeholder}</p>
              )}
            </div>
          </div>
        )

      case 'display_video':
        return (
          <div className="space-y-2">
            <div className="text-center">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm">تضمين فيديو</p>
                </div>
              </div>
              {field.properties.placeholder && (
                <p className="text-sm text-gray-600 mt-2">{field.properties.placeholder}</p>
              )}
            </div>
          </div>
        )

      default:
        return <div>نوع حقل غير معروف: {field.type}</div>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل القالب...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">الوثيقة غير متوفرة</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">تم إرسال ردك بنجاح!</h1>
          <p className="text-gray-600">شكراً لك على المشاركة</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">الوثيقة غير متوفرة</h1>
          <p className="text-gray-600">لم يتم العثور على القالب أو الوثيقة المطلوبة</p>
        </div>
      </div>
    )
  }

  const { backgroundColor, backgroundImageUrl, primaryColor, fontFamily, logoUrl } = theme || {}
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: backgroundColor,
    ...(backgroundImageUrl && {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    })
  }

  const cardStyleSetting = theme.cardStyle ?? 'solid'
  const cardBackgroundColorDerived = theme.cardBackgroundColor || 'rgba(255,255,255,0.9)'
  const cardBorderColorDerived = theme.cardBorderColor || '#e5e7eb'
  const cardBackdropBlur = theme.cardBackdropBlur ?? true
  const cardStyle: React.CSSProperties = {
    backgroundColor: cardStyleSetting === 'transparent' ? 'transparent' : cardBackgroundColorDerived,
    borderColor: cardBorderColorDerived,
    ...(cardBackdropBlur ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
  }
  const cardClasses = `rounded-lg shadow-sm border p-8 ${cardBackdropBlur ? 'backdrop-blur-sm' : ''}`

  return (
    <div className="min-h-screen py-8" style={backgroundStyle}>
      <div className="max-w-2xl mx-auto px-4">
        <div className={cardClasses} style={cardStyle}>
          {/* Form Header */}
          <div className="mb-8 text-center">
            {logoUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={logoUrl}
                  alt="شعار الوثيقة"
                  className="max-h-16 max-w-48 object-contain"
                />
              </div>
            )}
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field, index) => {
              const containerStyleSetting = field.properties.containerStyle ?? 'solid'
              const containerBackgroundColor = field.properties.containerBackgroundColor || '#ffffff'
              const containerStyle: React.CSSProperties =
                containerStyleSetting === 'transparent'
                  ? { backgroundColor: 'transparent' }
                  : { backgroundColor: containerBackgroundColor }
              const borderClasses = containerStyleSetting === 'transparent'
                ? 'border border-dashed border-gray-300'
                : 'border border-gray-200'

              const questionBackgroundStyle: React.CSSProperties = {}
              if (field.properties.questionBackgroundColor) {
                questionBackgroundStyle.backgroundColor = field.properties.questionBackgroundColor
              }
              if (field.properties.questionBackgroundImageUrl) {
                questionBackgroundStyle.backgroundImage = `url(${field.properties.questionBackgroundImageUrl})`
                questionBackgroundStyle.backgroundSize = 'cover'
                questionBackgroundStyle.backgroundPosition = 'center'
                questionBackgroundStyle.backgroundRepeat = 'no-repeat'
              }
              const hasQuestionBackground = Object.keys(questionBackgroundStyle).length > 0
              const fieldNode = renderField(field)
              const questionWrapped = hasQuestionBackground ? (
                <div className="rounded-lg p-4" style={questionBackgroundStyle}>
                  {fieldNode}
                </div>
              ) : fieldNode

              return (
                <div
                  key={field.id}
                  className={`rounded-lg p-4 ${borderClasses}`}
                  style={containerStyle}
                >
                  {questionWrapped}
                </div>
              )
            })}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                إرسال الرد
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 