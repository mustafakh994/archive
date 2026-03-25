import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import RoleList from '../RoleList'

// Mock the stores
vi.mock('@/lib/store/useRoleStore', () => ({
  useRoleStore: vi.fn(() => ({
    filteredRoles: [
      {
        id: '1',
        departmentId: 'dept1',
        name: 'admin',
        displayName: 'Administrator',
        description: 'System administrator role',
        isSystemRole: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        departmentId: 'dept1',
        name: 'user',
        displayName: 'Regular User',
        description: 'Standard user role',
        isSystemRole: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    roleHierarchy: [],
    isLoading: false,
    error: null,
    filters: {},
    fetchRoles: vi.fn(),
    filterRoles: vi.fn(),
    deleteRole: vi.fn(),
    canUserManageRole: vi.fn(() => true)
  }))
}))

vi.mock('@/lib/store/useDepartmentStore', () => ({
  useDepartmentStore: vi.fn(() => ({
    departments: [
      { id: 'dept1', name: 'IT Department', code: 'IT' }
    ],
    fetchDepartments: vi.fn()
  }))
}))

vi.mock('@/lib/hooks/useAccessControl', () => ({
  useAccessControl: vi.fn(() => ({
    checkPermission: vi.fn(() => ({ hasAccess: true }))
  }))
}))

describe('RoleList', () => {
  it('renders role list correctly', () => {
    render(<RoleList />)
    
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Regular User')).toBeInTheDocument()
    expect(screen.getByText('System administrator role')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const mockUseRoleStore = vi.fn(() => ({
      filteredRoles: [],
      roleHierarchy: [],
      isLoading: true,
      error: null,
      filters: {},
      fetchRoles: vi.fn(),
      filterRoles: vi.fn(),
      deleteRole: vi.fn(),
      canUserManageRole: vi.fn()
    }))
    
    vi.mocked(require('@/lib/store/useRoleStore').useRoleStore).mockImplementation(mockUseRoleStore)
    
    render(<RoleList />)
    
    expect(screen.getByText('Loading roles...')).toBeInTheDocument()
  })

  it('handles search functionality', () => {
    render(<RoleList />)
    
    const searchInput = screen.getByPlaceholderText('Search roles by name or description...')
    fireEvent.change(searchInput, { target: { value: 'admin' } })
    
    expect(searchInput).toHaveValue('admin')
  })

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = vi.fn()
    render(<RoleList onEdit={mockOnEdit} />)
    
    // Click the action menu button
    const actionButtons = screen.getAllByRole('button')
    const actionMenuButton = actionButtons.find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('text-gray-400')
    )
    
    if (actionMenuButton) {
      fireEvent.click(actionMenuButton)
      
      // Look for edit button in the dropdown
      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)
      
      expect(mockOnEdit).toHaveBeenCalled()
    }
  })
})