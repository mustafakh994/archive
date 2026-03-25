'use client'

import { create } from 'zustand'
import { apiClient, Department, CreateDepartmentData } from '@/lib/api/client'

interface DepartmentState {
  departments: Department[]
  currentDepartment: Department | null
  userDepartment: Department | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

interface DepartmentActions {
  fetchDepartments: (params?: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortDescending?: boolean
  }) => Promise<void>
  fetchDepartment: (id: string) => Promise<void>
  createDepartment: (data: CreateDepartmentData) => Promise<boolean>
  updateDepartment: (id: string, data: Partial<CreateDepartmentData>) => Promise<boolean>
  deleteDepartment: (id: string) => Promise<boolean>
  setUserDepartment: (department: Department | null) => void
  getDepartmentById: (id: string) => Department | null
  filterByDepartment: <T extends { departmentId?: string }>(items: T[], departmentId?: string) => T[]
  isUserDepartment: (departmentId: string) => boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useDepartmentStore = create<DepartmentState & DepartmentActions>((set, get) => ({
  // State
  departments: [],
  currentDepartment: null,
  userDepartment: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  },

  // Actions
  fetchDepartments: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortDescending?: boolean
  }) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getDepartments(params)
      
      console.log('API Response for departments:', response) // Debug log
      
      if (response.success && response.data) {
        // Handle paginated response - extract items array and pagination info
        const departmentsArray = response.data.items || []
        set({
          departments: departmentsArray,
          pagination: {
            page: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
            totalItems: response.data.totalCount || 0,
            totalPages: response.data.totalPages || 0
          },
          isLoading: false,
          error: null,
        })
      } else {
        set({
          departments: [], // Ensure departments is always an array
          isLoading: false,
          error: response.message || 'Failed to fetch departments',
        })
      }
    } catch (error) {
      console.error('Error fetching departments:', error) // Debug log
      set({
        departments: [], // Ensure departments is always an array
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      
      // If it's a network error, we might want to show a more user-friendly message
      if (error instanceof Error && error.message.includes('fetch')) {
        set({
          error: 'لا يمكن الاتصال بالخادم. تأكد من أن الخادم يعمل على المنفذ 5000.',
        })
      }
    }
  },

  fetchDepartment: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getDepartment(id)
      
      if (response.success && response.data) {
        set({
          currentDepartment: response.data,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to fetch department',
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
    }
  },

  createDepartment: async (data: CreateDepartmentData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.createDepartment(data)
      
      if (response.success && response.data) {
        const { departments } = get()
        set({
          departments: [...departments, response.data],
          isLoading: false,
          error: null,
        })
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to create department',
        })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  updateDepartment: async (id: string, data: Partial<CreateDepartmentData>) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.updateDepartment(id, data)
      
      if (response.success && response.data) {
        const { departments } = get()
        set({
          departments: departments.map(dept => 
            dept.id === id ? response.data! : dept
          ),
          currentDepartment: response.data,
          isLoading: false,
          error: null,
        })
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to update department',
        })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  deleteDepartment: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.deleteDepartment(id)
      
      if (response.success) {
        const { departments } = get()
        set({
          departments: departments.filter(dept => dept.id !== id),
          currentDepartment: null,
          isLoading: false,
          error: null,
        })
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to delete department',
        })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  // Department context and filtering actions
  setUserDepartment: (department: Department | null) => {
    set({ userDepartment: department })
  },

  getDepartmentById: (id: string) => {
    const { departments } = get()
    return departments.find(dept => dept.id === id) || null
  },

  filterByDepartment: <T extends { departmentId?: string }>(items: T[], departmentId?: string) => {
    const { userDepartment } = get()
    const targetDepartmentId = departmentId || userDepartment?.id
    
    if (!targetDepartmentId) {
      return items
    }
    
    return items.filter(item => item.departmentId === targetDepartmentId)
  },

  isUserDepartment: (departmentId: string) => {
    const { userDepartment } = get()
    return userDepartment?.id === departmentId
  },
}))
