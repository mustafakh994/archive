'use client'

import { useAuthStore } from '@/lib/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export interface UseAuthReturn {
  // Authentication state
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  departmentContext: any
  error: string | null
  
  // Authentication actions
  login: (credentials: any) => Promise<boolean>
  logout: () => void
  clearError: () => void
  
  // Permission checks
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasDepartmentAccess: (departmentId: string) => boolean
  
  // Utility functions
  requireAuth: () => void
  requirePermission: (permission: string) => boolean
  requireRole: (role: string) => boolean
}

export function useAuth(): UseAuthReturn {
  const {
    isAuthenticated,
    isLoading,
    user,
    departmentContext,
    error,
    login,
    logout,
    clearError,
    hasPermission,
  } = useAuthStore()
  
  const router = useRouter()

  const hasRole = useCallback((role: string): boolean => {
    return departmentContext?.userRole === role
  }, [departmentContext])

  const hasDepartmentAccess = useCallback((departmentId: string): boolean => {
    return departmentContext?.departmentId === departmentId
  }, [departmentContext])

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const requirePermission = useCallback((permission: string): boolean => {
    if (!hasPermission(permission)) {
      router.push('/unauthorized')
      return false
    }
    return true
  }, [hasPermission, router])

  const requireRole = useCallback((role: string): boolean => {
    if (!hasRole(role)) {
      router.push('/unauthorized')
      return false
    }
    return true
  }, [hasRole, router])

  return {
    // State
    isAuthenticated,
    isLoading,
    user,
    departmentContext,
    error,
    
    // Actions
    login,
    logout,
    clearError,
    
    // Permission checks
    hasPermission,
    hasRole,
    hasDepartmentAccess,
    
    // Utility functions
    requireAuth,
    requirePermission,
    requireRole,
  }
}