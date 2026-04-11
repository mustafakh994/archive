import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import RoleForm from '../RoleForm'

// Mock the stores
vi.mock('@/lib/store/useRoleStore', () => ({
  useRoleStore: vi.fn(() => ({
    createRole: vi.fn(() => Promise.resolve(true)),
    updateRole: vi.fn(() => Promise.resolve(true)),
    isLoading: false,
    error: null,
    clearError: vi.fn()
  }))
}))

vi.mock('@/lib/store/useDepartmentStore', () => ({
  useDepartmentStore: vi.fn(() => ({
    departments: [
      { id: 'dept1', name: 'IT Department', code: 'IT' },
      { id: 'dept2', name: 'HR Department', code: 'HR' }
    ],
    fetchDepartments: vi.fn()
  }))
}))

vi.mock('@/lib/store/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user1', departmentId: 'dept1' },
    hasPermission: vi.fn(() => true)
  }))
}))

describe('RoleForm', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form correctly', () => {
    render(<RoleForm {...defaultProps} mode="create" />)
    
    expect(screen.getByText('Create New Role')).toBeInTheDocument()
    expect(screen.getByLabelText(/Display Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Role Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
  })

  it('renders edit form correctly', () => {
    const role = {
      id: '1',
      departmentId: 'dept1',
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administrator role',
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }

    render(<RoleForm {...defaultProps} mode="edit" role={role} />)
    
    expect(screen.getByText('Edit Role')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Administrator')).toBeInTheDocument()
    expect(screen.getByDisplayValue('admin')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<RoleForm {...defaultProps} mode="create" />)
    
    const submitButton = screen.getByText('Create')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Display name is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })
  })

  it('auto-generates role name from display name', () => {
    render(<RoleForm {...defaultProps} mode="create" />)
    
    const displayNameInput = screen.getByLabelText(/Display Name/)
    fireEvent.change(displayNameInput, { target: { value: 'Department Manager' } })
    
    const roleNameInput = screen.getByLabelText(/Role Name/)
    expect(roleNameInput).toHaveValue('department_manager')
  })

  it('calls createRole on form submission', async () => {
    const mockCreateRole = vi.fn(() => Promise.resolve(true))
    vi.mocked(require('@/lib/store/useRoleStore').useRoleStore).mockImplementation(() => ({
      createRole: mockCreateRole,
      updateRole: vi.fn(),
      isLoading: false,
      error: null,
      clearError: vi.fn()
    }))

    render(<RoleForm {...defaultProps} mode="create" defaultDepartmentId="dept1" />)
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Display Name/), { 
      target: { value: 'Test Role' } 
    })
    fireEvent.change(screen.getByLabelText(/Description/), { 
      target: { value: 'Test description' } 
    })
    
    // Submit the form
    fireEvent.click(screen.getByText('Create'))
    
    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith({
        departmentId: 'dept1',
        name: 'test_role',
        displayName: 'Test Role',
        description: 'Test description',
        isActive: true
      })
    })
  })

  it('does not render when isOpen is false', () => {
    render(<RoleForm {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Create New Role')).not.toBeInTheDocument()
  })
})