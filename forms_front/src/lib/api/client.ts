// API Client for Forms Management System
// Handles all HTTP requests to the backend API

import { withRetry, RETRY_CONFIGS, RetryConfig } from '../utils/retryLogic'
import { logError, logWarning, logInfo } from '../utils/errorLogger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net'

/**
 * Public API root including a single `/api` segment (matches ApiClient constructor).
 * Use for direct fetch() calls (e.g. auth refresh) so env values like `http://localhost:5000/api`
 * are not turned into `/api/api/...`.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net'
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

// Cache configuration
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Request deduplication
interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

// Error types for better error handling
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ApiError extends Error {
  public type: ApiErrorType
  public statusCode?: number
  public details?: any

  constructor(type: ApiErrorType, message: string, statusCode?: number, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
  }
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  [ApiErrorType.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
  [ApiErrorType.AUTHENTICATION_ERROR]: 'Your session has expired. Please log in again.',
  [ApiErrorType.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
  [ApiErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ApiErrorType.NOT_FOUND_ERROR]: 'The requested resource was not found.',
  [ApiErrorType.SERVER_ERROR]: 'A server error occurred. Please try again later.',
  [ApiErrorType.TIMEOUT_ERROR]: 'The request timed out. Please try again.',
  [ApiErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T | null
  errors: string[]
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// Types for API entities
export interface User {
  id: string
  name: string
  email: string
  departmentId: string
  roleId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  profile?: string | null
  customPermissions?: string | null
  emailVerifiedAt?: string | null
  lastLoginAt?: string | null
  // New fields from API response
  departmentName?: string
  roleName?: string
  department?: {
    id: string
    name: string
    code: string
  }
  role?: {
    id: string
    name: string
  }
  permissions?: Permission[]
}

export interface Department {
  id: string
  name: string
  code: string
  description: string
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
  userCount: number
  formCount: number
}

export interface Role {
  id: string
  departmentId: string
  name: string
  displayName: string
  description: string
  isSystemRole: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  departmentId: string
  name: string
  displayName?: string
  description: string
  resource: string
  action: string
  isActive: boolean
  createdAt: string
}

export interface Assignment {
  id: string
  userId: string
  departmentId: string
  roleId: string
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
  userName?: string
  userEmail?: string
  departmentName?: string
  roleName?: string
}

export interface Form {
  id: string
  title: string
  description?: string
  content: any // JSON field containing form schema and settings
  isPublished: boolean
  shareUrl?: string
  organizationId: string
  createdAt: string
  updatedAt: string
  // Legacy fields for backward compatibility
  departmentId?: string
  departmentName?: string
  name?: string
  code?: string
  formSchema?: any
  settings?: any
  createdBy?: string
  version?: number
  status?: 'Active' | 'Inactive' | 'Draft'
  organization?: {
    id: string
    name: string
  }
  department?: {
    id: string
    name: string
    code?: string
  }
}

export interface FormSubmission {
  id: string
  formId: string
  responseData: any
  formVersion: number
  submitterEmail?: string | null
  submittedAt: string
  form?: {
    id: string
    name: string
    title: string
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  departmentId: string
  role: string
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  departmentId: string
  roleId: string
  isActive?: boolean
}

export interface CreateDepartmentData {
  name: string
  code: string
  description: string
  settings?: Record<string, any>
}

export interface CreateRoleData {
  departmentId: string
  name: string
  displayName: string
  description: string
}

export interface CreatePermissionData {
  departmentId: string
  name: string
  description: string
  resource: string
  action: string
}

export interface CreateAssignmentData {
  userId: string
  departmentId: string
  roleId: string
  isActive?: boolean
}

export interface CreateFormData {
  name: string
  code: string
  title: string
  description: string
  formSchema: any
  settings: any
  status?: string
  departmentId?: string
  organizationId?: string
}

export interface SubmitFormData {
  responseData: any
  submitterEmail?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private refreshToken: string | null = null
  private user: User | null = null
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, PendingRequest<any>>()
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseURL: string = API_BASE_URL) {
    // Ensure the base URL includes /api
    this.baseURL = baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Client initialized with base URL:', this.baseURL)
    }
  }

  setToken(token: string | null) {
    this.token = token
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken
  }

  setUser(user: User | null) {
    this.user = user
  }

  getBaseURL(): string {
    return this.baseURL
  }

  // Manually sync token from localStorage (for debugging)
  syncTokenFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('auth-storage')
        console.log('Auth data from localStorage:', authData ? 'Data exists' : 'No data')
        if (authData) {
          const parsed = JSON.parse(authData)
          console.log('Parsed auth data:', parsed)
          const token = parsed.state?.token
          console.log('Token from storage:', token ? `Token found (${token.substring(0, 20)}...)` : 'No token in storage')
          if (token && token !== this.token) {
            console.log('Syncing token from localStorage')
            this.setToken(token)
          }
        }
      } catch (error) {
        console.error('Error syncing token from storage:', error)
      }
    }
  }

  // Get department context from current user
  // SuperAdmin users should NOT have department context added automatically
  private getDepartmentContext(): { departmentId?: string } {
    // Check if user is SuperAdmin
    const isSuperAdmin = this.user?.role?.name === 'SuperAdmin' || 
                         this.user?.roleName === 'SuperAdmin' ||
                         this.user?.permissions?.some(p => p.name === 'SuperAdmin')
    
    // Don't add department context for SuperAdmin
    if (isSuperAdmin) {
      return {}
    }
    
    return this.user?.departmentId ? { departmentId: this.user.departmentId } : {}
  }

  // Create cache key for request
  private createCacheKey(endpoint: string, options: RequestInit = {}): string {
    const method = options.method || 'GET'
    const body = options.body || ''
    return `${method}:${endpoint}:${body}`
  }

  // Check if cached response is valid
  private getCachedResponse<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  // Cache response
  private setCachedResponse<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Clear cache
  public clearCache(): void {
    this.cache.clear()
  }

  // Clear cache for specific pattern
  public clearCachePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Convert HTTP status to error type
  private getErrorType(status: number): ApiErrorType {
    switch (status) {
      case 401:
        return ApiErrorType.AUTHENTICATION_ERROR
      case 403:
        return ApiErrorType.AUTHORIZATION_ERROR
      case 400:
        return ApiErrorType.VALIDATION_ERROR
      case 404:
        return ApiErrorType.NOT_FOUND_ERROR
      case 408:
        return ApiErrorType.TIMEOUT_ERROR
      case 500:
      case 502:
      case 503:
      case 504:
        return ApiErrorType.SERVER_ERROR
      default:
        return ApiErrorType.UNKNOWN_ERROR
    }
  }

  // Create user-friendly error
  private createApiError(type: ApiErrorType, message?: string, statusCode?: number, details?: any): ApiError {
    const errorMessage = message || ERROR_MESSAGES[type] || 'An unexpected error occurred'
    return new ApiError(type, errorMessage, statusCode, details)
  }

  // Refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.refreshToken) {
      return false
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/Auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        this.setToken(data.data.token)
        this.setRefreshToken(data.data.refreshToken)
        
        // Notify auth store about token refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
            detail: { 
              token: data.data.token, 
              refreshToken: data.data.refreshToken,
              expiresAt: data.data.expiresAt
            } 
          }))
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    enableCache: boolean = false,
    cacheTtl: number = 300000,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET'
    const cacheKey = this.createCacheKey(endpoint, options)
    
    // Check cache for GET requests
    if (method === 'GET' && enableCache) {
      const cached = this.getCachedResponse<ApiResponse<T>>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Check for pending identical requests (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      const pending = this.pendingRequests.get(cacheKey)!
      // Clean up old pending requests (older than 30 seconds)
      if (Date.now() - pending.timestamp > 30000) {
        this.pendingRequests.delete(cacheKey)
      } else {
        return pending.promise as Promise<ApiResponse<T>>
      }
    }

    // Create the request promise
    const requestPromise = this.performRequest<T>(endpoint, options, enableCache, cacheTtl, retryConfig)
    
    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    })

    try {
      const result = await requestPromise
      return result
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async performRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    enableCache: boolean = false,
    cacheTtl: number = 300000,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const method = options.method || 'GET'
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${method} ${url}`)
      console.log('Auth token present:', !!this.token)
      console.log('Base URL:', this.baseURL)
      console.log('Full URL will be:', `${this.baseURL}${endpoint}`)
      if (this.token) {
        console.log('Token preview:', this.token.substring(0, 20) + '...')
      } else {
        console.log('No auth token available')
      }
    }
    
    // Add department context to request body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && options.body) {
      try {
        const bodyData = JSON.parse(options.body as string)
        const departmentContext = this.getDepartmentContext()
        
        console.log('POST/PUT Request Body Before:', bodyData)
        console.log('Department Context:', departmentContext)
        console.log('Body has departmentId:', !!bodyData.departmentId)
        console.log('Body has organizationId:', !!bodyData.organizationId)
        
        // Only add department context if not already present and if user has department
        // Don't override if departmentId or organizationId is explicitly provided
        if (departmentContext.departmentId && !bodyData.departmentId && !bodyData.organizationId) {
          console.log('Adding department context to body')
          bodyData.departmentId = departmentContext.departmentId
          options.body = JSON.stringify(bodyData)
        } else {
          console.log('Skipping department context - already has departmentId or organizationId')
        }
      } catch (error) {
        // If body is not JSON, continue without modification
      }
    }

    // Add department context to query parameters for GET requests
    // Skip this for endpoints that already have departmentId in the path
    if (method === 'GET' && !endpoint.includes('/department/')) {
      console.log('Checking if should add departmentId query param for endpoint:', endpoint)
      const departmentContext = this.getDepartmentContext()
      if (departmentContext.departmentId) {
        const separator = endpoint.includes('?') ? '&' : '?'
        
        // Check if departmentId is already in the endpoint
        if (!endpoint.includes('departmentId=')) {
          console.log('Adding departmentId query param to endpoint:', endpoint)
          endpoint = `${endpoint}${separator}departmentId=${departmentContext.departmentId}`
          console.log('Modified endpoint:', endpoint)
        }
      }
    } else if (method === 'GET' && endpoint.includes('/department/')) {
      console.log('Skipping departmentId query param for department endpoint:', endpoint)
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    // Wrap the actual request in retry logic
    const executeRequest = async (): Promise<ApiResponse<T>> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Handle 401 errors with token refresh
        if (response.status === 401 && this.refreshToken && !endpoint.includes('/Auth/')) {
          const refreshed = await this.refreshAccessToken()
          if (refreshed) {
            // Retry the request with new token
            headers.Authorization = `Bearer ${this.token}`
            const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
              ...options,
              headers,
            })
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              
              // Cache successful GET responses
              if (method === 'GET' && enableCache) {
                const cacheKey = this.createCacheKey(endpoint, options)
                this.setCachedResponse(cacheKey, retryData, cacheTtl)
              }
              
              return retryData
            } else {
              const retryErrorData = await retryResponse.json().catch(() => ({}))
              const errorType = this.getErrorType(retryResponse.status)
              
              // Handle different error response formats
              let errorMessage = ERROR_MESSAGES[errorType]
              
              if (retryErrorData.message) {
                errorMessage = retryErrorData.message
              } else if (retryErrorData.title) {
                errorMessage = retryErrorData.title
                if (retryErrorData.errors) {
                  const validationErrors = Object.entries(retryErrorData.errors)
                    .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                    .join('; ')
                  if (validationErrors) {
                    errorMessage += ` - ${validationErrors}`
                  }
                }
              } else if (retryErrorData.error) {
                errorMessage = retryErrorData.error
              }
              
              const apiError = this.createApiError(errorType, errorMessage, retryResponse.status, retryErrorData)
              
              // Log the error
              logError(apiError, {
                endpoint,
                method,
                statusCode: retryResponse.status,
                attempt: 'token-refresh-retry'
              })
              
              throw apiError
            }
          } else {
            // Refresh failed, notify about authentication error
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('authenticationFailed'))
            }
            const authError = this.createApiError(ApiErrorType.AUTHENTICATION_ERROR, ERROR_MESSAGES[ApiErrorType.AUTHENTICATION_ERROR], 401)
            
            logError(authError, {
              endpoint,
              method,
              reason: 'token-refresh-failed'
            })
            
            throw authError
          }
        }

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const errorType = this.getErrorType(response.status)
          
          // Handle different error response formats
          let errorMessage = ERROR_MESSAGES[errorType]
          
          if (data.message) {
            // Standard API response format
            errorMessage = data.message
          } else if (data.title) {
            // ASP.NET Core validation error format
            errorMessage = data.title
            if (data.errors) {
              // Extract validation errors
              const validationErrors = Object.entries(data.errors)
                .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                .join('; ')
              if (validationErrors) {
                errorMessage += ` - ${validationErrors}`
              }
            }
          } else if (data.error) {
            // Alternative error format
            errorMessage = data.error
          }
          
          const apiError = this.createApiError(errorType, errorMessage, response.status, data)
          
          // Enhanced error logging
          console.error('API Error Details:', {
            url: `${this.baseURL}${endpoint}`,
            method,
            statusCode: response.status,
            statusText: response.statusText,
            responseData: data,
            requestHeaders: headers
          })
          
          logError(apiError, {
            endpoint,
            method,
            statusCode: response.status,
            responseData: data
          })
          
          throw apiError
        }

        // Cache successful GET responses
        if (method === 'GET' && enableCache) {
          const cacheKey = this.createCacheKey(endpoint, options)
          this.setCachedResponse(cacheKey, data, cacheTtl)
        }

        // Clear related cache entries for non-GET requests
        if (method !== 'GET') {
          this.clearCachePattern(endpoint.split('?')[0])
        }

        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          logInfo(`API request successful: ${method} ${endpoint}`, {
            statusCode: response.status,
            cached: false
          })
        }

        return data
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (error instanceof ApiError) {
          throw error
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const networkError = this.createApiError(ApiErrorType.NETWORK_ERROR, ERROR_MESSAGES[ApiErrorType.NETWORK_ERROR])
          logError(networkError, { endpoint, method, originalError: error.message })
          throw networkError
        }

        // Handle timeout errors
        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutError = this.createApiError(ApiErrorType.TIMEOUT_ERROR, ERROR_MESSAGES[ApiErrorType.TIMEOUT_ERROR])
          logError(timeoutError, { endpoint, method })
          throw timeoutError
        }

        // Handle other errors
        const unknownError = this.createApiError(
          ApiErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'An unexpected error occurred'
        )
        logError(unknownError, { endpoint, method, originalError: error })
        throw unknownError
      }
    }

    // Execute request with retry logic
    try {
      const config = retryConfig || RETRY_CONFIGS.API_CALL
      return await withRetry(executeRequest, {
        ...config,
        onRetry: (attempt, error) => {
          logWarning(`Retrying API request (attempt ${attempt}): ${method} ${endpoint}`, {
            error: error.message,
            attempt,
            maxAttempts: config.maxAttempts
          })
        }
      })
    } catch (error) {
      // Final error after all retries
      if (error instanceof ApiError) {
        logError(error, {
          endpoint,
          method,
          finalAttempt: true
        })
      }
      throw error
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<{
    token: string
    refreshToken: string
    user: User
    expiresAt: string
  }>> {
    const response = await this.request<{
      token: string
      refreshToken: string
      user: User
      expiresAt: string
    }>('/Auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    
    // Store user and refresh token for department context and token refresh
    if (response.success && response.data) {
      this.setUser(response.data.user)
      this.setRefreshToken(response.data.refreshToken)
    }
    
    return response
  }

  async register(data: RegisterData): Promise<ApiResponse<User>> {
    return this.request('/Auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.request<null>('/Auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    })
    
    // Clear tokens and user data regardless of response
    this.setToken(null)
    this.setRefreshToken(null)
    this.setUser(null)
    this.clearCache()
    
    return response
  }



  // Department endpoints
  async getDepartments(params?: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortDescending?: boolean
  }): Promise<ApiResponse<PaginatedResponse<Department>>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortDescending !== undefined) searchParams.append('sortDescending', params.sortDescending.toString())
    
    const query = searchParams.toString()
    return this.request(`/departments${query ? `?${query}` : ''}`, {}, false, 0) // Disable cache for fresh data
  }

  async getDepartment(id: string): Promise<ApiResponse<Department>> {
    return this.request(`/departments/${id}`, {}, false, 0) // Disable cache for fresh data
  }

  async createDepartment(data: CreateDepartmentData): Promise<ApiResponse<Department>> {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDepartment(id: string, data: Partial<CreateDepartmentData>): Promise<ApiResponse<Department>> {
    const response = await this.request<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    // Ensure department list cache is invalidated after updates
    this.clearCachePattern('/departments')
    return response
  }

  async deleteDepartment(id: string): Promise<ApiResponse<null>> {
    const response = await this.request<null>(`/departments/${id}`, {
      method: 'DELETE',
    })
    // Ensure department list cache is invalidated after deletions
    this.clearCachePattern('/departments')
    return response
  }

  // User endpoints
  async getUsers(params?: {
    departmentId?: string
    roleId?: string
    isActive?: boolean
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const searchParams = new URLSearchParams()
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId)
    if (params?.roleId) searchParams.append('roleId', params.roleId)
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString())
    
    const query = searchParams.toString()
    return this.request(`/users${query ? `?${query}` : ''}`, {}, false, 0) // No cache for fresh data
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`, {}, true, 300000) // Cache for 5 minutes
  }

  async createUser(data: CreateUserData): Promise<ApiResponse<User>> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: Partial<CreateUserData & { isActive?: boolean }>): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Assignment endpoints
  async getAssignmentsByUser(userId: string): Promise<ApiResponse<Assignment[]>> {
    return this.request(`/assignment/user/${userId}`, {}, false, 0)
  }

  async createAssignment(data: CreateAssignmentData): Promise<ApiResponse<Assignment>> {
    return this.request('/assignment', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async activateAssignment(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/assignment/${id}/activate`, {
      method: 'PATCH',
    })
  }

  async deactivateAssignment(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/assignment/${id}/deactivate`, {
      method: 'PATCH',
    })
  }

  async deleteAssignment(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/assignment/${id}`, {
      method: 'DELETE',
    })
  }

  // Role endpoints
  async getRoles(params?: { departmentId?: string }): Promise<ApiResponse<PaginatedResponse<Role>>> {
    // Clear cache to ensure fresh requests
    this.clearCachePattern('/roles')
    
    console.log('getRoles called with params:', params)
    
    if (params?.departmentId) {
      const endpoint = `/Roles/department/${params.departmentId}`
      console.log('Using department-specific endpoint:', endpoint)
      
      return this.request(endpoint, {
        headers: {
          'accept': 'text/plain'
        }
      }, false, 0) // No cache for debugging
    }
    
    // Fallback to general roles endpoint if no departmentId provided
    return this.request('/Roles', {
      headers: {
        'accept': 'text/plain'
      }
    }, false, 0) // No cache for debugging
  }

  async createRole(data: CreateRoleData): Promise<ApiResponse<Role>> {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Permission endpoints
  async getPermissions(params?: { departmentId?: string }): Promise<ApiResponse<PaginatedResponse<Permission>>> {
    const searchParams = new URLSearchParams()
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId)
    
    const query = searchParams.toString()
    return this.request(`/permissions${query ? `?${query}` : ''}`, {}, true, 600000) // Cache for 10 minutes
  }

  async createPermission(data: CreatePermissionData): Promise<ApiResponse<Permission>> {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Form endpoints
  async getForms(params?: {
    departmentId?: string
    status?: string
    createdBy?: string
  }): Promise<ApiResponse<PaginatedResponse<Form>>> {
    const searchParams = new URLSearchParams()
    if (params?.departmentId) searchParams.append('departmentId', params.departmentId)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.createdBy) searchParams.append('createdBy', params.createdBy)
    
    const query = searchParams.toString()
    return this.request(`/forms${query ? `?${query}` : ''}`, {}, true, 300000) // Cache for 5 minutes
  }

  async getForm(id: string): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}`, {}, true, 300000) // Cache for 5 minutes
  }

  async createForm(data: CreateFormData): Promise<ApiResponse<Form>> {
    return this.request('/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateForm(id: string, data: Partial<CreateFormData>): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patchForm(id: string, data: any): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async publishForm(id: string): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: true }),
    })
  }

  async unpublishForm(id: string): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished: false }),
    })
  }
  async toggleFormStatus(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/forms/${id}/toggle-status`, {
      method: 'PATCH',
    })
  }

  async deleteForm(id: string): Promise<ApiResponse<null>> {
    return this.request(`/forms/${id}`, {
      method: 'DELETE',
    })
  }

  // Form submission endpoints
  async getFormSubmissions(
    formId: string,
    params?: {
      page?: number
      pageSize?: number
      startDate?: string
      endDate?: string
    }
  ): Promise<ApiResponse<PaginatedResponse<FormSubmission>>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    
    const query = searchParams.toString()
    const response = await this.request<
      PaginatedResponse<FormSubmission> & { totalItems?: number; TotalItems?: number; Items?: FormSubmission[] }
    >(`/forms/${formId}/submissions${query ? `?${query}` : ''}`, {}, true, 60000)

    if (!response.success || !response.data) {
      return response as ApiResponse<PaginatedResponse<FormSubmission>>
    }

    const raw = response.data
    const items = raw.items ?? raw.Items ?? []
    const totalCount =
      typeof raw.totalCount === 'number'
        ? raw.totalCount
        : typeof raw.totalItems === 'number'
          ? raw.totalItems
          : typeof raw.TotalItems === 'number'
            ? raw.TotalItems
            : 0
    const page = raw.page ?? 1
    const pageSize = raw.pageSize ?? 10
    const totalPages =
      typeof raw.totalPages === 'number'
        ? raw.totalPages
        : pageSize > 0
          ? Math.ceil(totalCount / pageSize)
          : 0

    return {
      ...response,
      data: {
        items,
        totalCount,
        page,
        pageSize,
        totalPages,
      },
    }
  }

  async submitForm(formId: string, data: SubmitFormData): Promise<ApiResponse<{
    id: string
    formId: string
    submittedAt: string
    submissionId: string
  }>> {
    return this.request(`/forms/${formId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getSubmission(id: string): Promise<ApiResponse<FormSubmission>> {
    return this.request(`/submissions/${id}`, {}, true, 300000) // Cache for 5 minutes
  }

  // Form preview endpoints (requires authentication - internal archiving system)
  async getFormPreview(id: string): Promise<ApiResponse<Form>> {
    return this.request(`/forms/${id}/preview`, {}, false, 0) // Auth sent via token header
  }

  async getFormPreviewByCode(code: string): Promise<ApiResponse<Form>> {
    return this.request(`/forms/code/${code}/preview`, {}, false, 0) // Auth sent via token header
  }

  // Webhook endpoints
  async configureWebhook(
    formId: string,
    data: {
      url: string
      events: string[]
      secret: string
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/forms/${formId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Guest form endpoints - uses authenticated request() to forward token to backend
  async getGuestFormPreview(formIdOrCode: string): Promise<ApiResponse<Form>> {
    // First try by ID endpoint for regular dashboard navigation.
    try {
      return await this.request(`/forms/${formIdOrCode}`, {}, false, 0)
    } catch (error) {
      // Fallback to code-based preview endpoint for QR / code-based flows.
      if (error instanceof ApiError && error.statusCode === 404) {
        return this.request(`/forms/code/${encodeURIComponent(formIdOrCode)}/preview`, {}, false, 0)
      }
      throw error
    }
  }

  async getGuestFormPreviewByCode(code: string): Promise<ApiResponse<Form>> {
    // Use the dedicated backend endpoint for code-based preview.
    return this.request(`/forms/code/${encodeURIComponent(code)}/preview`, {}, false, 0)
  }

  // Internal submit form endpoint (requires authentication)
  async submitGuestForm(
    formId: string,
    data: {
      responseData: any
      submitterEmail?: string
      formVersion?: number
    }
  ): Promise<ApiResponse<FormSubmission>> {
    return this.request(`/forms/${formId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) // Auth required - internal archiving system
  }

  async submitGuestFormWithVersion(
    formId: string,
    versionNumber: number,
    data: {
      responseData: any
      submitterEmail?: string
    }
  ): Promise<ApiResponse<FormSubmission>> {
    return this.request(`/formsubmissions/form/${formId}/version/${versionNumber}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) // Auth required - internal archiving system
  }

  async submitGuestFormLatest(
    formId: string,
    data: {
      responseData: any
      submitterEmail?: string
    }
  ): Promise<ApiResponse<FormSubmission>> {
    return this.request(`/formsubmissions/form/${formId}/latest`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) // Auth required - internal archiving system
  }

  async validateGuestFormData(
    formId: string,
    responseData: any
  ): Promise<ApiResponse<boolean>> {
    return this.request(`/formsubmissions/form/${formId}/validate`, {
      method: 'POST',
      body: JSON.stringify(responseData),
    }) // Auth required
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()

// Helper function to get token from localStorage
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.state?.token || null
    }
  } catch (error) {
    console.error('Error getting stored token:', error)
  }
  return null
}

// Utility function to handle API errors consistently
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

// Initialize API client with stored token
if (typeof window !== 'undefined') {
  const token = getStoredToken()
  if (token) {
    apiClient.setToken(token)
  }
}
