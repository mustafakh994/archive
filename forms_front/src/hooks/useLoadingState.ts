'use client'

import { useState, useCallback, useRef } from 'react'

export interface LoadingState {
  isLoading: boolean
  error: string | null
  progress?: number
}

export interface LoadingStateManager {
  isLoading: boolean
  error: string | null
  progress?: number
  startLoading: (initialProgress?: number) => void
  stopLoading: () => void
  setError: (error: string | null) => void
  setProgress: (progress: number) => void
  clearError: () => void
  reset: () => void
}

export function useLoadingState(initialState?: Partial<LoadingState>): LoadingStateManager {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    progress: undefined,
    ...initialState
  })

  const startLoading = useCallback((initialProgress?: number) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: initialProgress
    }))
  }, [])

  const stopLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: undefined
    }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false
    }))
  }, [])

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      progress: undefined
    })
  }, [])

  return {
    isLoading: state.isLoading,
    error: state.error,
    progress: state.progress,
    startLoading,
    stopLoading,
    setError,
    setProgress,
    clearError,
    reset
  }
}

// Hook for managing multiple loading states
export function useMultipleLoadingStates() {
  const [states, setStates] = useState<Record<string, LoadingState>>({})

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || { isLoading: false, error: null }
  }, [states])

  const startLoading = useCallback((key: string, initialProgress?: number) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: true,
        error: null,
        progress: initialProgress
      }
    }))
  }, [])

  const stopLoading = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        progress: undefined
      }
    }))
  }, [])

  const setError = useCallback((key: string, error: string | null) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error,
        isLoading: false
      }
    }))
  }, [])

  const setProgress = useCallback((key: string, progress: number) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress: Math.max(0, Math.min(100, progress))
      }
    }))
  }, [])

  const clearError = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error: null
      }
    }))
  }, [])

  const reset = useCallback((key: string) => {
    setStates(prev => {
      const newStates = { ...prev }
      delete newStates[key]
      return newStates
    })
  }, [])

  const resetAll = useCallback(() => {
    setStates({})
  }, [])

  const isAnyLoading = Object.values(states).some(state => state.isLoading)
  const hasAnyError = Object.values(states).some(state => state.error)

  return {
    states,
    getState,
    startLoading,
    stopLoading,
    setError,
    setProgress,
    clearError,
    reset,
    resetAll,
    isAnyLoading,
    hasAnyError
  }
}

// Hook for async operations with loading state
export function useAsyncOperation<T = any>() {
  const loadingState = useLoadingState()
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (
    operation: (signal?: AbortSignal) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: Error) => void
      trackProgress?: boolean
    }
  ): Promise<T | null> => {
    try {
      // Cancel any existing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      loadingState.startLoading(options?.trackProgress ? 0 : undefined)
      
      const result = await operation(abortControllerRef.current.signal)
      
      loadingState.stopLoading()
      options?.onSuccess?.(result)
      
      return result
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Operation was cancelled, don't treat as error
        loadingState.reset()
        return null
      }
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      loadingState.setError(errorMessage)
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage))
      
      return null
    }
  }, [loadingState])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      loadingState.reset()
    }
  }, [loadingState])

  return {
    ...loadingState,
    execute,
    cancel
  }
}

// Hook for form submission with loading state
export function useFormSubmission<TData = any, TResult = any>() {
  const loadingState = useLoadingState()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const submit = useCallback(async (
    data: TData,
    submitFn: (data: TData) => Promise<TResult>,
    options?: {
      onSuccess?: (result: TResult) => void
      onError?: (error: Error) => void
      validate?: (data: TData) => Record<string, string> | null
    }
  ): Promise<TResult | null> => {
    try {
      // Clear previous errors
      setValidationErrors({})
      loadingState.clearError()

      // Validate if validator provided
      if (options?.validate) {
        const errors = options.validate(data)
        if (errors && Object.keys(errors).length > 0) {
          setValidationErrors(errors)
          return null
        }
      }

      loadingState.startLoading()
      
      const result = await submitFn(data)
      
      loadingState.stopLoading()
      options?.onSuccess?.(result)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'
      loadingState.setError(errorMessage)
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage))
      
      return null
    }
  }, [loadingState])

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({})
  }, [])

  const setFieldError = useCallback((field: string, error: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  return {
    ...loadingState,
    validationErrors,
    submit,
    clearValidationErrors,
    setFieldError,
    clearFieldError,
    hasValidationErrors: Object.keys(validationErrors).length > 0
  }
}

// Hook for file upload with progress tracking
export function useFileUpload() {
  const [uploads, setUploads] = useState<Record<string, {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'completed' | 'error'
    error?: string
    result?: any
  }>>({})

  const startUpload = useCallback((
    fileId: string,
    file: File,
    uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<any>
  ) => {
    setUploads(prev => ({
      ...prev,
      [fileId]: {
        file,
        progress: 0,
        status: 'uploading'
      }
    }))

    const onProgress = (progress: number) => {
      setUploads(prev => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          progress: Math.max(0, Math.min(100, progress))
        }
      }))
    }

    uploadFn(file, onProgress)
      .then(result => {
        setUploads(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 100,
            status: 'completed',
            result
          }
        }))
      })
      .catch(error => {
        setUploads(prev => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }))
      })
  }, [])

  const removeUpload = useCallback((fileId: string) => {
    setUploads(prev => {
      const newUploads = { ...prev }
      delete newUploads[fileId]
      return newUploads
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const newUploads: typeof prev = {}
      Object.entries(prev).forEach(([id, upload]) => {
        if (upload.status !== 'completed') {
          newUploads[id] = upload
        }
      })
      return newUploads
    })
  }, [])

  const clearAll = useCallback(() => {
    setUploads({})
  }, [])

  const uploadList = Object.entries(uploads).map(([id, upload]) => ({
    id,
    ...upload
  }))

  const isAnyUploading = uploadList.some(upload => upload.status === 'uploading')
  const completedCount = uploadList.filter(upload => upload.status === 'completed').length
  const errorCount = uploadList.filter(upload => upload.status === 'error').length

  return {
    uploads: uploadList,
    startUpload,
    removeUpload,
    clearCompleted,
    clearAll,
    isAnyUploading,
    completedCount,
    errorCount,
    totalCount: uploadList.length
  }
}