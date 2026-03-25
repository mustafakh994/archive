'use client'

import { create } from 'zustand'
import { apiClient, Role, CreateRoleData, Permission } from '@/lib/api/client'
import { useAuthStore } from './useAuthStore'

interface RoleFilters {
  departmentId?: string
  isActive?: boolean
  isSystemRole?: boolean
}

interface RoleState {
  roles: Role[]
  filteredRoles: Role[]
  currentRole: Role | null
  roleHierarchy: Role[]
  isLoading: boolean
  error: string | null
  filters: RoleFilters
}

interface RoleActions {
  fetchRoles: (params?: { departmentId?: string }) => Promise<void>
  createRole: (data: CreateRoleData) => Promise<boolean>
  updateRole: (id: string, data: Partial<CreateRoleData>) => Promise<boolean>
  deleteRole: (id: string) => Promise<boolean>
  getRoleById: (id: string) => Role | null
  getRolesByDepartment: (departmentId: string) => Role[]
  filterRoles: (filters: RoleFilters) => void
  buildRoleHierarchy: () => void
  canUserManageRole: (roleId: string) => boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearRoles: () => void
}

export const useRoleStore = create<RoleState & RoleActions>((set, get) => ({
  // State
  roles: [],
  filteredRoles: [],
  currentRole: null,
  roleHierarchy: [],
  isLoading: false,
  error: null,
  filters: {},

  // Actions
  fetchRoles: async (params) => {
    set({ isLoading: true, error: null })

    try {
      // Use department filtering from existing API endpoint
      const response = await apiClient.getRoles(params)

      if (response.success && response.data) {
        // Handle paginated response - extract items array
        const rolesArray = response.data.items || []
        set({
          roles: rolesArray,
          filteredRoles: rolesArray,
          isLoading: false,
          error: null,
        })

        // Build role hierarchy after fetching
        get().buildRoleHierarchy()
      } else {
        set({
          roles: [],
          filteredRoles: [],
          isLoading: false,
          error: response.message || 'Failed to fetch roles',
        })
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      set({
        roles: [],
        filteredRoles: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
    }
  },

  createRole: async (data: CreateRoleData) => {
    set({ isLoading: true, error: null })

    try {
      // Use existing POST /roles endpoint
      const response = await apiClient.createRole(data)

      if (response.success && response.data) {
        const { roles, filteredRoles } = get()
        const newRoles = [...roles, response.data]
        set({
          roles: newRoles,
          filteredRoles: [...filteredRoles, response.data],
          isLoading: false,
          error: null,
        })

        // Rebuild hierarchy with new role
        get().buildRoleHierarchy()
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to create role',
        })
        return false
      }
    } catch (error) {
      console.error('Error creating role:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  updateRole: async (id: string, data: Partial<CreateRoleData>) => {
    set({ isLoading: true, error: null })

    try {
      // Note: This assumes the API client will be extended with updateRole method
      // For now, we'll use a direct API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api'}/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const { roles, filteredRoles } = get()
          const updatedRoles = roles.map(role =>
            role.id === id ? result.data : role
          )
          const updatedFilteredRoles = filteredRoles.map(role =>
            role.id === id ? result.data : role
          )

          set({
            roles: updatedRoles,
            filteredRoles: updatedFilteredRoles,
            currentRole: get().currentRole?.id === id ? result.data : get().currentRole,
            isLoading: false,
            error: null,
          })

          get().buildRoleHierarchy()
          return true
        }
      }

      const errorData = await response.json().catch(() => ({}))
      set({
        isLoading: false,
        error: errorData.message || 'Failed to update role',
      })
      return false
    } catch (error) {
      console.error('Error updating role:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  deleteRole: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      // Note: This assumes the API client will be extended with deleteRole method
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api'}/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
      })

      if (response.ok) {
        const { roles, filteredRoles } = get()
        const updatedRoles = roles.filter(role => role.id !== id)
        const updatedFilteredRoles = filteredRoles.filter(role => role.id !== id)

        set({
          roles: updatedRoles,
          filteredRoles: updatedFilteredRoles,
          currentRole: get().currentRole?.id === id ? null : get().currentRole,
          isLoading: false,
          error: null,
        })

        get().buildRoleHierarchy()
        return true
      }

      const errorData = await response.json().catch(() => ({}))
      set({
        isLoading: false,
        error: errorData.message || 'Failed to delete role',
      })
      return false
    } catch (error) {
      console.error('Error deleting role:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  getRoleById: (id: string) => {
    const { roles } = get()
    return roles.find(role => role.id === id) || null
  },

  getRolesByDepartment: (departmentId: string) => {
    const { roles } = get()
    return roles.filter(role => role.departmentId === departmentId)
  },

  filterRoles: (filters: RoleFilters) => {
    const { roles } = get()
    let filtered = [...roles]

    if (filters.departmentId) {
      filtered = filtered.filter(role => role.departmentId === filters.departmentId)
    }

    if (filters.isActive !== undefined) {
      filtered = filtered.filter(role => role.isActive === filters.isActive)
    }

    if (filters.isSystemRole !== undefined) {
      filtered = filtered.filter(role => role.isSystemRole === filters.isSystemRole)
    }

    set({
      filteredRoles: filtered,
      filters: { ...get().filters, ...filters }
    })
  },

  buildRoleHierarchy: () => {
    const { roles } = get()

    // Sort roles by system roles first, then by name
    const hierarchy = [...roles].sort((a, b) => {
      if (a.isSystemRole && !b.isSystemRole) return -1
      if (!a.isSystemRole && b.isSystemRole) return 1
      return a.displayName.localeCompare(b.displayName)
    })

    set({ roleHierarchy: hierarchy })
  },

  canUserManageRole: (roleId: string) => {
    const authStore = useAuthStore.getState()
    const role = get().getRoleById(roleId)

    if (!role || !authStore.user) return false

    // System roles can only be managed by system administrators
    if (role.isSystemRole) {
      return authStore.hasPermission('manage_system_roles')
    }

    // Department roles can be managed by department administrators
    if (role.departmentId === authStore.user.departmentId) {
      return authStore.hasPermission('manage_department_roles')
    }

    return false
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

  clearRoles: () => {
    set({
      roles: [],
      filteredRoles: [],
      currentRole: null,
      roleHierarchy: [],
      filters: {},
      error: null
    })
  },
}))




