'use client'

import { create } from 'zustand'
import { apiClient, FormSubmission, SubmitFormData, handleApiError } from '@/lib/api/client'

// Enhanced filter interface for submission filtering
export interface SubmissionFilters {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  submitterEmail?: string
  formVersion?: number
  sortBy?: 'submittedAt' | 'submitterEmail' | 'formVersion'
  sortOrder?: 'asc' | 'desc'
  searchTerm?: string
}

interface SubmissionState {
  submissions: FormSubmission[]
  currentSubmission: FormSubmission | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  // Enhanced state for filtering and search
  filters: SubmissionFilters
  searchResults: FormSubmission[]
  isSearching: boolean
  lastFetchedFormId: string | null
}

interface SubmissionActions {
  // Enhanced fetchFormSubmissions with better filtering support
  fetchFormSubmissions: (
    formId: string,
    params?: SubmissionFilters
  ) => Promise<void>
  
  // Individual submission fetching
  fetchSubmission: (id: string) => Promise<void>
  
  // Form submission with enhanced error handling
  submitForm: (formId: string, data: SubmitFormData) => Promise<{
    success: boolean
    submissionId?: string
    error?: string
  }>
  
  // Enhanced filtering and search capabilities
  setFilters: (filters: Partial<SubmissionFilters>) => void
  clearFilters: () => void
  searchSubmissions: (formId: string, searchTerm: string) => Promise<void>
  
  // Pagination helpers
  goToPage: (page: number) => Promise<void>
  changePageSize: (pageSize: number) => Promise<void>
  
  // Data management
  refreshSubmissions: () => Promise<void>
  clearSubmissions: () => void
  
  // State management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useSubmissionStore = create<SubmissionState & SubmissionActions>((set, get) => ({
  // State
  submissions: [],
  currentSubmission: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {
    page: 1,
    pageSize: 10,
    sortBy: 'submittedAt',
    sortOrder: 'desc',
  },
  searchResults: [],
  isSearching: false,
  lastFetchedFormId: null,

  // Enhanced Actions
  fetchFormSubmissions: async (formId, params) => {
    set({ isLoading: true, error: null })
    
    try {
      // Merge current filters with new params
      const currentFilters = get().filters
      const mergedParams = { ...currentFilters, ...params }
      
      const response = await apiClient.getFormSubmissions(formId, mergedParams)
      
      if (response.success && response.data) {
        set({
          submissions: response.data.items || [],
          pagination: {
            page: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
            totalCount: response.data.totalCount || 0,
            totalPages: response.data.totalPages || 0,
          },
          filters: mergedParams,
          lastFetchedFormId: formId,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          submissions: [],
          isLoading: false,
          error: response.message || 'Failed to fetch submissions',
        })
      }
    } catch (error) {
      console.error('Error fetching form submissions:', error)
      set({
        submissions: [],
        isLoading: false,
        error: handleApiError(error),
      })
    }
  },

  fetchSubmission: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getSubmission(id)
      
      if (response.success && response.data) {
        set({
          currentSubmission: response.data,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          currentSubmission: null,
          isLoading: false,
          error: response.message || 'Failed to fetch submission',
        })
      }
    } catch (error) {
      console.error('Error fetching submission:', error)
      set({
        currentSubmission: null,
        isLoading: false,
        error: handleApiError(error),
      })
    }
  },

  submitForm: async (formId: string, data: SubmitFormData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.submitForm(formId, data)
      
      if (response.success && response.data) {
        set({
          isLoading: false,
          error: null,
        })
        
        // Refresh submissions if we're currently viewing this form's submissions
        const { lastFetchedFormId, refreshSubmissions } = get()
        if (lastFetchedFormId === formId) {
          await refreshSubmissions()
        }
        
        return {
          success: true,
          submissionId: response.data.id,
        }
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to submit form',
        })
        return {
          success: false,
          error: response.message || 'Failed to submit form',
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      const errorMessage = handleApiError(error)
      set({
        isLoading: false,
        error: errorMessage,
      })
      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  // Enhanced filtering and search
  setFilters: (newFilters: Partial<SubmissionFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  clearFilters: () => {
    set({
      filters: {
        page: 1,
        pageSize: 10,
        sortBy: 'submittedAt',
        sortOrder: 'desc',
      }
    })
  },

  searchSubmissions: async (formId: string, searchTerm: string) => {
    set({ isSearching: true, error: null })
    
    try {
      const searchParams = {
        ...get().filters,
        searchTerm,
        page: 1, // Reset to first page for search
      }
      
      const response = await apiClient.getFormSubmissions(formId, searchParams)
      
      if (response.success && response.data) {
        set({
          searchResults: response.data.items || [],
          pagination: {
            page: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
            totalCount: response.data.totalCount || 0,
            totalPages: response.data.totalPages || 0,
          },
          isSearching: false,
          error: null,
        })
      } else {
        set({
          searchResults: [],
          isSearching: false,
          error: response.message || 'Failed to search submissions',
        })
      }
    } catch (error) {
      console.error('Error searching submissions:', error)
      set({
        searchResults: [],
        isSearching: false,
        error: handleApiError(error),
      })
    }
  },

  // Pagination helpers
  goToPage: async (page: number) => {
    const { lastFetchedFormId, fetchFormSubmissions, filters } = get()
    if (lastFetchedFormId) {
      await fetchFormSubmissions(lastFetchedFormId, { ...filters, page })
    }
  },

  changePageSize: async (pageSize: number) => {
    const { lastFetchedFormId, fetchFormSubmissions, filters } = get()
    if (lastFetchedFormId) {
      await fetchFormSubmissions(lastFetchedFormId, { ...filters, pageSize, page: 1 })
    }
  },

  // Data management
  refreshSubmissions: async () => {
    const { lastFetchedFormId, fetchFormSubmissions, filters } = get()
    if (lastFetchedFormId) {
      await fetchFormSubmissions(lastFetchedFormId, filters)
    }
  },

  clearSubmissions: () => {
    set({
      submissions: [],
      searchResults: [],
      currentSubmission: null,
      pagination: {
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      },
      lastFetchedFormId: null,
    })
  },

  // State management
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },
}))




