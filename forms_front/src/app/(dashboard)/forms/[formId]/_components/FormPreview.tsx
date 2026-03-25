'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useFormStore, FormField } from '@/lib/store/useFormStore'
import { useSubmissionStore } from '@/lib/store/useSubmissionStore'
import { X, Eye, Send, RotateCcw } from 'lucide-react'
import { loadGoogleFont } from '@/lib/utils/arabicGoogleFonts'
import { SubmitFormData } from '@/lib/api/client'

interface FormPreviewProps {
    isOpen: boolean
    onClose: () => void
    enableApiTesting?: boolean
}

export default function FormPreview({ isOpen, onClose, enableApiTesting = false }: FormPreviewProps) {
    const { form } = useFormStore()
    const { submitForm, isLoading: submissionLoading } = useSubmissionStore()
    const [responses, setResponses] = useState<Record<string, any>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())
    const [submitterEmail, setSubmitterEmail] = useState('')
    const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null)
    const [submissionError, setSubmissionError] = useState<string | null>(null)
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

    // Cleanup timers when modal closes
    useEffect(() => {
        if (!isOpen) {
            Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer))
            debounceTimers.current = {}
        }
    }, [isOpen])

    // Load the selected font when form opens or font changes
    useEffect(() => {
        if (isOpen && form.theme?.fontFamily) {
            loadGoogleFont(form.theme.fontFamily)
        }
    }, [isOpen, form.theme?.fontFamily])

    const backgroundStyles = {
        backgroundColor: form.theme?.backgroundColor || '#F3F4F6',
        backgroundImage: form.theme?.backgroundImageUrl ? `url(${form.theme.backgroundImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: form.theme?.fontFamily || 'Cairo',
    }

    const cardStyleSetting = form.theme?.cardStyle ?? 'solid'
    const cardBackgroundColor = form.theme?.cardBackgroundColor || 'rgba(255,255,255,0.9)'
    const cardBorderColor = form.theme?.cardBorderColor || '#e5e7eb'
    const cardBackdropBlur = form.theme?.cardBackdropBlur ?? true
    const cardStyle: React.CSSProperties = {
        backgroundColor: cardStyleSetting === 'transparent' ? 'transparent' : cardBackgroundColor,
        borderColor: cardBorderColor,
        ...(cardBackdropBlur ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
    }
    const cardClasses = `shadow-sm border ${cardBackdropBlur ? 'backdrop-blur-sm' : ''}`

    // Validation function
    const validateField = (field: FormField, value: any, isRealTime: boolean = false): string | null => {
        if (!field.properties.validation) return null

        const { validation } = field.properties
        const stringValue = String(value || '')

        // For real-time validation, only show errors if user has entered something or field is required
        if (isRealTime && !stringValue && !field.properties.required) return null

        // Required validation
        if (field.properties.required && !stringValue) {
            return 'هذا الحقل مطلوب'
        }

        // Regex validation
        if (validation.rule === 'regex' && validation.pattern && stringValue) {
            try {
                const regex = new RegExp(validation.pattern)
                if (!regex.test(stringValue)) {
                    return validation.errorMessage || 'القيمة المدخلة غير صحيحة'
                }
            } catch (error) {
                console.error('Invalid regex pattern:', validation.pattern)
                return 'خطأ في نمط التحقق'
            }
        }

        // Email validation
        if (validation.rule === 'email' && stringValue) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            if (!emailRegex.test(stringValue)) {
                return validation.errorMessage || 'يرجى إدخال بريد إلكتروني صحيح'
            }
        }

        // URL validation
        if (validation.rule === 'url' && stringValue) {
            const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
            if (!urlRegex.test(stringValue)) {
                return validation.errorMessage || 'يرجى إدخال رابط صحيح'
            }
        }

        // Min/Max validation for numbers
        if ((validation.rule === 'min' || validation.rule === 'max') && stringValue) {
            const numValue = parseFloat(stringValue)
            if (isNaN(numValue)) {
                return 'يرجى إدخال رقم صحيح'
            }

            if (validation.rule === 'min' && validation.minValue !== undefined && numValue < validation.minValue) {
                return validation.errorMessage || `القيمة يجب أن تكون أكبر من أو تساوي ${validation.minValue}`
            }

            if (validation.rule === 'max' && validation.maxValue !== undefined && numValue > validation.maxValue) {
                return validation.errorMessage || `القيمة يجب أن تكون أقل من أو تساوي ${validation.maxValue}`
            }
        }

        // Location validation
        if (field.type === 'location' && field.properties.required && !value) {
            return 'يرجى تحديد الموقع'
        }

        return null
    }

    // Debounced validation function
    const debouncedValidation = useCallback((fieldId: string, value: any) => {
        // Clear existing timer for this field
        if (debounceTimers.current[fieldId]) {
            clearTimeout(debounceTimers.current[fieldId])
        }

        // Add field to validating state
        setValidatingFields(prev => new Set(prev).add(fieldId))

        // Set new timer
        debounceTimers.current[fieldId] = setTimeout(() => {
            const field = form.fields.find(f => f.id === fieldId)
            if (field) {
                const error = validateField(field, value, true)
                setValidationErrors(prev => ({
                    ...prev,
                    [fieldId]: error || ''
                }))
            }
            // Remove from validating state
            setValidatingFields(prev => {
                const newSet = new Set(prev)
                newSet.delete(fieldId)
                return newSet
            })
        }, 300) // 300ms delay
    }, [form.fields])

    // Early return after all hooks
    if (!isOpen) return null

    const handleInputChange = (fieldId: string, value: any) => {
        setResponses(prev => ({
            ...prev,
            [fieldId]: value
        }))

        // Clear validation error immediately when user starts typing
        if (validationErrors[fieldId]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[fieldId]
                return newErrors
            })
        }

        // Debounced real-time validation
        debouncedValidation(fieldId, value)
    }

    const handleInputBlur = (field: FormField) => {
        const value = responses[field.id]
        const error = validateField(field, value, false) // Stricter validation on blur

        setValidationErrors(prev => ({
            ...prev,
            [field.id]: error || ''
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (enableApiTesting && form.formId && form.formId !== 'clx123abc456') {
            // API submission mode
            const trimmedEmail = submitterEmail.trim()

            if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                setSubmissionError('يرجى إدخال بريد إلكتروني صحيح')
                return
            }

            try {
                const payload: SubmitFormData = {
                    responseData: responses,
                    ...(trimmedEmail ? { submitterEmail: trimmedEmail } : {}),
                }

                const result = await submitForm(form.formId, payload)

                if (result.success && result.submissionId) {
                    setSubmissionSuccess(result.submissionId)
                    setSubmissionError(null)
                } else {
                    setSubmissionError(result.error || 'Failed to submit form')
                }
            } catch (error) {
                setSubmissionError(error instanceof Error ? error.message : 'Submission failed')
            }
        } else {
            // Preview mode - just reset
            resetForm()
        }
    }

    const resetForm = () => {
        setResponses({})
        setValidationErrors({})
        setSubmitterEmail('')
        setSubmissionSuccess(null)
        setSubmissionError(null)
        Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer))
        debounceTimers.current = {}
    }

    const renderField = (field: FormField) => {
        const fieldId = field.id
        const value = responses[fieldId]
        const error = validationErrors[fieldId]
        const isValidating = validatingFields.has(fieldId)

        const inputClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-black ${error ? 'border-red-500' :
                isValidating ? 'border-yellow-400' :
                    'border-gray-300'
            }`

        switch (field.type) {
            case 'short_text':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                                onBlur={() => handleInputBlur(field)}
                                placeholder={field.properties.placeholder || 'أدخل إجابتك'}
                                className={inputClassName}
                                required={field.properties.required}
                            />
                            {isValidating && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                                </div>
                            )}
                        </div>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                        {isValidating && !error && (
                            <p className="text-sm text-yellow-600">جاري التحقق...</p>
                        )}
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
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'أدخل إجابتك'}
                            rows={4}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
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
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'أدخل بريدك الإلكتروني'}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
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
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'أدخل رقم'}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
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
                            onBlur={() => handleInputBlur(field)}
                            className={inputClassName}
                            required={field.properties.required}
                            aria-label={field.properties.label}
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
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
                                        onBlur={() => handleInputBlur(field)}
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
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>
                )

            case 'checkbox':
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
                                        type="checkbox"
                                        id={`checkbox-${fieldId}-${option.id}`}
                                        value={option.id}
                                        checked={Array.isArray(value) && value.includes(option.id)}
                                        onChange={(e) => {
                                            const currentValues = Array.isArray(value) ? value : []
                                            if (e.target.checked) {
                                                handleInputChange(fieldId, [...currentValues, option.id])
                                            } else {
                                                handleInputChange(fieldId, currentValues.filter(v => v !== option.id))
                                            }
                                        }}
                                        onBlur={() => handleInputBlur(field)}
                                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        required={field.properties.required}
                                        aria-label={option.label}
                                    />
                                    <span className="text-sm text-gray-700">{option.label}</span>
                                </div>
                            ))}
                        </div>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
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
                            onBlur={() => handleInputBlur(field)}
                            className={inputClassName}
                            required={field.properties.required}
                            aria-label={field.properties.label}
                        >
                            <option value="">اختر خيار</option>
                            {field.properties.options?.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>
                )

            case 'linear_scale':
                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-600">{field.properties.minLabel || '1'}</span>
                            <div className="flex gap-2">
                                {Array.from({ length: (field.properties.maxValue || 5) - (field.properties.minValue || 1) + 1 }, (_, i) => {
                                    const scaleValue = (field.properties.minValue || 1) + i
                                    return (
                                        <label key={scaleValue} className="flex flex-col items-center gap-1">
                                            <input
                                                type="radio"
                                                name={`scale-${fieldId}`}
                                                value={scaleValue}
                                                checked={value === scaleValue}
                                                onChange={(e) => handleInputChange(fieldId, parseInt(e.target.value))}
                                                onBlur={() => handleInputBlur(field)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                required={field.properties.required}
                                            />
                                            <span className="text-xs text-gray-600">{scaleValue}</span>
                                        </label>
                                    )
                                })}
                            </div>
                            <span className="text-sm text-gray-600">{field.properties.maxLabel || (field.properties.maxValue || 5).toString()}</span>
                        </div>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>
                )

            case 'display_text':
                return (
                    <div className="prose max-w-none text-black" style={{ color: '#000000' }}>
                        <div dangerouslySetInnerHTML={{ __html: field.properties.label }} />
                    </div>
                )

            case 'display_image':
                return (
                    <div className="space-y-2">
                        {field.properties.label && (
                            <h3 className="text-lg font-medium text-gray-900">{field.properties.label}</h3>
                        )}
                        {field.properties.src && (
                            <img
                                src={field.properties.src}
                                alt={field.properties.placeholder || 'صورة'}
                                className="w-full max-w-md mx-auto rounded-lg"
                            />
                        )}
                        {field.properties.placeholder && (
                            <p className="text-sm text-gray-600 text-center">{field.properties.placeholder}</p>
                        )}
                    </div>
                )

            case 'display_video':
                return (
                    <div className="space-y-2">
                        {field.properties.label && (
                            <h3 className="text-lg font-medium text-gray-900">{field.properties.label}</h3>
                        )}
                        {field.properties.placeholder && (
                            <p className="text-sm text-gray-600">{field.properties.placeholder}</p>
                        )}
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                            <p className="text-gray-500">فيديو: {field.properties.label}</p>
                        </div>
                    </div>
                )

            case 'location':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    // Simulate getting current location
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            async (position) => {
                                                const { latitude, longitude } = position.coords

                                                try {
                                                    // Get readable address using reverse geocoding
                                                    const response = await fetch(
                                                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`
                                                    )
                                                    const data = await response.json()

                                                    const address = data.display_name || 'عنوان غير متوفر'
                                                    handleInputChange(fieldId, {
                                                        latitude,
                                                        longitude,
                                                        address
                                                    })
                                                } catch (error) {
                                                    console.error('Error getting address:', error)
                                                    // Fallback to coordinates only
                                                    handleInputChange(fieldId, { latitude, longitude })
                                                }
                                            },
                                            (error) => {
                                                console.error('Error getting location:', error)
                                                alert('فشل في الحصول على الموقع')
                                            }
                                        )
                                    } else {
                                        alert('متصفحك لا يدعم تحديد الموقع')
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-center"
                            >
                                📍 الحصول على الموقع الحالي
                            </button>
                            {value && (
                                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-700">
                                        {value.address ? (
                                            <>
                                                <strong>العنوان:</strong> {value.address}
                                                <br />
                                                <small className="text-gray-600">
                                                    الإحداثيات: {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
                                                </small>
                                            </>
                                        ) : (
                                            <>
                                                <strong>الإحداثيات:</strong> {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>
                )

            default:
                return (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-gray-500">نوع الحقل غير مدعوم: {field.type}</p>
                    </div>
                )
        }
    }



    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Eye size={20} className="text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">معاينة النموذج</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="إغلاق المعاينة"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6" style={backgroundStyles}>
                    <div className="max-w-2xl mx-auto">
                        {/* Form Header */}
                        <div className="mb-8 text-center">
                            {form.theme?.logoUrl && (
                                <div className="mb-4 flex justify-center">
                                    <img
                                        src={form.theme.logoUrl}
                                        alt="شعار النموذج"
                                        className="max-h-16 max-w-48 object-contain"
                                    />
                                </div>
                            )}
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{form.title}</h1>
                            {form.description && (
                                <p className="text-gray-600">{form.description}</p>
                            )}
                        </div>

                        {/* Success Message */}
                        {submissionSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                        <span className="text-green-600 text-sm">✓</span>
                                    </div>
                                    <div>
                                        <p className="text-green-800 font-medium">Form submitted successfully!</p>
                                        <p className="text-green-700 text-sm">Submission ID: {submissionSuccess}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {submissionError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="text-red-600 text-sm">!</span>
                                    </div>
                                    <p className="text-red-800">{submissionError}</p>
                                </div>
                            </div>
                        )}

                        {/* Form Content */}
                        <div className={`${cardClasses} rounded-lg p-8`} style={cardStyle}>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Email field for API testing */}
                                {enableApiTesting && (
                                    <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address (for API testing - optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={submitterEmail}
                                            onChange={(e) => setSubmitterEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                <p className="text-xs text-gray-500 mt-1">
                                    استخدم البريد الإلكتروني لتلقي نسخة من الإرسال. اتركه فارغاً إذا لم ترغب بذلك.
                                </p>
                                    </div>
                                )}

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
                                    const renderedField = renderField(field)
                                    const questionWrapped = hasQuestionBackground ? (
                                        <div className="rounded-lg p-4" style={questionBackgroundStyle}>
                                            {renderedField}
                                        </div>
                                    ) : (
                                        renderedField
                                    )

                                    return (
                                        <div key={field.id} className={`rounded-lg p-4 ${borderClasses}`} style={containerStyle}>
                                            {questionWrapped}
                                        </div>
                                    )
                                })}

                                {/* Submit/Reset Buttons */}
                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={submissionLoading}
                                        className={`flex-1 flex items-center justify-center py-3 px-6 rounded-md font-medium transition-colors ${
                                            enableApiTesting 
                                                ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50' 
                                                : 'bg-gray-600 text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        {submissionLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Submitting...
                                            </>
                                        ) : enableApiTesting ? (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Submit Form
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Reset Form
                                            </>
                                        )}
                                    </button>
                                    
                                    {enableApiTesting && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2 inline" />
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 