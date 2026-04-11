// API Configuration for ASP.NET Backend
// This file contains the API configuration for connecting to the Forms Management API

export const apiConfig = {
  // Base URL for the ASP.NET API
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api',
  
  // API endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      refresh: '/auth/refresh',
      logout: '/auth/logout',
      profile: '/auth/profile'
    },
    forms: {
      list: '/forms',
      create: '/forms',
      get: (id: string) => `/forms/${id}`,
      update: (id: string) => `/forms/${id}`,
      delete: (id: string) => `/forms/${id}`,
      publish: (id: string) => `/forms/${id}/publish`,
      unpublish: (id: string) => `/forms/${id}/unpublish`
    },
    submissions: {
      list: '/submissions',
      get: (id: string) => `/submissions/${id}`,
      create: '/submissions',
      update: (id: string) => `/submissions/${id}`,
      delete: (id: string) => `/submissions/${id}`,
      export: '/submissions/export'
    },
    departments: {
      list: '/departments',
      get: (id: string) => `/departments/${id}`,
      create: '/departments',
      update: (id: string) => `/departments/${id}`,
      delete: (id: string) => `/departments/${id}`
    },
    users: {
      list: '/users',
      get: (id: string) => `/users/${id}`,
      create: '/users',
      update: (id: string) => `/users/${id}`,
      delete: (id: string) => `/users/${id}`
    },
    files: {
      upload: '/files/upload',
      download: (path: string) => `/files/download/${path}`,
      delete: (path: string) => `/files/${path}`
    }
  },
  
  // Request configuration
  requestConfig: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000 // 1 second
  },
  
  // Headers
  getHeaders: (token?: string) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }),
  
  // Validation
  isValid(): boolean {
    return this.baseUrl !== 'https://your-api-domain.com/api'
  }
}

// Export individual values for easy access
export const {
  baseUrl,
  endpoints,
  requestConfig,
  getHeaders,
  isValid
} = apiConfig


