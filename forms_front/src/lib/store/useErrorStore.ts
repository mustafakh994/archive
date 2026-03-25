import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError } from '../api/client'
import { logError, logWarning } from '../utils/errorLogger'

export interface ErrorState {
  // Global error state
  globalError: string | null
  
  // API errors by endpoint
  apiErrors: Record<string, string>
  
  // Form validation errors
  validationErrors: Record<string, Record<string, string>>
  
  // Network status
  isOnline: boolean
  lastOfflineTime: Date | null
  
  // Error history for debugging
  errorHistory: Array<{
    id: string
    timestamp: Date
    type: 'api' | 'validation' | 'network' | 'global'
    message: string
    context?: any
  }>
}

export interface ErrorActions {
  // Global error management
  setGlobalError: (error: string | null) => void
  clearGlobalError: () => void
  
  // API error management
  setApiError: (endpoint: string, error: string) => void
  clearApiError: (endpoint: string) => void
  clearAllApiErrors: () => void
  
  // Validation error management
  setValidationErrors: (formId: string, errors: Record<string, string>) => void
  setFieldError: (formId: string, field: string, error: string) => void
  clearFieldError: (formId: string, field: string) => void
  clearFormErrors: (formId: string) => void
  clearAllValidationErrors: () => void
  
  // Network status
  setOnlineStatus: (isOnline: boolean) => void
  
  // Error history
  addErrorToHistory: (type: ErrorState['errorHistory'][0]['type'], message: string, context?: any) => void
  clearErrorHistory: () => void
  
  // Utility methods
  handleApiError: (endpoint: string, error: unknown) => void
  getFormattedError: (error: unknown) => string
  hasErrors: () => boolean
  getErrorSummary: () => {
    globalErrors: number
    apiErrors: number
    validationErrors: number
    totalErrors: number
  }
}

export const useErrorStore = create<ErrorState & ErrorActions>()(
  persist(
    (set, get) => ({
      // Initial state
      globalError: null,
      apiErrors: {},
      validationErrors: {},
      isOnline: true,
      lastOfflineTime: null,
      errorHistory: [],

      // Global error management
      setGlobalError: (error) => {
        set({ globalError: error })
        if (error) {
          get().addErrorToHistory('global', error)
          logError(new Error(error), { type: 'global' })
        }
      },

      clearGlobalError: () => {
        set({ globalError: null })
      },

      // API error management
      setApiError: (endpoint, error) => {
        set((state) => ({
          apiErrors: {
            ...state.apiErrors,
            [endpoint]: error
          }
        }))
        get().addErrorToHistory('api', error, { endpoint })
        logError(new Error(error), { type: 'api', endpoint })
      },

      clearApiError: (endpoint) => {
        set((state) => {
          const newApiErrors = { ...state.apiErrors }
          delete newApiErrors[endpoint]
          return { apiErrors: newApiErrors }
        })
      },

      clearAllApiErrors: () => {
        set({ apiErrors: {} })
      },

      // Validation error management
      setValidationErrors: (formId, errors) => {
        set((state) => ({
          validationErrors: {
            ...state.validationErrors,
            [formId]: errors
          }
        }))
        
        Object.entries(errors).forEach(([field, error]) => {
          get().addErrorToHistory('validation', error, { formId, field })
        })
      },

      setFieldError: (formId, field, error) => {
        set((state) => ({
          validationErrors: {
            ...state.validationErrors,
            [formId]: {
              ...state.validationErrors[formId],
              [field]: error
            }
          }
        }))
        get().addErrorToHistory('validation', error, { formId, field })
      },

      clearFieldError: (formId, field) => {
        set((state) => {
          const formErrors = { ...state.validationErrors[formId] }
          delete formErrors[field]
          
          return {
            validationErrors: {
              ...state.validationErrors,
              [formId]: formErrors
            }
          }
        })
      },

      clearFormErrors: (formId) => {
        set((state) => {
          const newValidationErrors = { ...state.validationErrors }
          delete newValidationErrors[formId]
          return { validationErrors: newValidationErrors }
        })
      },

      clearAllValidationErrors: () => {
        set({ validationErrors: {} })
      },

      // Network status
      setOnlineStatus: (isOnline) => {
        const currentState = get()
        
        if (!isOnline && currentState.isOnline) {
          // Going offline
          set({ 
            isOnline: false, 
            lastOfflineTime: new Date() 
          })
          get().addErrorToHistory('network', 'Connection lost')
          logWarning('Network connection lost')
        } else if (isOnline && !currentState.isOnline) {
          // Coming back online
          set({ isOnline: true })
          get().addErrorToHistory('network', 'Connection restored')
          logWarning('Network connection restored')
        }
      },

      // Error history
      addErrorToHistory: (type, message, context) => {
        const errorEntry = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          type,
          message,
          context
        }

        set((state) => ({
          errorHistory: [errorEntry, ...state.errorHistory].slice(0, 50) // Keep last 50 errors
        }))
      },

      clearErrorHistory: () => {
        set({ errorHistory: [] })
      },

      // Utility methods
      handleApiError: (endpoint, error) => {
        const formattedError = get().getFormattedError(error)
        get().setApiError(endpoint, formattedError)
      },

      getFormattedError: (error) => {
        if (error instanceof ApiError) {
          return error.message
        }
        
        if (error instanceof Error) {
          return error.message
        }
        
        if (typeof error === 'string') {
          return error
        }
        
        return 'An unexpected error occurred'
      },

      hasErrors: () => {
        const state = get()
        return !!(
          state.globalError ||
          Object.keys(state.apiErrors).length > 0 ||
          Object.keys(state.validationErrors).length > 0
        )
      },

      getErrorSummary: () => {
        const state = get()
        const apiErrorCount = Object.keys(state.apiErrors).length
        const validationErrorCount = Object.values(state.validationErrors)
          .reduce((total, formErrors) => total + Object.keys(formErrors).length, 0)
        
        return {
          globalErrors: state.globalError ? 1 : 0,
          apiErrors: apiErrorCount,
          validationErrors: validationErrorCount,
          totalErrors: (state.globalError ? 1 : 0) + apiErrorCount + validationErrorCount
        }
      }
    }),
    {
      name: 'error-store',
      partialize: (state) => ({
        // Only persist error history and network status
        errorHistory: state.errorHistory,
        lastOfflineTime: state.lastOfflineTime
      })
    }
  )
)

