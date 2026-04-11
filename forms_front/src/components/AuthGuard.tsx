'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/useAuthStore'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermissions?: string[]
  requiredRole?: string
  departmentId?: string
  fallbackPath?: string
  showUnauthorized?: boolean
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  requiredPermissions = [],
  requiredRole,
  departmentId,
  fallbackPath = '/login',
  showUnauthorized = false
}: AuthGuardProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    departmentContext, 
    hasPermission,
    error,
    clearError
  } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitialized, setIsInitialized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Clear any previous auth errors when component mounts
    clearError()
    setIsInitialized(true)
  }, [clearError])

  useEffect(() => {
    if (!isInitialized || isLoading) return

    // Handle authentication requirements
    if (requireAuth && !isAuthenticated) {
      // Store the current path for redirect after login
      const returnUrl = encodeURIComponent(pathname)
      router.push(`${fallbackPath}?returnUrl=${returnUrl}`)
      return
    }

    if (!requireAuth && isAuthenticated) {
      router.push('/')
      return
    }

    // If authenticated, check additional requirements
    if (isAuthenticated && user) {
      let hasAccess = true
      let errorMessage = ''

      // Check department context validation
      if (departmentId && departmentContext?.departmentId !== departmentId) {
        hasAccess = false
        errorMessage = 'You do not have access to this department\'s resources.'
      }

      // Check role-based access
      if (requiredRole && departmentContext?.userRole !== requiredRole) {
        hasAccess = false
        errorMessage = `This page requires ${requiredRole} role access.`
      }

      // Check permission-based access
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(permission => 
          hasPermission(permission)
        )
        
        if (!hasAllPermissions) {
          hasAccess = false
          const missingPermissions = requiredPermissions.filter(permission => 
            !hasPermission(permission)
          )
          errorMessage = `Missing required permissions: ${missingPermissions.join(', ')}`
        }
      }

      if (!hasAccess) {
        setAuthError(errorMessage)
        if (!showUnauthorized) {
          router.push('/unauthorized')
        }
        return
      }

      // Clear any previous errors if access is granted
      setAuthError(null)
    }
  }, [
    isInitialized,
    isAuthenticated, 
    isLoading, 
    requireAuth, 
    user,
    departmentContext,
    requiredPermissions,
    requiredRole,
    departmentId,
    fallbackPath,
    showUnauthorized,
    pathname,
    router,
    hasPermission
  ])

  // Show loading spinner while checking authentication
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show authentication error if present
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              clearError()
              router.push('/login')
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Show authorization error if access is denied
  if (authError && showUnauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          </div>
          <p className="text-gray-600 mb-4">{authError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Don't render children if authentication requirements aren't met
  if (requireAuth && !isAuthenticated) {
    return null
  }

  if (!requireAuth && isAuthenticated) {
    return null
  }

  // Don't render if there's an authorization error and we're not showing the unauthorized page
  if (authError && !showUnauthorized) {
    return null
  }

  return <>{children}</>
}

