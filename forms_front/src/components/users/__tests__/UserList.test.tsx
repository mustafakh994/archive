import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UserList from '../UserList'
import { useUserStore } from '@/lib/store/useUserStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
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
  filteredUsers: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      departmentId: 'dept1',
      roleId: 'role1',
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ],
  availableRoles: [
    {
      id: 'role1',
      name: 'Admin',
      displayName: 'Administrator',
      departmentId: 'dept1',
      description: 'Admin role',
      isSystemRole: false,
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ],
  isLoading: false,
  error: null,
  searchTerm: '',
  filters: {},
  fetchUsers: vi.fn(),
  searchUsers: vi.fn(),
  filterUsers: vi.fn(),
  fetchAvailableRoles: vi.fn(),
  toggleUserStatus: vi.fn()
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
  hasPermission: vi.fn(() => true),
  user: { id: '2', name: 'Current User' }
}

describe('UserList', () => {
  beforeEach(() => {
    vi.mocked(useUserStore).mockReturnValue(mockUserStore as any)
    vi.mocked(useDepartmentStore).mockReturnValue(mockDepartmentStore as any)
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders user list correctly', async () => {
    render(<UserList />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('IT Department')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useUserStore).mockReturnValue({
      ...mockUserStore,
      isLoading: true,
      filteredUsers: []
    } as any)

    render(<UserList />)
    
    expect(screen.getByText('Loading users...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useUserStore).mockReturnValue({
      ...mockUserStore,
      isLoading: false,
      error: 'Failed to load users',
      filteredUsers: []
    } as any)

    render(<UserList />)
    
    expect(screen.getByText('Error: Failed to load users')).toBeInTheDocument()
  })

  it('handles search input', async () => {
    render(<UserList />)
    
    const searchInput = screen.getByPlaceholderText(/search users/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    expect(mockUserStore.searchUsers).toHaveBeenCalledWith('John')
  })

  it('shows empty state when no users found', () => {
    vi.mocked(useUserStore).mockReturnValue({
      ...mockUserStore,
      filteredUsers: []
    } as any)

    render(<UserList />)
    
    expect(screen.getByText(/no users found/i)).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn()
    render(<UserList onEdit={onEdit} />)
    
    // Click the action menu button
    const actionButton = screen.getByRole('button', { name: '' })
    fireEvent.click(actionButton)
    
    // Wait for menu to appear and click edit
    await waitFor(() => {
      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)
    })
    
    expect(onEdit).toHaveBeenCalledWith(mockUserStore.filteredUsers[0])
  })
})