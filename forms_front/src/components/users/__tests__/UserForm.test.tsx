import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UserForm from '../UserForm'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the stores
vi.mock('@/lib/store/useUserStore')
vi.mock('@/lib/store/useDepartmentStore')
vi.mock('@/lib/store/useAuthStore')

const mockUserStore = {
  createUser: vi.fn(),
  updateUser: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn()
}

const mockDepartmentStore = {
  departments: [
    {
      id: 'dept1',
      name: 'IT Department',
      code: 'IT',
      description: 'Information Technology',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ],
  fetchDepartments: vi.fn()
}

const mockAuthStore = {
  user: { id: '1', name: 'Current User' }
}

describe('UserForm', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  }

  beforeEach(() => {
    vi.mocked(useUserStore).mockReturnValue(mockUserStore as any)
    vi.mocked(useDepartmentStore).mockReturnValue(mockDepartmentStore as any)
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form correctly', () => {
    render(<UserForm {...defaultProps} mode="create" />)
    
    expect(screen.getByText('Create New User')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
  })

  it('renders edit form correctly', () => {
    const user = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      departmentId: 'dept1',
      roleId: 'role1',
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }

    render(<UserForm {...defaultProps} mode="edit" user={user} />)
    
    expect(screen.getByText('Edit User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<UserForm {...defaultProps} mode="create" />)
    
    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<UserForm {...defaultProps} mode="create" />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('calls createUser on form submission', async () => {
    mockUserStore.createUser.mockResolvedValue(true)
    
    render(<UserForm {...defaultProps} mode="create" />)
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/department/i), { target: { value: 'dept1' } })
    
    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockUserStore.createUser).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        departmentId: 'dept1',
        roleId: '',
        isActive: true
      })
    })
  })

  it('does not render when isOpen is false', () => {
    render(<UserForm {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Create New User')).not.toBeInTheDocument()
  })

  it('calls onClose when cancel button is clicked', () => {
    render(<UserForm {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})