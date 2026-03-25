import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach } from 'vitest'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import DepartmentList from '../DepartmentList'
import DepartmentForm from '../DepartmentForm'
import DepartmentSettings from '../DepartmentSettings'
import { Department } from '@/lib/api/client'

// Mock the stores
vi.mock('@/lib/store/useAuthStore')
vi.mock('@/lib/store/useDepartmentStore')

const mockUseAuthStore = useAuthStore as any
const mockUseDepartmentStore = useDepartmentStore as any

const mockDepartment: Department = {
  id: '1',
  name: 'IT Department',
  code: 'IT',
  description: 'Information Technology Department',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('Department Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuthStore.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
      user: {
        id: '1',
        departmentId: '1',
        department: mockDepartment,
        role: { name: 'Admin' },
        permissions: [{ name: 'manage_departments' }]
      },
      departmentContext: null
    })
  })

  describe('DepartmentList Component', () => {
    it('should fetch departments from backend on mount', () => {
      const mockFetchDepartments = vi.fn()
      
      mockUseDepartmentStore.mockReturnValue({
        departments: [mockDepartment],
        isLoading: false,
        error: null,
        fetchDepartments: mockFetchDepartments,
        deleteDepartment: vi.fn()
      })

      render(<DepartmentList />)

      expect(mockFetchDepartments).toHaveBeenCalled()
      expect(screen.getByText('IT Department')).toBeInTheDocument()
      expect(screen.getByText('Code: IT')).toBeInTheDocument()
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('should handle backend errors gracefully', () => {
      const mockFetchDepartments = vi.fn()
      
      mockUseDepartmentStore.mockReturnValue({
        departments: [],
        isLoading: false,
        error: 'Failed to connect to backend',
        fetchDepartments: mockFetchDepartments,
        deleteDepartment: vi.fn()
      })

      render(<DepartmentList />)

      expect(screen.getByText('Error: Failed to connect to backend')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should show loading state while fetching from backend', () => {
      mockUseDepartmentStore.mockReturnValue({
        departments: [],
        isLoading: true,
        error: null,
        fetchDepartments: vi.fn(),
        deleteDepartment: vi.fn()
      })

      render(<DepartmentList />)

      expect(screen.getByText('Loading departments...')).toBeInTheDocument()
    })
  })

  describe('DepartmentForm Component', () => {
    it('should save new department to backend', async () => {
      const mockCreateDepartment = vi.fn().mockResolvedValue(true)
      const mockOnSuccess = vi.fn()
      
      mockUseDepartmentStore.mockReturnValue({
        createDepartment: mockCreateDepartment,
        updateDepartment: vi.fn(),
        isLoading: false,
        error: null,
        clearError: vi.fn(),
        departments: []
      })

      render(
        <DepartmentForm
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={mockOnSuccess}
          mode="create"
        />
      )

      // Fill form
      fireEvent.change(screen.getByLabelText(/Department Name/), {
        target: { value: 'HR Department' }
      })
      fireEvent.change(screen.getByLabelText(/Department Code/), {
        target: { value: 'HR' }
      })
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'Human Resources Department' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(mockCreateDepartment).toHaveBeenCalledWith({
          name: 'HR Department',
          code: 'HR',
          description: 'Human Resources Department'
        })
      })
    })

    it('should show backend saving feedback', () => {
      mockUseDepartmentStore.mockReturnValue({
        createDepartment: vi.fn(),
        updateDepartment: vi.fn(),
        isLoading: true,
        error: null,
        clearError: vi.fn()
      })

      render(
        <DepartmentForm
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
        />
      )

      expect(screen.getByText('Saving to backend...')).toBeInTheDocument()
    })
  })

  describe('DepartmentSettings Component', () => {
    it('should fetch department data from backend', () => {
      const mockFetchDepartment = vi.fn()
      
      mockUseDepartmentStore.mockReturnValue({
        currentDepartment: mockDepartment,
        fetchDepartment: mockFetchDepartment,
        isLoading: false,
        error: null,
        getDepartmentById: vi.fn().mockReturnValue(mockDepartment),
        userDepartment: null
      })

      render(<DepartmentSettings departmentId="1" />)

      expect(screen.getAllByText('IT Department')[0]).toBeInTheDocument()
      expect(screen.getByText('Department Code: IT')).toBeInTheDocument()
    })

    it('should show backend integration status', () => {
      mockUseDepartmentStore.mockReturnValue({
        currentDepartment: mockDepartment,
        fetchDepartment: vi.fn(),
        isLoading: false,
        error: null,
        getDepartmentById: vi.fn().mockReturnValue(mockDepartment),
        userDepartment: null
      })

      render(<DepartmentSettings departmentId="1" />)

      // Check configuration tab
      fireEvent.click(screen.getByText('Configuration'))
      expect(screen.getByText('Configuration Management')).toBeInTheDocument()
      expect(screen.getByText(/automatically synchronized across all department users/)).toBeInTheDocument()

      // Check statistics tab
      fireEvent.click(screen.getByText('Statistics'))
      expect(screen.getByText('Backend Integration Active')).toBeInTheDocument()
      expect(screen.getByText(/calculated and served by the backend API/)).toBeInTheDocument()
    })

    it('should handle department loading from backend', () => {
      mockUseDepartmentStore.mockReturnValue({
        currentDepartment: null,
        fetchDepartment: vi.fn(),
        isLoading: true,
        error: null,
        getDepartmentById: vi.fn().mockReturnValue(null),
        userDepartment: null
      })

      render(<DepartmentSettings departmentId="1" />)

      expect(screen.getByText('Loading department settings...')).toBeInTheDocument()
    })
  })

  describe('Backend Integration Requirements', () => {
    it('should meet requirement 8.1 - department information fetched from backend', () => {
      const mockFetchDepartment = vi.fn()
      
      mockUseDepartmentStore.mockReturnValue({
        currentDepartment: null,
        fetchDepartment: mockFetchDepartment,
        isLoading: false,
        error: null,
        getDepartmentById: vi.fn().mockReturnValue(null),
        userDepartment: null
      })

      render(<DepartmentSettings departmentId="1" />)

      // Verify that department data is fetched from backend when not available locally
      expect(mockFetchDepartment).toHaveBeenCalledWith('1')
    })

    it('should meet requirement 8.2 - department settings saved to backend immediately', async () => {
      const mockUpdateDepartment = vi.fn().mockResolvedValue(true)
      
      mockUseDepartmentStore.mockReturnValue({
        createDepartment: vi.fn(),
        updateDepartment: mockUpdateDepartment,
        isLoading: false,
        error: null,
        clearError: vi.fn(),
        departments: [mockDepartment]
      })

      render(
        <DepartmentForm
          department={mockDepartment}
          isOpen={true}
          onClose={vi.fn()}
          mode="edit"
        />
      )

      // Update department name
      const nameInput = screen.getByDisplayValue('IT Department')
      fireEvent.change(nameInput, { target: { value: 'Updated IT Department' } })
      
      // Submit form
      fireEvent.click(screen.getByText('Update'))

      await waitFor(() => {
        expect(mockUpdateDepartment).toHaveBeenCalledWith('1', {
          name: 'Updated IT Department',
          code: 'IT',
          description: 'Information Technology Department'
        })
      })
    })

    it('should meet requirement 8.5 - department-specific features configuration', () => {
      mockUseDepartmentStore.mockReturnValue({
        currentDepartment: mockDepartment,
        fetchDepartment: vi.fn(),
        isLoading: false,
        error: null,
        getDepartmentById: vi.fn().mockReturnValue(mockDepartment),
        userDepartment: null
      })

      render(<DepartmentSettings departmentId="1" />)

      // Navigate to configuration tab
      fireEvent.click(screen.getByText('Configuration'))

      // Verify department-specific configuration options are displayed
      expect(screen.getByText('Auto-approve forms')).toBeInTheDocument()
      expect(screen.getByText('Email notifications')).toBeInTheDocument()
      expect(screen.getByText('Data retention')).toBeInTheDocument()
      expect(screen.getByText('Form templates')).toBeInTheDocument()
    })
  })
})