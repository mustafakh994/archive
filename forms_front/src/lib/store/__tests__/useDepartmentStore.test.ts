import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useDepartmentStore } from '../useDepartmentStore'
import { apiClient } from '@/lib/api/client'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    getDepartments: vi.fn(),
    getDepartment: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  },
}))

const mockApiClient = apiClient as any

describe('useDepartmentStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useDepartmentStore.setState({
      departments: [],
      currentDepartment: null,
      userDepartment: null,
      isLoading: false,
      error: null,
    })
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('fetchDepartments', () => {
    it('should fetch departments successfully', async () => {
      const mockDepartments = [
        {
          id: '1',
          name: 'IT Department',
          code: 'IT',
          description: 'Information Technology',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'HR Department',
          code: 'HR',
          description: 'Human Resources',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      mockApiClient.getDepartments.mockResolvedValue({
        success: true,
        message: 'Success',
        data: mockDepartments,
        errors: [],
      })

      const { result } = renderHook(() => useDepartmentStore())

      await act(async () => {
        await result.current.fetchDepartments()
      })

      expect(result.current.departments).toEqual(mockDepartments)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockApiClient.getDepartments).toHaveBeenCalledTimes(1)
    })

    it('should handle API error response', async () => {
      mockApiClient.getDepartments.mockResolvedValue({
        success: false,
        message: 'Failed to fetch departments',
        data: null,
        errors: ['Network error'],
      })

      const { result } = renderHook(() => useDepartmentStore())

      await act(async () => {
        await result.current.fetchDepartments()
      })

      expect(result.current.departments).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch departments')
    })

    it('should handle network error', async () => {
      mockApiClient.getDepartments.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useDepartmentStore())

      await act(async () => {
        await result.current.fetchDepartments()
      })

      expect(result.current.departments).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Network error')
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockApiClient.getDepartments.mockReturnValue(promise)

      const { result } = renderHook(() => useDepartmentStore())

      act(() => {
        result.current.fetchDepartments()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!({
          success: true,
          message: 'Success',
          data: [],
          errors: [],
        })
        await promise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('fetchDepartment', () => {
    it('should fetch single department successfully', async () => {
      const mockDepartment = {
        id: '1',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockApiClient.getDepartment.mockResolvedValue({
        success: true,
        message: 'Success',
        data: mockDepartment,
        errors: [],
      })

      const { result } = renderHook(() => useDepartmentStore())

      await act(async () => {
        await result.current.fetchDepartment('1')
      })

      expect(result.current.currentDepartment).toEqual(mockDepartment)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockApiClient.getDepartment).toHaveBeenCalledWith('1')
    })

    it('should handle fetch department error', async () => {
      mockApiClient.getDepartment.mockResolvedValue({
        success: false,
        message: 'Department not found',
        data: null,
        errors: ['Not found'],
      })

      const { result } = renderHook(() => useDepartmentStore())

      await act(async () => {
        await result.current.fetchDepartment('999')
      })

      expect(result.current.currentDepartment).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Department not found')
    })
  })

  describe('createDepartment', () => {
    it('should create department successfully', async () => {
      const newDepartmentData = {
        name: 'Finance Department',
        code: 'FIN',
        description: 'Finance and Accounting',
      }

      const createdDepartment = {
        id: '3',
        ...newDepartmentData,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockApiClient.createDepartment.mockResolvedValue({
        success: true,
        message: 'Department created',
        data: createdDepartment,
        errors: [],
      })

      const { result } = renderHook(() => useDepartmentStore())

      let success: boolean
      await act(async () => {
        success = await result.current.createDepartment(newDepartmentData)
      })

      expect(success!).toBe(true)
      expect(result.current.departments).toContain(createdDepartment)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockApiClient.createDepartment).toHaveBeenCalledWith(newDepartmentData)
    })

    it('should handle create department error', async () => {
      const newDepartmentData = {
        name: 'Finance Department',
        code: 'FIN',
        description: 'Finance and Accounting',
      }

      mockApiClient.createDepartment.mockResolvedValue({
        success: false,
        message: 'Department code already exists',
        data: null,
        errors: ['Validation error'],
      })

      const { result } = renderHook(() => useDepartmentStore())

      let success: boolean
      await act(async () => {
        success = await result.current.createDepartment(newDepartmentData)
      })

      expect(success!).toBe(false)
      expect(result.current.departments).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Department code already exists')
    })
  })

  describe('updateDepartment', () => {
    it('should update department successfully', async () => {
      const existingDepartment = {
        id: '1',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      const updateData = {
        name: 'Information Technology Department',
        description: 'Updated IT Department',
      }

      const updatedDepartment = {
        ...existingDepartment,
        ...updateData,
        updatedAt: '2023-01-02T00:00:00Z',
      }

      // Set initial state
      const { result } = renderHook(() => useDepartmentStore())
      act(() => {
        useDepartmentStore.setState({ departments: [existingDepartment] })
      })

      mockApiClient.updateDepartment.mockResolvedValue({
        success: true,
        message: 'Department updated',
        data: updatedDepartment,
        errors: [],
      })

      let success: boolean
      await act(async () => {
        success = await result.current.updateDepartment('1', updateData)
      })

      expect(success!).toBe(true)
      expect(result.current.departments[0]).toEqual(updatedDepartment)
      expect(result.current.currentDepartment).toEqual(updatedDepartment)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockApiClient.updateDepartment).toHaveBeenCalledWith('1', updateData)
    })

    it('should handle update department error', async () => {
      mockApiClient.updateDepartment.mockResolvedValue({
        success: false,
        message: 'Department not found',
        data: null,
        errors: ['Not found'],
      })

      const { result } = renderHook(() => useDepartmentStore())

      let success: boolean
      await act(async () => {
        success = await result.current.updateDepartment('999', { name: 'Updated' })
      })

      expect(success!).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Department not found')
    })
  })

  describe('deleteDepartment', () => {
    it('should delete department successfully', async () => {
      const existingDepartments = [
        {
          id: '1',
          name: 'IT Department',
          code: 'IT',
          description: 'Information Technology',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'HR Department',
          code: 'HR',
          description: 'Human Resources',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      // Set initial state
      const { result } = renderHook(() => useDepartmentStore())
      act(() => {
        useDepartmentStore.setState({ departments: existingDepartments })
      })

      mockApiClient.deleteDepartment.mockResolvedValue({
        success: true,
        message: 'Department deleted',
        data: null,
        errors: [],
      })

      let success: boolean
      await act(async () => {
        success = await result.current.deleteDepartment('1')
      })

      expect(success!).toBe(true)
      expect(result.current.departments).toHaveLength(1)
      expect(result.current.departments[0].id).toBe('2')
      expect(result.current.currentDepartment).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockApiClient.deleteDepartment).toHaveBeenCalledWith('1')
    })

    it('should handle delete department error', async () => {
      mockApiClient.deleteDepartment.mockResolvedValue({
        success: false,
        message: 'Cannot delete department with active users',
        data: null,
        errors: ['Constraint violation'],
      })

      const { result } = renderHook(() => useDepartmentStore())

      let success: boolean
      await act(async () => {
        success = await result.current.deleteDepartment('1')
      })

      expect(success!).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Cannot delete department with active users')
    })
  })

  describe('utility actions', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useDepartmentStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should set error state', () => {
      const { result } = renderHook(() => useDepartmentStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.setError(null)
      })

      expect(result.current.error).toBe(null)
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useDepartmentStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('department context and filtering', () => {
    it('should set user department', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockDepartment = {
        id: '1',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      act(() => {
        result.current.setUserDepartment(mockDepartment)
      })

      expect(result.current.userDepartment).toEqual(mockDepartment)
    })

    it('should get department by id', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockDepartments = [
        {
          id: '1',
          name: 'IT Department',
          code: 'IT',
          description: 'Information Technology',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'HR Department',
          code: 'HR',
          description: 'Human Resources',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      act(() => {
        useDepartmentStore.setState({ departments: mockDepartments })
      })

      const department = result.current.getDepartmentById('1')
      expect(department).toEqual(mockDepartments[0])

      const nonExistentDepartment = result.current.getDepartmentById('999')
      expect(nonExistentDepartment).toBe(null)
    })

    it('should filter items by department', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockUserDepartment = {
        id: '1',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      const mockItems = [
        { id: '1', name: 'Item 1', departmentId: '1' },
        { id: '2', name: 'Item 2', departmentId: '2' },
        { id: '3', name: 'Item 3', departmentId: '1' },
        { id: '4', name: 'Item 4', departmentId: '3' },
      ]

      act(() => {
        result.current.setUserDepartment(mockUserDepartment)
      })

      const filteredItems = result.current.filterByDepartment(mockItems)
      expect(filteredItems).toHaveLength(2)
      expect(filteredItems[0].id).toBe('1')
      expect(filteredItems[1].id).toBe('3')
    })

    it('should filter items by specific department id', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockItems = [
        { id: '1', name: 'Item 1', departmentId: '1' },
        { id: '2', name: 'Item 2', departmentId: '2' },
        { id: '3', name: 'Item 3', departmentId: '1' },
        { id: '4', name: 'Item 4', departmentId: '3' },
      ]

      const filteredItems = result.current.filterByDepartment(mockItems, '2')
      expect(filteredItems).toHaveLength(1)
      expect(filteredItems[0].id).toBe('2')
    })

    it('should return all items when no department context', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockItems = [
        { id: '1', name: 'Item 1', departmentId: '1' },
        { id: '2', name: 'Item 2', departmentId: '2' },
      ]

      const filteredItems = result.current.filterByDepartment(mockItems)
      expect(filteredItems).toEqual(mockItems)
    })

    it('should check if department is user department', () => {
      const { result } = renderHook(() => useDepartmentStore())
      const mockUserDepartment = {
        id: '1',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      act(() => {
        result.current.setUserDepartment(mockUserDepartment)
      })

      expect(result.current.isUserDepartment('1')).toBe(true)
      expect(result.current.isUserDepartment('2')).toBe(false)
    })

    it('should return false when no user department set', () => {
      const { result } = renderHook(() => useDepartmentStore())

      expect(result.current.isUserDepartment('1')).toBe(false)
    })
  })
})