'use client'

import { useState, useCallback } from 'react'
import { apiClient, Form, FormSubmission } from '@/lib/api/client'

interface UseGuestFormReturn {
  form: Form | null
  isLoading: boolean
  error: string | null
  isSubmitting: boolean
  submitError: string | null
  isValidating: boolean
  validationError: string | null
  
  // Actions
  loadForm: (formIdOrCode: string, useCode?: boolean) => Promise<void>
  submitForm: (responseData: any, submitterEmail?: string) => Promise<FormSubmission | null>
  submitFormWithVersion: (responseData: any, version: number, submitterEmail?: string) => Promise<FormSubmission | null>
  submitFormLatest: (responseData: any, submitterEmail?: string) => Promise<FormSubmission | null>
  validateForm: (responseData: any) => Promise<boolean>
  clearErrors: () => void
}

export function useGuestForm(): UseGuestFormReturn {
  const [form, setForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const loadForm = useCallback(async (formIdOrCode: string, useCode = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = useCode 
        ? await apiClient.getGuestFormPreviewByCode(formIdOrCode)
        : await apiClient.getGuestFormPreview(formIdOrCode)
      
      if (response.success && response.data) {
        setForm(response.data)
      } else {
        setError(response.message || 'Failed to load form')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitForm = useCallback(async (
    responseData: any, 
    submitterEmail?: string
  ): Promise<FormSubmission | null> => {
    if (!form) {
      setSubmitError('No form loaded')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await apiClient.submitGuestForm(form.id, {
        responseData,
        submitterEmail
      })
      
      if (response.success && response.data) {
        return response.data
      } else {
        setSubmitError(response.message || 'Failed to submit form')
        return null
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [form])

  const submitFormWithVersion = useCallback(async (
    responseData: any,
    version: number,
    submitterEmail?: string
  ): Promise<FormSubmission | null> => {
    if (!form) {
      setSubmitError('No form loaded')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await apiClient.submitGuestFormWithVersion(form.id, version, {
        responseData,
        submitterEmail
      })
      
      if (response.success && response.data) {
        return response.data
      } else {
        setSubmitError(response.message || 'Failed to submit form')
        return null
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [form])

  const submitFormLatest = useCallback(async (
    responseData: any,
    submitterEmail?: string
  ): Promise<FormSubmission | null> => {
    if (!form) {
      setSubmitError('No form loaded')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await apiClient.submitGuestFormLatest(form.id, {
        responseData,
        submitterEmail
      })
      
      if (response.success && response.data) {
        return response.data
      } else {
        setSubmitError(response.message || 'Failed to submit form')
        return null
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [form])

  const validateForm = useCallback(async (responseData: any): Promise<boolean> => {
    if (!form) {
      setValidationError('No form loaded')
      return false
    }

    setIsValidating(true)
    setValidationError(null)
    
    try {
      const response = await apiClient.validateGuestFormData(form.id, responseData)
      
      if (response.success) {
        return response.data === true
      } else {
        setValidationError(response.message || 'Validation failed')
        return false
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Network error')
      return false
    } finally {
      setIsValidating(false)
    }
  }, [form])

  const clearErrors = useCallback(() => {
    setError(null)
    setSubmitError(null)
    setValidationError(null)
  }, [])

  return {
    form,
    isLoading,
    error,
    isSubmitting,
    submitError,
    isValidating,
    validationError,
    loadForm,
    submitForm,
    submitFormWithVersion,
    submitFormLatest,
    validateForm,
    clearErrors
  }
}