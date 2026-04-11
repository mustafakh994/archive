'use client'

import { create } from 'zustand'
import { apiClient, Permission, CreatePermissionData } from '@/lib/api/client'
import { useAuthStore } from './useAuthStore'

interface PermissionFilters {
  departmentId?: string
  resource?: string
  action?: string
  isActive?: boolean
}

interface PermissionGroup {
  resource: string
  permissions: Permission[]
}

interface PermissionState {
  permissions: Permission[]
  filteredPermissions: Permission[]
  permissionGroups: PermissionGroup[]
  currentPermission: Permission | null
  isLoading: boolean
  error: string | null
  filters: PermissionFilters
}

interface PermissionActions {
  fetchPermissions: (params?: { departmentId?: string }) => Promise<void>
  createPermission: (data: CreatePermissionData) => Promise<boolean>
  updatePermission: (id: string, data: Partial<CreatePermissionData>) => Promise<boolean>
  deletePermission: (id: string) => Promise<boolean>
  getPermissionById: (id: string) => Permission | null
  getPermissionsByResource: (resource: string) => Permission[]
  getPermissionsByDepartment: (departmentId: string) => Permission[]
  filterPermissions: (filters: PermissionFilters) => void
  groupPermissionsByResource: () => void
  hasUserPermission: (permissionName: string) => boolean
  checkResourceAccess: (resource: string, action: string) => boolean
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearPermissions: () => void
}

export const usePermissionStore = create<PermissionState & PermissionActions>((set, get) => ({
  // State
  permissions: [],
  filteredPermissions: [],
  permissionGroups: [],
  currentPermission: null,
  isLoading: false,
  error: null,
  filters: {},

  // Actions
  fetchPermissions: async (params) => {
    set({ isLoading: true, error: null })
    
    try {
      // Use existing GET /permissions endpoint with department filtering
      const response = await apiClient.getPermissions(params)
      
      if (response.success && response.data) {
        // Handle paginated response - extract items array
        const permissionsArray = response.data.items || []
        set({
          permissions: permissionsArray,
          filteredPermissions: permissionsArray,
          isLoading: false,
          error: null,
        })
        
        // Group permissions by resource after fetching
        get().groupPermissionsByResource()
      } else {
        set({
          permissions: [],
          filteredPermissions: [],
          isLoading: false,
          error: response.message || 'Failed to fetch permissions',
        })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      set({
        permissions: [],
        filteredPermissions: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
    }
  },

  createPermission: async (data: CreatePermissionData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Use existing POST /permissions endpoint
      const response = await apiClient.createPermission(data)
      
      if (response.success && response.data) {
        const { permissions, filteredPermissions } = get()
        const newPermissions = [...permissions, response.data]
        set({
          permissions: newPermissions,
          filteredPermissions: [...filteredPermissions, response.data],
          isLoading: false,
          error: null,
        })
        
        // Regroup permissions with new permission
        get().groupPermissionsByResource()
        return true
      } else {
        set({
          isLoading: false,
          error: response.message || 'Failed to create permission',
        })
        return false
      }
    } catch (error) {
      console.error('Error creating permission:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  updatePermission: async (id: string, data: Partial<CreatePermissionData>) => {
    set({ isLoading: true, error: null })
    
    try {
      // Note: This assumes the API client will be extended with updatePermission method
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api'}/permissions/${id}`, {
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
          const { permissions, filteredPermissions } = get()
          const updatedPermissions = permissions.map(permission => 
            permission.id === id ? result.data : permission
          )
          const updatedFilteredPermissions = filteredPermissions.map(permission => 
            permission.id === id ? result.data : permission
          )
          
          set({
            permissions: updatedPermissions,
            filteredPermissions: updatedFilteredPermissions,
            currentPermission: get().currentPermission?.id === id ? result.data : get().currentPermission,
            isLoading: false,
            error: null,
          })
          
          get().groupPermissionsByResource()
          return true
        }
      }
      
      const errorData = await response.json().catch(() => ({}))
      set({
        isLoading: false,
        error: errorData.message || 'Failed to update permission',
      })
      return false
    } catch (error) {
      console.error('Error updating permission:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  deletePermission: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Note: This assumes the API client will be extended with deletePermission method
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net/api'}/permissions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
      })

      if (response.ok) {
        const { permissions, filteredPermissions } = get()
        const updatedPermissions = permissions.filter(permission => permission.id !== id)
        const updatedFilteredPermissions = filteredPermissions.filter(permission => permission.id !== id)
        
        set({
          permissions: updatedPermissions,
          filteredPermissions: updatedFilteredPermissions,
          currentPermission: get().currentPermission?.id === id ? null : get().currentPermission,
          isLoading: false,
          error: null,
        })
        
        get().groupPermissionsByResource()
        return true
      }
      
      const errorData = await response.json().catch(() => ({}))
      set({
        isLoading: false,
        error: errorData.message || 'Failed to delete permission',
      })
      return false
    } catch (error) {
      console.error('Error deleting permission:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
      return false
    }
  },

  getPermissionById: (id: string) => {
    const { permissions } = get()
    return permissions.find(permission => permission.id === id) || null
  },

  getPermissionsByResource: (resource: string) => {
    const { permissions } = get()
    return permissions.filter(permission => permission.resource === resource)
  },

  getPermissionsByDepartment: (departmentId: string) => {
    const { permissions } = get()
    return permissions.filter(permission => permission.departmentId === departmentId)
  },

  filterPermissions: (filters: PermissionFilters) => {
    const { permissions } = get()
    let filtered = [...permissions]
    
    if (filters.departmentId) {
      filtered = filtered.filter(permission => permission.departmentId === filters.departmentId)
    }
    
    if (filters.resource) {
      filtered = filtered.filter(permission => 
        permission.resource.toLowerCase().includes(filters.resource!.toLowerCase())
      )
    }
    
    if (filters.action) {
      filtered = filtered.filter(permission => 
        permission.action.toLowerCase().includes(filters.action!.toLowerCase())
      )
    }
    
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(permission => permission.isActive === filters.isActive)
    }
    
    set({ 
      filteredPermissions: filtered,
      filters: { ...get().filters, ...filters }
    })
    
    // Regroup filtered permissions
    get().groupPermissionsByResource()
  },

  groupPermissionsByResource: () => {
    const { filteredPermissions } = get()
    
    const groups: { [key: string]: Permission[] } = {}
    
    filteredPermissions.forEach(permission => {
      if (!groups[permission.resource]) {
        groups[permission.resource] = []
      }
      groups[permission.resource].push(permission)
    })
    
    const permissionGroups: PermissionGroup[] = Object.keys(groups)
      .sort()
      .map(resource => ({
        resource,
        permissions: groups[resource].sort((a, b) => a.action.localeCompare(b.action))
      }))
    
    set({ permissionGroups })
  },

  hasUserPermission: (permissionName: string) => {
    const authStore = useAuthStore.getState()
    return authStore.hasPermission(permissionName)
  },

  checkResourceAccess: (resource: string, action: string) => {
    const authStore = useAuthStore.getState()
    const departmentContext = authStore.getDepartmentContext()
    
    if (!departmentContext) return false
    
    // Check if user has specific permission for this resource and action
    const permissionName = `${resource}.${action}`
    return departmentContext.permissions.includes(permissionName)
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

  clearPermissions: () => {
    set({ 
      permissions: [],
      filteredPermissions: [],
      permissionGroups: [],
      currentPermission: null,
      filters: {},
      error: null
    })
  },
}))




