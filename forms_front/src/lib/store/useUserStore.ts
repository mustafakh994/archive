'use client'

import { create } from 'zustand'
import { apiClient, User, CreateUserData, Role } from '@/lib/api/client'

interface UserFilters {
  departmentId?: string
  roleId?: string
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDescending?: boolean
}

export interface UserListPagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface UserState {
  users: User[]
  filteredUsers: User[]
  currentUser: User | null
  availableRoles: Role[]
  isLoading: boolean
  error: string | null
  searchTerm: string
  filters: UserFilters
  /** Server-side list pagination (GET /users) */
  userListPagination: UserListPagination | null
}

interface UserActions {
  fetchUsers: (params?: UserFilters) => Promise<void>
  fetchUser: (id: string) => Promise<void>
  createUser: (data: CreateUserData) => Promise<boolean>
  updateUser: (id: string, data: Partial<CreateUserData & { isActive?: boolean }>) => Promise<boolean>
  assignRole: (userId: string, roleId: string) => Promise<boolean>
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<boolean>
  searchUsers: (searchTerm: string) => void
  filterUsers: (filters: UserFilters) => void
  fetchAvailableRoles: (departmentId?: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearUsers: () => void
}

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  // State
  users: [],
  filteredUsers: [],
  currentUser: null,
  availableRoles: [],
  isLoading: false,
  error: null,
  searchTerm: '',
  filters: {},
  userListPagination: null,

  // Actions
  fetchUsers: async (params) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getUsers(params)
      
      if (response.success && response.data) {
        const raw = response.data as {
          items?: User[]
          Items?: User[]
          page?: number
          pageSize?: number
          totalItems?: number
          totalCount?: number
          totalPages?: number
          hasNextPage?: boolean
          hasPreviousPage?: boolean
        }
        const usersArray = raw.items ?? raw.Items ?? []
        const page = raw.page ?? params?.page ?? 1
        const pageSize = raw.pageSize ?? params?.pageSize ?? 10
        const totalItems = raw.totalItems ?? raw.totalCount ?? usersArray.length
        const totalPages = raw.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize))
        const hasNextPage = raw.hasNextPage ?? page < totalPages
        const hasPreviousPage = raw.hasPreviousPage ?? page > 1

        set({
          users: usersArray,
          filteredUsers: usersArray,
          isLoading: false,
          error: null,
          filters: { ...(params || {}) },
          userListPagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage,
            hasPreviousPage,
          },
        })
        
        // Client-side search only filters the current page; prefer server search via fetchUsers({ search })
        const { searchTerm } = get()
        if (searchTerm) {
          get().searchUsers(searchTerm)
        }
      } else {
        set({
          users: [],
          filteredUsers: [],
          isLoading: false,
          error: response.message || 'Failed to fetch users',
          userListPagination: null,
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      set({
        users: [],
        filteredUsers: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
        userListPagination: null,
      })
    }
  },

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getUser(id)
      
      if (response.success && response.data) {
        set({
          currentUser: response.data,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to fetch user',
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
    }
  },

  createUser: async (data: CreateUserData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.createUser(data)
      
      if (response.success && response.data) {
        const { filters, userListPagination } = get()
        const pageSize = userListPagination?.pageSize ?? 10
        set({ isLoading: false, error: null })
        await get().fetchUsers({
          ...filters,
          page: 1,
          pageSize,
        })
        return true
      } else {
        const errorMessage = response.message || response.errors?.join(', ') || 'Failed to create user'
        set({
          isLoading: false,
          error: errorMessage,
        })
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      set({
        isLoading: false,
        error: errorMessage,
      })
      return false
    }
  },

  updateUser: async (id: string, data: Partial<CreateUserData & { isActive?: boolean }>) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.updateUser(id, data)
      
      if (response.success && response.data) {
        const { users, filteredUsers } = get()
        const updatedUsers = users.map(user => 
          user.id === id ? response.data! : user
        )
        const updatedFilteredUsers = filteredUsers.map(user => 
          user.id === id ? response.data! : user
        )
        
        set({
          users: updatedUsers,
          filteredUsers: updatedFilteredUsers,
          currentUser: get().currentUser?.id === id ? response.data : get().currentUser,
          isLoading: false,
          error: null,
        })
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to update user',
        })
        return false
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  assignRole: async (userId: string, roleId: string) => {
    return get().updateUser(userId, { roleId })
  },

  toggleUserStatus: async (userId: string, isActive: boolean) => {
    return get().updateUser(userId, { isActive })
  },

  searchUsers: (searchTerm: string) => {
    const { users } = get()
    
    if (!searchTerm.trim()) {
      set({ 
        filteredUsers: users,
        searchTerm: ''
      })
      return
    }
    
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    set({ 
      filteredUsers: filtered,
      searchTerm: searchTerm
    })
  },

  filterUsers: (filters: UserFilters) => {
    const { users } = get()
    let filtered = [...users]
    
    if (filters.departmentId) {
      filtered = filtered.filter(user => user.departmentId === filters.departmentId)
    }
    
    if (filters.roleId) {
      filtered = filtered.filter(user => user.roleId === filters.roleId)
    }
    
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(user => user.isActive === filters.isActive)
    }
    
    set({ 
      filteredUsers: filtered,
      filters: { ...get().filters, ...filters }
    })
    
    // Reapply search if exists
    const { searchTerm } = get()
    if (searchTerm) {
      get().searchUsers(searchTerm)
    }
  },

  fetchAvailableRoles: async (departmentId?: string) => {
    try {
      const response = await apiClient.getRoles(departmentId ? { departmentId } : undefined)
      
      if (response.success && response.data) {
        // Handle both paginated and direct array responses
        const rolesArray = response.data.items || response.data || []
        set({
          availableRoles: Array.isArray(rolesArray) ? rolesArray : [],
          error: null,
        })
      } else {
        set({
          availableRoles: [],
          error: response.message || 'Failed to fetch roles',
        })
      }
    } catch (error) {
      set({
        availableRoles: [],
        error: error instanceof Error ? error.message : 'Network error',
      })
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  clearUsers: () => {
    set({ 
      users: [],
      filteredUsers: [],
      currentUser: null,
      searchTerm: '',
      filters: {},
      error: null,
      userListPagination: null,
    })
  },
}))
