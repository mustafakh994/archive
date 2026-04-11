import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, beforeEach } from 'vitest'
import DepartmentContext from '../DepartmentContext'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'

// Mock the stores
vi.mock('@/lib/store/useAuthStore')
vi.mock('@/lib/store/useDepartmentStore')

const mockUseAuthStore = useAuthStore as any
const mockUseDepartmentStore = useDepartmentStore as any

describe('DepartmentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render department context in compact variant', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        department: {
          id: '1',
          name: 'IT Department',
          code: 'IT'
        },
        role: {
          name: 'Admin'
        },
        permissions: [
          { name: 'create_forms' },
          { name: 'manage_users' }
        ]
      },
      departmentContext: null
    })

    mockUseDepartmentStore.mockReturnValue({
      userDepartment: null
    })

    render(<DepartmentContext variant="compact" />)

    expect(screen.getByText('IT Department')).toBeInTheDocument()
    expect(screen.getByText('(IT)')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should render department context as badge', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        department: {
          id: '1',
          name: 'IT Department',
          code: 'IT'
        }
      },
      departmentContext: null
    })

    mockUseDepartmentStore.mockReturnValue({
      userDepartment: null
    })

    render(<DepartmentContext variant="badge" />)

    expect(screen.getByText('IT')).toBeInTheDocument()
  })

  it('should render full department context with permissions', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        department: {
          id: '1',
          name: 'IT Department',
          code: 'IT'
        },
        role: {
          name: 'Admin'
        },
        permissions: [
          { name: 'create_forms' },
          { name: 'manage_users' }
        ]
      },
      departmentContext: null
    })

    mockUseDepartmentStore.mockReturnValue({
      userDepartment: null
    })

    render(<DepartmentContext variant="full" showPermissions={true} />)

    expect(screen.getAllByText('IT Department')[0]).toBeInTheDocument()
    expect(screen.getByText('Code: IT')).toBeInTheDocument()
    expect(screen.getByText('Role: Admin')).toBeInTheDocument()
    expect(screen.getByText('Permissions:')).toBeInTheDocument()
    expect(screen.getByText('create forms')).toBeInTheDocument()
    expect(screen.getByText('manage users')).toBeInTheDocument()
  })

  it('should not render when no department context is available', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      departmentContext: null
    })

    mockUseDepartmentStore.mockReturnValue({
      userDepartment: null
    })

    const { container } = render(<DepartmentContext />)

    expect(container.firstChild).toBeNull()
  })

  it('should use department context from auth store when available', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      departmentContext: {
        departmentId: '1',
        departmentName: 'HR Department',
        departmentCode: 'HR',
        userRole: 'Manager',
        permissions: ['manage_users']
      }
    })

    mockUseDepartmentStore.mockReturnValue({
      userDepartment: null
    })

    render(<DepartmentContext variant="compact" />)

    expect(screen.getByText('HR Department')).toBeInTheDocument()
    expect(screen.getByText('(HR)')).toBeInTheDocument()
    expect(screen.getByText('Manager')).toBeInTheDocument()
  })
})