// Hooks for specific error types
export const useGlobalError = () => {
  const globalError = useErrorStore((state) => state.globalError)
  const setGlobalError = useErrorStore((state) => state.setGlobalError)
  const clearGlobalError = useErrorStore((state) => state.clearGlobalError)
  
  return { globalError, setGlobalError, clearGlobalError }
}

export const useApiErrors = () => {
  const apiErrors = useErrorStore((state) => state.apiErrors)
  const setApiError = useErrorStore((state) => state.setApiError)
  const clearApiError = useErrorStore((state) => state.clearApiError)
  const clearAllApiErrors = useErrorStore((state) => state.clearAllApiErrors)
  const handleApiError = useErrorStore((state) => state.handleApiError)
  
  return { 
    apiErrors, 
    setApiError, 
    clearApiError, 
    clearAllApiErrors, 
    handleApiError,
    getApiError: (endpoint: string) => apiErrors[endpoint] || null
  }
}

export const useValidationErrors = (formId?: string) => {
  const validationErrors = useErrorStore((state) => 
    formId ? state.validationErrors[formId] || {} : state.validationErrors
  )
  const setValidationErrors = useErrorStore((state) => state.setValidationErrors)
  const setFieldError = useErrorStore((state) => state.setFieldError)
  const clearFieldError = useErrorStore((state) => state.clearFieldError)
  const clearFormErrors = useErrorStore((state) => state.clearFormErrors)
  
  return {
    validationErrors,
    setValidationErrors: formId ? (errors: Record<string, string>) => setValidationErrors(formId, errors) : setValidationErrors,
    setFieldError: formId ? (field: string, error: string) => setFieldError(formId, field, error) : setFieldError,
    clearFieldError: formId ? (field: string) => clearFieldError(formId, field) : clearFieldError,
    clearFormErrors: formId ? () => clearFormErrors(formId) : clearFormErrors,
    hasErrors: formId ? Object.keys(validationErrors).length > 0 : Object.keys(validationErrors).length > 0,
    getFieldError: formId ? (field: string) => validationErrors[field] || null : undefined
  }
}

export const useNetworkStatus = () => {
  const isOnline = useErrorStore((state) => state.isOnline)
  const lastOfflineTime = useErrorStore((state) => state.lastOfflineTime)
  const setOnlineStatus = useErrorStore((state) => state.setOnlineStatus)
  
  return { isOnline, lastOfflineTime, setOnlineStatus }
}

export const useErrorHistory = () => {
  const errorHistory = useErrorStore((state) => state.errorHistory)
  const clearErrorHistory = useErrorStore((state) => state.clearErrorHistory)
  const addErrorToHistory = useErrorStore((state) => state.addErrorToHistory)
  
  return { errorHistory, clearErrorHistory, addErrorToHistory }
}

export const useErrorSummary = () => {
  const hasErrors = useErrorStore((state) => state.hasErrors())
  const getErrorSummary = useErrorStore((state) => state.getErrorSummary)
  
  return { hasErrors, getErrorSummary: getErrorSummary() }
}