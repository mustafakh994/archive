import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../useAuthStore'
import { apiClient } from '@/lib/api/client'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    login: jest.fn(),
    register: jest.fn(),
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    setUser: jest.fn(),
    clearCache: jest.fn(),
  },
}))

// Mock window events
const mockDispatchEvent = jest.fn()
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
})

// Mock fetch for token refresh
global.fetch = jest.fn()

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
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
  })

  describe('login', () => {
    it('should login successfully and set department context', async () => {
      const mockUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        departmentId: 'dept-1',
        roleId: 'role-1',
        isActive: true,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        department: {
          id: 'dept-1',
          name: 'HR',
          code: 'HR',
        },
        role: {
          id: 'role-1',
          name: 'Admin',
        },
        permissions: [
          { name: 'create_forms' },
          { name: 'manage_users' },
        ],
      }

      const mockResponse = {
        success: true,
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser,
          expiresAt: '2023-01-01T12:00:00Z',
        },
      }

      ;(apiClient.login as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const success = await result.current.login({
          email: 'john@example.com',
          password: 'password',
        })
        expect(success).toBe(true)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe('mock-token')
      expect(result.current.refreshToken).toBe('mock-refresh-token')
      expect(result.current.departmentContext).toEqual({
        departmentId: 'dept-1',
        departmentName: 'HR',
        departmentCode: 'HR',
        userRole: 'Admin',
        permissions: ['create_forms', 'manage_users'],
      })
    })

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials',
        data: null,
      }

      ;(apiClient.login as jest.Mock).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        const success = await result.current.login({
          email: 'john@example.com',
          password: 'wrong-password',
        })
        expect(success).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe('Invalid credentials')
    })
  })

  describe('logout', () => {
    it('should clear all authentication data', () => {
      const { result } = renderHook(() => useAuthStore())

      // Set some initial state
      act(() => {
        useAuthStore.setState({
          user: { id: '1' } as any,
          token: 'token',
          refreshToken: 'refresh-token',
          departmentContext: { departmentId: 'dept-1' } as any,
          isAuthenticated: true,
        })
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.refreshToken).toBeNull()
      expect(result.current.departmentContext).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(apiClient.setToken).toHaveBeenCalledWith(null)
      expect(apiClient.setRefreshToken).toHaveBeenCalledWith(null)
      expect(apiClient.setUser).toHaveBeenCalledWith(null)
      expect(apiClient.clearCache).toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
          expiresAt: '2023-01-01T13:00:00Z',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { result } = renderHook(() => useAuthStore())

      // Set initial refresh token
      act(() => {
        useAuthStore.setState({
          refreshToken: 'old-refresh-token',
        })
      })

      await act(async () => {
        const success = await result.current.refreshToken()
        expect(success).toBe(true)
      })

      expect(result.current.token).toBe('new-token')
      expect(result.current.refreshToken).toBe('new-refresh-token')
      expect(result.current.expiresAt).toBe('2023-01-01T13:00:00Z')
    })

    it('should handle refresh token failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      })

      const { result } = renderHook(() => useAuthStore())

      // Set initial state
      act(() => {
        useAuthStore.setState({
          refreshToken: 'old-refresh-token',
          isAuthenticated: true,
        })
      })

      await act(async () => {
        const success = await result.current.refreshToken()
        expect(success).toBe(false)
      })

      // Should trigger authentication failure
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should check permissions correctly', () => {
      const { result } = renderHook(() => useAuthStore())

      act(() => {
        useAuthStore.setState({
          departmentContext: {
            departmentId: 'dept-1',
            departmentName: 'HR',
            departmentCode: 'HR',
            userRole: 'Admin',
            permissions: ['create_forms', 'manage_users'],
          },
        })
      })

      expect(result.current.hasPermission('create_forms')).toBe(true)
      expect(result.current.hasPermission('delete_forms')).toBe(false)
    })
  })

  describe('getDepartmentContext', () => {
    it('should return department context', () => {
      const { result } = renderHook(() => useAuthStore())

      const mockContext = {
        departmentId: 'dept-1',
        departmentName: 'HR',
        departmentCode: 'HR',
        userRole: 'Admin',
        permissions: ['create_forms'],
      }

      act(() => {
        useAuthStore.setState({
          departmentContext: mockContext,
        })
      })

      expect(result.current.getDepartmentContext()).toEqual(mockContext)
    })
  })

  describe('handleAuthenticationFailure', () => {
    it('should clear all data and set error message', () => {
      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: { id: '1' } as any,
          token: 'token',
          refreshToken: 'refresh-token',
          departmentContext: { departmentId: 'dept-1' } as any,
          isAuthenticated: true,
        })
      })

      act(() => {
        result.current.handleAuthenticationFailure()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.refreshToken).toBeNull()
      expect(result.current.departmentContext).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe('Your session has expired. Please log in again.')
    })
  })
})