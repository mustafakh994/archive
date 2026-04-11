'use client'

import React, { useEffect, useState } from 'react'
import { ChevronDown, Check, AlertCircle } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { Role } from '@/lib/api/client'

interface RoleSelectorProps {
  departmentId?: string
  selectedRoleId?: string
  onRoleSelect: (roleId: string) => void
  disabled?: boolean
  error?: string
  placeholder?: string
}

export default function RoleSelector({
  departmentId,
  selectedRoleId,
  onRoleSelect,
  disabled = false,
  error,
  placeholder = "Select a role"
}: RoleSelectorProps) {
  const { availableRoles, fetchAvailableRoles, isLoading } = useUserStore()
  const [isOpen, setIsOpen] = useState(false)
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([])

  useEffect(() => {
    if (departmentId) {
      fetchAvailableRoles(departmentId)
    }
  }, [departmentId, fetchAvailableRoles])

  useEffect(() => {
    // Filter roles by department if departmentId is provided
    if (departmentId) {
      const filtered = availableRoles.filter(role => role.departmentId === departmentId)
      setFilteredRoles(filtered)
    } else {
      setFilteredRoles(availableRoles)
    }
  }, [availableRoles, departmentId])

  const selectedRole = filteredRoles.find(role => role.id === selectedRoleId)

  const handleRoleSelect = (role: Role) => {
    onRoleSelect(role.id)
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (!disabled && departmentId) {
      setIsOpen(!isOpen)
    }
  }

  if (!departmentId) {
    return (
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
        Please select a department first
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between text-gray-900 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${
          disabled || isLoading ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <span className={selectedRole ? 'text-gray-900' : 'text-gray-500'}>
          {isLoading ? 'Loading roles...' : selectedRole ? selectedRole.displayName || selectedRole.name : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${
            disabled || isLoading ? 'text-gray-400' : 'text-gray-600'
          }`} 
        />
      </button>

      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredRoles.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle size={16} />
              No roles available for this department
            </div>
          ) : (
            <div className="py-1">
              {filteredRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {role.displayName || role.name}
                    </div>
                    {role.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {role.description}
                      </div>
                    )}
                    {role.isSystemRole && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        System Role
                      </div>
                    )}
                  </div>
                  {selectedRoleId === role.id && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}