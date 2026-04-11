'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSubmissionStore } from '@/lib/store/useSubmissionStore'
import { useFormStore, FormField } from '@/lib/store/useFormStore'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface FormRendererProps {
    formId: string
    onSubmissionSuccess?: (submissionId: string) => void
    onSubmissionError?: (error: string) => void
    className?: string
}

export default function FormRenderer({
    formId,
    onSubmissionSuccess,
    onSubmissionError,
    className = ''
}: FormRendererProps) {
    const { submitForm, isLoading, error: submissionError } = useSubmissionStore()
    const { form, fetchForm, isLoading: formLoading, error: formError } = useFormStore()

    const [responses, setResponses] = useState<Record<string, any>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null)
    const [submitterEmail, setSubmitterEmail] = useState('')
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

    // Fetch form data on mount
    useEffect(() => {
        if (formId) {
            fetchForm(formId)
        }
    }, [formId, fetchForm])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer))
        }
    }, [])

    const backgroundStyles = {
        backgroundColor: form.theme?.backgroundColor || '#F3F4F6',
        backgroundImage: form.theme?.backgroundImageUrl ? `url(${form.theme.backgroundImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    }

    const cardStyleSetting = form.theme?.cardStyle ?? 'solid'
    const cardBackgroundColor = form.theme?.cardBackgroundColor || 'rgba(255,255,255,0.9)'
    const cardBorderColor = form.theme?.cardBorderColor || '#e5e7eb'
    const backdropBlurEnabled = form.theme?.cardBackdropBlur ?? true
    const cardStyle: React.CSSProperties = {
        backgroundColor: cardStyleSetting === 'transparent' ? 'transparent' : cardBackgroundColor,
        borderColor: cardBorderColor,
        ...(backdropBlurEnabled ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
    }
    const cardClasses = `rounded-lg shadow-sm border p-6 ${backdropBlurEnabled ? 'backdrop-blur-sm' : ''}`

    // Enhanced validation function with backend schema support
    const validateField = (field: FormField, value: any, isRealTime: boolean = false): string | null => {
        if (!field.properties.validation) return null

        const { validation } = field.properties
        const stringValue = String(value || '')

        // For real-time validation, only show errors if user has entered something or field is required
        if (isRealTime && !stringValue && !field.properties.required) return null

        // Required validation
        if (field.properties.required && !stringValue) {
            return 'This field is required'
        }

        // Regex validation
        if (validation.rule === 'regex' && validation.pattern && stringValue) {
            try {
                const regex = new RegExp(validation.pattern)
                if (!regex.test(stringValue)) {
                    return validation.errorMessage || 'Invalid format'
                }
            } catch (error) {
                console.error('Invalid regex pattern:', validation.pattern)
                return 'Validation pattern error'
            }
        }

        // Email validation
        if (validation.rule === 'email' && stringValue) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            if (!emailRegex.test(stringValue)) {
                return validation.errorMessage || 'Please enter a valid email address'
            }
        }

        // URL validation
        if (validation.rule === 'url' && stringValue) {
            const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
            if (!urlRegex.test(stringValue)) {
                return validation.errorMessage || 'Please enter a valid URL'
            }
        }

        // Min/Max validation for numbers
        if ((validation.rule === 'min' || validation.rule === 'max') && stringValue) {
            const numValue = parseFloat(stringValue)
            if (isNaN(numValue)) {
                return 'Please enter a valid number'
            }

            if (validation.rule === 'min' && validation.minValue !== undefined && numValue < validation.minValue) {
                return validation.errorMessage || `Value must be at least ${validation.minValue}`
            }

            if (validation.rule === 'max' && validation.maxValue !== undefined && numValue > validation.maxValue) {
                return validation.errorMessage || `Value must be at most ${validation.maxValue}`
            }
        }

        return null
    }

    // Debounced validation function
    const debouncedValidation = useCallback((fieldId: string, value: any) => {
        if (debounceTimers.current[fieldId]) {
            clearTimeout(debounceTimers.current[fieldId])
        }

        setValidatingFields(prev => new Set(prev).add(fieldId))

        debounceTimers.current[fieldId] = setTimeout(() => {
            const field = form.fields.find(f => f.id === fieldId)
            if (field) {
                const error = validateField(field, value, true)
                setValidationErrors(prev => ({
                    ...prev,
                    [fieldId]: error || ''
                }))
            }
            setValidatingFields(prev => {
                const newSet = new Set(prev)
                newSet.delete(fieldId)
                return newSet
            })
        }, 300)
    }, [form.fields])

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
        const error = validateField(field, value, false)

        setValidationErrors(prev => ({
            ...prev,
            [field.id]: error || ''
        }))
    }

    const validateAllFields = (): boolean => {
        const errors: Record<string, string> = {}
        let isValid = true

        form.fields.forEach(field => {
            const value = responses[field.id]
            const error = validateField(field, value, false)
            if (error) {
                errors[field.id] = error
                isValid = false
            }
        })

        setValidationErrors(errors)
        return isValid
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const trimmedEmail = submitterEmail.trim()

        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setValidationErrors(prev => ({
                ...prev,
                submitterEmail: 'Please enter a valid email address'
            }))
            return
        }

        if (!validateAllFields()) {
            return
        }

        // Clear any existing email validation message before submission
        if (validationErrors.submitterEmail) {
            setValidationErrors(prev => {
                const { submitterEmail: _ignored, ...rest } = prev
                return rest
            })
        }

        setIsSubmitting(true)

        try {
            const result = await submitForm(formId, {
                responseData: responses,
                ...(trimmedEmail ? { submitterEmail: trimmedEmail } : {})
            })

            if (result.success && result.submissionId) {
                setSubmissionSuccess(result.submissionId)
                setResponses({})
                setSubmitterEmail('')
                setValidationErrors({})
                onSubmissionSuccess?.(result.submissionId)
            } else {
                const errorMessage = result.error || 'Failed to submit form'
                onSubmissionError?.(errorMessage)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            onSubmissionError?.(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderField = (field: FormField) => {
        const fieldId = field.id
        const value = responses[fieldId]
        const error = validationErrors[fieldId]
        const isValidating = validatingFields.has(fieldId)

        const inputClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-gray-900 ${error ? 'border-red-500' :
            isValidating ? 'border-yellow-400' :
                'border-gray-300'
            }`

        switch (field.type) {
            case 'short_text':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                                onBlur={() => handleInputBlur(field)}
                                placeholder={field.properties.placeholder || 'Enter your answer'}
                                className={inputClassName}
                                required={field.properties.required}
                            />
                            {isValidating && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                                </div>
                            )}
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'long_text':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                            value={value || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'Enter your answer'}
                            rows={4}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'email':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type="email"
                            value={value || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'Enter your email'}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'number':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type="number"
                            value={value || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleInputBlur(field)}
                            placeholder={field.properties.placeholder || 'Enter a number'}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'date':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type="date"
                            value={value || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleInputBlur(field)}
                            className={inputClassName}
                            required={field.properties.required}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'radio_group':
                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-2">
                            {field.properties.options?.map((option) => (
                                <div key={option.id} className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name={`radio-${fieldId}`}
                                        id={`radio-${fieldId}-${option.id}`}
                                        value={option.id}
                                        checked={value === option.id}
                                        onChange={(e) => handleInputChange(fieldId, e.target.value)}
                                        onBlur={() => handleInputBlur(field)}
                                        className="mt-1 h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                        required={field.properties.required}
                                    />
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`radio-${fieldId}-${option.id}`} className="text-sm text-gray-700 cursor-pointer">
                                            {option.label}
                                        </label>
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
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'checkbox':
                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-2">
                            {field.properties.options?.map((option) => (
                                <div key={option.id} className="flex items-start gap-3">
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
                                        className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <label htmlFor={`checkbox-${fieldId}-${option.id}`} className="text-sm text-gray-700 cursor-pointer">
                                        {option.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'dropdown':
                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            value={value || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            onBlur={() => handleInputBlur(field)}
                            className={inputClassName}
                            required={field.properties.required}
                        >
                            <option value="">Select an option</option>
                            {field.properties.options?.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'linear_scale':
                const minValue = field.properties.minValue ?? 1
                const maxValue = field.properties.maxValue ?? 5
                const scaleOptions = Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i)

                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            {field.properties.label}
                            {field.properties.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 px-2">
                                {scaleOptions.map((scaleValue) => (
                                    <span key={scaleValue}>{scaleValue}</span>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                {scaleOptions.map((scaleValue) => (
                                    <input
                                        key={scaleValue}
                                        type="radio"
                                        name={`scale-${fieldId}`}
                                        value={scaleValue}
                                        checked={value === scaleValue}
                                        onChange={(e) => handleInputChange(fieldId, parseInt(e.target.value))}
                                        onBlur={() => handleInputBlur(field)}
                                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                        required={field.properties.required}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{field.properties.minLabel || 'Not satisfied'}</span>
                                <span>{field.properties.maxLabel || 'Very satisfied'}</span>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                )

            case 'display_text':
                return (
                    <div className="prose prose-sm max-w-none text-black" style={{ color: '#000000' }}>
                        <div dangerouslySetInnerHTML={{ __html: field.properties.label || '<p>Text content</p>' }} />
                    </div>
                )

            case 'display_image':
                return (
                    <div className="space-y-2">
                        {field.properties.label && (
                            <h3 className="text-lg font-medium text-gray-900">{field.properties.label}</h3>
                        )}
                        <div className="text-center">
                            <img
                                src={field.properties.src || 'https://via.placeholder.com/400x200?text=Image'}
                                alt={field.properties.placeholder || 'Display image'}
                                className="max-w-full h-auto rounded-lg mx-auto"
                                style={{ maxHeight: '300px' }}
                            />
                        </div>
                    </div>
                )

            case 'display_video':
                return (
                    <div className="space-y-2">
                        <div className="text-center">
                            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                <div className="text-gray-500">
                                    <p className="text-sm">Video: {field.properties.label}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            default:
                return (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-gray-500">Unsupported field type: {field.type}</p>
                    </div>
                )
        }
    }

    if (formLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-gray-600">Loading form...</p>
                </div>
            </div>
        )
    }

    if (formError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <div>
                        <h3 className="text-lg font-medium text-red-800">Error Loading Form</h3>
                        <p className="text-red-700 mt-1">{formError}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (submissionSuccess) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-800 mb-2">Form Submitted Successfully!</h3>
                <p className="text-green-700 mb-4">
                    Your submission has been recorded. Submission ID: <code className="bg-green-100 px-2 py-1 rounded">{submissionSuccess}</code>
                </p>
                <button
                    onClick={() => setSubmissionSuccess(null)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                    Submit Another Response
                </button>
            </div>
        )
    }

    return (
        <div className={`max-w-2xl mx-auto ${className}`} style={backgroundStyles}>
            <div className={cardClasses} style={cardStyle}>
                {/* Form Header */}
                <div className="mb-8 text-center">
                    {form.theme?.logoUrl && (
                        <div className="mb-4 flex justify-center">
                            <img
                                src={form.theme.logoUrl}
                                alt="Form logo"
                                className="max-h-16 max-w-48 object-contain"
                            />
                        </div>
                    )}
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">{form.title}</h1>
                    <p className="text-gray-600">{form.description}</p>
                </div>

                {/* Error Display */}
                {(submissionError || formError) && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <p className="text-red-700">{submissionError || formError}</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Submitter Email Field */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Your Email Address (optional)
                        </label>
                        <input
                            type="email"
                            value={submitterEmail}
                            onChange={(e) => {
                                setSubmitterEmail(e.target.value)
                                if (validationErrors.submitterEmail) {
                                    setValidationErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.submitterEmail
                                        return newErrors
                                    })
                                }
                            }}
                            placeholder="Enter your email address"
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 ${validationErrors.submitterEmail ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        <p className="text-sm text-gray-500">
                            We’ll use this to send you a copy of your submission if provided.
                        </p>
                        {validationErrors.submitterEmail && (
                            <p className="text-sm text-red-600">{validationErrors.submitterEmail}</p>
                        )}
                    </div>

                    {/* Form Fields */}
                    {form.fields.map((field) => {
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
                            disabled={isSubmitting || isLoading}
                            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Form'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}