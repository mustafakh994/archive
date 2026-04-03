'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, User, LoginCredentials, RegisterData, ApiError, ApiErrorType } from '@/lib/api/client'
import { syncAuthAccessCookie } from '@/lib/auth-cookie'

export interface AuthResponse {
  token: string
  refreshToken: string
  user: User
  expiresAt: string
}

export interface DepartmentContext {
  departmentId: string
  departmentName: string
  departmentCode: string
  userRole: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  expiresAt: string | null
  departmentContext: DepartmentContext | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isTokenRefreshing: boolean
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => Promise<void>
  refreshAuthToken: () => Promise<boolean>
  checkTokenExpiration: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  handleTokenRefresh: (token: string, refreshToken: string, expiresAt?: string) => void
  handleAuthenticationFailure: () => void
  getDepartmentContext: () => DepartmentContext | null
  hasPermission: (permission: string) => boolean
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
      departmentContext: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isTokenRefreshing: false,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.login(credentials)

          if (response.success && response.data) {
            const { token, refreshToken, user, expiresAt } = response.data

            // Create department context from user data
            const departmentContext: DepartmentContext = {
              departmentId: user.departmentId,
              departmentName: user.departmentName || user.department?.name || '',
              departmentCode: user.department?.code || '',
              userRole: user.roleName || user.role?.name || '',
              permissions: user.permissions?.map(p => p.name) || []
            }

            // Set token and user in API client for future requests
            apiClient.setToken(token)
            apiClient.setRefreshToken(refreshToken)
            apiClient.setUser(user)

            set({
              user,
              token,
              refreshToken,
              expiresAt,
              departmentContext,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })

            syncAuthAccessCookie(token)

            // Start token expiration monitoring
            get().checkTokenExpiration()

            return true
          } else {
            set({
              isLoading: false,
              error: response.message || 'Login failed',
            })
            return false
          }
        } catch (error) {
          let errorMessage = 'Network error. Please check your connection.'

          if (error instanceof Error && 'type' in error) {
            const apiError = error as ApiError
            errorMessage = apiError.message
          } else if (error instanceof Error) {
            errorMessage = error.message
          }

          set({
            isLoading: false,
            error: errorMessage,
          })
          return false
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.register(data)

          if (response.success && response.data) {
            set({
              isLoading: false,
              error: null,
            })
            return true
          } else {
            set({
              isLoading: false,
              error: response.message || 'Registration failed',
            })
            return false
          }
        } catch (error) {
          let errorMessage = 'Network error. Please check your connection.'

          if (error instanceof Error && 'type' in error) {
            const apiError = error as ApiError
            errorMessage = apiError.message
          } else if (error instanceof Error) {
            errorMessage = error.message
          }

          set({
            isLoading: false,
            error: errorMessage,
          })
          return false
        }
      },

      logout: async () => {
        try {
          // Call backend logout endpoint to revoke refresh token
          await apiClient.logout()
        } catch (error) {
          // Log error but continue with local logout
          console.error('Logout API call failed:', error)
        }

        // Clear all data from API client
        apiClient.setToken(null)
        apiClient.setRefreshToken(null)
        apiClient.setUser(null)
        apiClient.clearCache()

        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          departmentContext: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          isTokenRefreshing: false,
        })

        syncAuthAccessCookie(null)
      },

      refreshAuthToken: async () => {
        const state = get()

        if (state.isTokenRefreshing || !state.refreshToken) {
          return false
        }

        set({ isTokenRefreshing: true })

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net'}/api/Auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: state.refreshToken }),
          })

          if (!response.ok) {
            throw new Error('Token refresh failed')
          }

          const data = await response.json()

          if (data.success && data.data) {
            const { token, refreshToken, expiresAt } = data.data

            // Update tokens in API client
            apiClient.setToken(token)
            apiClient.setRefreshToken(refreshToken)

            set({
              token,
              refreshToken,
              expiresAt,
              isTokenRefreshing: false,
              error: null, // Clear any previous errors
            })

            syncAuthAccessCookie(token)

            // Restart token expiration monitoring with a delay
            setTimeout(() => {
              get().checkTokenExpiration()
            }, 1000)

            return true
          }

          throw new Error('Invalid refresh response')
        } catch (error) {
          console.error('Token refresh failed:', error)
          set({ isTokenRefreshing: false })

          // Only logout if refresh token is also invalid
          // Give user a chance to re-login manually
          set({
            error: 'Your session has expired. Please log in again.',
            isAuthenticated: false
          })
          return false
        }
      },

      checkTokenExpiration: () => {
        const state = get()

        if (!state.expiresAt || !state.isAuthenticated || state.isTokenRefreshing) {
          return
        }

        const expirationTime = new Date(state.expiresAt).getTime()
        const currentTime = Date.now()
        const timeUntilExpiration = expirationTime - currentTime

        // If token expires in less than 5 minutes, refresh it
        const refreshThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

        if (timeUntilExpiration <= refreshThreshold) {
          if (timeUntilExpiration <= -60000) { // Only logout if token expired more than 1 minute ago
            // Token expired long ago, logout
            get().handleAuthenticationFailure()
          } else {
            // Token expires soon or recently expired, try to refresh it
            get().refreshAuthToken()
          }
        } else {
          // Schedule next check - check more frequently as expiration approaches
          const checkInterval = Math.min(timeUntilExpiration - refreshThreshold, 5 * 60 * 1000) // Check at most every 5 minutes
          setTimeout(() => {
            get().checkTokenExpiration()
          }, checkInterval)
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

      // Handle token refresh from API client
      handleTokenRefresh: (token: string, refreshToken: string, expiresAt?: string) => {
        set({
          token,
          refreshToken,
          expiresAt: expiresAt || null,
        })

        syncAuthAccessCookie(token)

        // Restart token expiration monitoring if expiresAt is provided
        if (expiresAt) {
          get().checkTokenExpiration()
        }
      },

      // Handle authentication failure from API client
      handleAuthenticationFailure: () => {
        const state = get()

        // Prevent multiple simultaneous logout calls
        if (!state.isAuthenticated) {
          return
        }

        // Clear all auth data
        apiClient.setToken(null)
        apiClient.setRefreshToken(null)
        apiClient.setUser(null)
        apiClient.clearCache()

        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          departmentContext: null,
          isAuthenticated: false,
          isLoading: false,
          isTokenRefreshing: false,
          error: 'Your session has expired. Please log in again.',
        })

        syncAuthAccessCookie(null)
      },

      // Get current department context
      getDepartmentContext: () => {
        return get().departmentContext
      },

      // Check if user has specific permission
      hasPermission: (permission: string) => {
        const state = get()

        // Get role name from either the new field or nested object
        const roleName = state.user?.roleName || state.user?.role?.name

        // SuperAdmin has all permissions
        if (roleName === 'SuperAdmin') {
          return true
        }

        // DepartmentAdmin has most permissions within their department
        if (roleName === 'DepartmentAdmin') {
          return true
        }

        // Check specific permissions for other roles
        return state.departmentContext?.permissions.includes(permission) || false
      },

      // Initialize authentication state on app start
      initializeAuth: () => {
        const state = get()

        if (state.token && state.user) {
          // Sync with API client
          apiClient.setToken(state.token)
          apiClient.setRefreshToken(state.refreshToken)
          apiClient.setUser(state.user)

          // Check if token is expired before starting monitoring
          if (state.expiresAt) {
            const expirationTime = new Date(state.expiresAt).getTime()
            const currentTime = Date.now()
            const timeUntilExpiration = expirationTime - currentTime

            // If token expired more than 5 minutes ago, logout immediately
            if (timeUntilExpiration <= -5 * 60 * 1000) {
              state.handleAuthenticationFailure()
              return
            }
          }

          // Start token expiration monitoring with a delay to avoid race conditions
          setTimeout(() => {
            state.checkTokenExpiration()
          }, 2000)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        departmentContext: state.departmentContext,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        syncAuthAccessCookie(state?.token ?? null)
        // Sync all auth data to API client when store is rehydrated
        if (state?.token) {
          apiClient.setToken(state.token)
        }
        if (state?.refreshToken) {
          apiClient.setRefreshToken(state.refreshToken)
        }
        if (state?.user) {
          apiClient.setUser(state.user)
        }

        // Initialize authentication monitoring
        if (state?.isAuthenticated) {
          // Use setTimeout to ensure this runs after the store is fully hydrated
          setTimeout(() => {
            useAuthStore.getState().initializeAuth()
          }, 0)
        }

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth store rehydrated:', {
            hasToken: !!state?.token,
            hasUser: !!state?.user,
            isAuthenticated: state?.isAuthenticated
          })
        }
      },
    }
  )
)

// Set up event listeners for API client events
if (typeof window !== 'undefined') {
  // Listen for token refresh events
  window.addEventListener('tokenRefreshed', (event: any) => {
    const { token, refreshToken, expiresAt } = event.detail
    useAuthStore.getState().handleTokenRefresh(token, refreshToken, expiresAt)
  })

  // Listen for authentication failure events
  window.addEventListener('authenticationFailed', () => {
    useAuthStore.getState().handleAuthenticationFailure()
  })

  // Initialize auth on page load
  document.addEventListener('DOMContentLoaded', () => {
    useAuthStore.getState().initializeAuth()
  })
}

