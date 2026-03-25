// API Service for communicating with ASP.NET Backend
import { apiConfig } from '@/config/api'

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export class ApiError extends Error {
  status: number
  errors?: string[]
  constructor(message: string, status: number, errors?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

class ApiService {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseUrl = apiConfig.baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      ...this.defaultHeaders,
      ...apiConfig.getHeaders(token),
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.errors
        )
      }

      const data = await response.json()
      return {
        data,
        success: true
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        0
      )
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.makeRequest(apiConfig.endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async register(userData: any): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.makeRequest(apiConfig.endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async getProfile(token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.auth.profile, {
      method: 'GET'
    }, token)
  }

  // Forms methods
  async getForms(token: string, params?: Record<string, any>): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.makeRequest(`${apiConfig.endpoints.forms.list}${queryString}`, {
      method: 'GET'
    }, token)
  }

  async getForm(id: string, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.forms.get(id), {
      method: 'GET'
    }, token)
  }

  async createForm(formData: any, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.forms.create, {
      method: 'POST',
      body: JSON.stringify(formData)
    }, token)
  }

  async updateForm(id: string, formData: any, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.forms.update(id), {
      method: 'PUT',
      body: JSON.stringify(formData)
    }, token)
  }

  async deleteForm(id: string, token: string): Promise<ApiResponse<void>> {
    return this.makeRequest(apiConfig.endpoints.forms.delete(id), {
      method: 'DELETE'
    }, token)
  }

  async publishForm(id: string, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.forms.publish(id), {
      method: 'POST'
    }, token)
  }

  async unpublishForm(id: string, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.forms.unpublish(id), {
      method: 'POST'
    }, token)
  }

  // Submissions methods
  async getSubmissions(token: string, params?: Record<string, any>): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.makeRequest(`${apiConfig.endpoints.submissions.list}${queryString}`, {
      method: 'GET'
    }, token)
  }

  async getSubmission(id: string, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.submissions.get(id), {
      method: 'GET'
    }, token)
  }

  async createSubmission(submissionData: any, token: string): Promise<ApiResponse<any>> {
    return this.makeRequest(apiConfig.endpoints.submissions.create, {
      method: 'POST',
      body: JSON.stringify(submissionData)
    }, token)
  }

  async exportSubmissions(token: string, params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.makeRequest(`${apiConfig.endpoints.submissions.export}${queryString}`, {
      method: 'GET'
    }, token)
  }

  // Departments methods
  async getDepartments(token: string): Promise<ApiResponse<any[]>> {
    return this.makeRequest(apiConfig.endpoints.departments.list, {
      method: 'GET'
    }, token)
  }

  // Users methods
  async getUsers(token: string, params?: Record<string, any>): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.makeRequest(`${apiConfig.endpoints.users.list}${queryString}`, {
      method: 'GET'
    }, token)
  }

  // File upload method
  async uploadFile(file: File, token: string): Promise<ApiResponse<{ url: string; path: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.makeRequest(apiConfig.endpoints.files.upload, {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type header to let browser set it with boundary
        'Authorization': `Bearer ${token}`
      }
    }, token)
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService

































