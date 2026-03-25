'use client'

import React from 'react'
import { WifiOff, Wifi, AlertTriangle, RefreshCw } from 'lucide-react'
import { useOnlineStatus, useNetworkStatus } from '../../hooks/useOnlineStatus'

interface OfflineIndicatorProps {
  className?: string
  showConnectionQuality?: boolean
}

export function OfflineIndicator({ className = '', showConnectionQuality = false }: OfflineIndicatorProps) {
  const { isOnline, isOffline, wasOffline } = useOnlineStatus()
  const { connectionQuality, effectiveType } = useNetworkStatus()

  // Don't show anything if online and never was offline
  if (isOnline && !wasOffline && !showConnectionQuality) {
    return null
  }

  const getStatusColor = () => {
    if (isOffline) return 'bg-red-500'
    if (connectionQuality === 'poor') return 'bg-yellow-500'
    if (wasOffline) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const getStatusText = () => {
    if (isOffline) return 'You are offline'
    if (wasOffline) return 'Back online'
    if (connectionQuality === 'poor') return 'Slow connection'
    return 'Online'
  }

  const getIcon = () => {
    if (isOffline) return <WifiOff className="h-4 w-4" />
    if (connectionQuality === 'poor') return <AlertTriangle className="h-4 w-4" />
    return <Wifi className="h-4 w-4" />
  }

  return (
    <div className={`
      fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
      ${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg
      flex items-center space-x-2 text-sm font-medium
      transition-all duration-300 ease-in-out
      ${className}
    `}>
      {getIcon()}
      <span>{getStatusText()}</span>
      
      {showConnectionQuality && isOnline && (
        <span className="text-xs opacity-75">
          ({effectiveType})
        </span>
      )}
      
      {isOffline && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded"
          title="Retry connection"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// Offline banner component
export function OfflineBanner() {
  const { isOffline } = useOnlineStatus()

  if (!isOffline) return null

  return (
    <div className="bg-red-600 text-white px-4 py-3 text-center">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-5 w-5" />
        <span className="font-medium">
          You are currently offline. Some features may not be available.
        </span>
      </div>
    </div>
  )
}

// Connection quality indicator
export function ConnectionQualityIndicator({ className = '' }: { className?: string }) {
  const { isOnline, connectionQuality, effectiveType, downlink } = useNetworkStatus()

  if (!isOnline) {
    return (
      <div className={`flex items-center space-x-1 text-red-600 ${className}`}>
        <WifiOff className="h-4 w-4" />
        <span className="text-xs">Offline</span>
      </div>
    )
  }

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSignalBars = () => {
    const bars = connectionQuality === 'good' ? 3 : connectionQuality === 'fair' ? 2 : 1
    
    return (
      <div className="flex items-end space-x-0.5">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={`
              w-1 bg-current rounded-sm
              ${bar === 1 ? 'h-2' : bar === 2 ? 'h-3' : 'h-4'}
              ${bar <= bars ? 'opacity-100' : 'opacity-30'}
            `}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${getQualityColor()} ${className}`}>
      {getSignalBars()}
      <span className="text-xs capitalize">
        {effectiveType} {downlink > 0 && `(${downlink.toFixed(1)} Mbps)`}
      </span>
    </div>
  )
}