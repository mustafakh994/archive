'use client'

import React, { useState } from 'react'
import { UserCheck, UserX, Loader2 } from 'lucide-react'
import { useUserStore } from '@/lib/store/useUserStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { User } from '@/lib/api/client'

interface UserStatusToggleProps {
  user: User
  onStatusChange?: (user: User, newStatus: boolean) => void
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function UserStatusToggle({
  user,
  onStatusChange,
  showLabel = true,
  size = 'md'
}: UserStatusToggleProps) {
  const { toggleUserStatus } = useUserStore()
  const { hasPermission, user: currentUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const canToggle = hasPermission('manage_users') && user.id !== currentUser?.id

  const handleToggle = async () => {
    if (!canToggle || isLoading) return

    const newStatus = !user.isActive
    const confirmMessage = `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${user.name}?`
    
    if (window.confirm(confirmMessage)) {
      setIsLoading(true)
      try {
        const success = await toggleUserStatus(user.id, newStatus)
        if (success) {
          onStatusChange?.(user, newStatus)
        }
      } catch (error) {
        console.error('Error toggling user status:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1.5 text-sm'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12
      case 'lg':
        return 18
      default:
        return 14
    }
  }

  if (!canToggle) {
    // Show read-only status badge
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-medium ${getSizeClasses()} ${
        user.isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {user.isActive ? (
          <UserCheck size={getIconSize()} />
        ) : (
          <UserX size={getIconSize()} />
        )}
        {showLabel && (user.isActive ? 'Active' : 'Inactive')}
      </span>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-colors ${getSizeClasses()} ${
        user.isActive 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-red-100 text-red-800 hover:bg-red-200'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={`Click to ${user.isActive ? 'deactivate' : 'activate'} user`}
    >
      {isLoading ? (
        <Loader2 size={getIconSize()} className="animate-spin" />
      ) : user.isActive ? (
        <UserCheck size={getIconSize()} />
      ) : (
        <UserX size={getIconSize()} />
      )}
      {showLabel && (
        <span>
          {isLoading 
            ? (user.isActive ? 'Deactivating...' : 'Activating...') 
            : (user.isActive ? 'Active' : 'Inactive')
          }
        </span>
      )}
    </button>
  )
}