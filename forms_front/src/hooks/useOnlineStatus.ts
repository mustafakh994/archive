'use client'

import { useState, useEffect } from 'react'

export interface OnlineStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // If we were offline, mark that we came back online
      if (!navigator.onLine) {
        setWasOffline(true)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Reset wasOffline flag after some time when back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 3000) // Reset after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline
  }
}

// Hook for network status with additional features
export function useNetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: true,
    downlink: 0,
    effectiveType: 'unknown',
    rtt: 0
  })

  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good')

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection

      const info = {
        isOnline: navigator.onLine,
        downlink: connection?.downlink || 0,
        effectiveType: connection?.effectiveType || 'unknown',
        rtt: connection?.rtt || 0
      }

      setNetworkInfo(info)

      // Determine connection quality
      if (!info.isOnline) {
        setConnectionQuality('poor')
      } else if (info.effectiveType === '4g' || info.downlink > 2) {
        setConnectionQuality('good')
      } else if (info.effectiveType === '3g' || info.downlink > 0.5) {
        setConnectionQuality('fair')
      } else {
        setConnectionQuality('poor')
      }
    }

    // Initial update
    updateNetworkInfo()

    // Listen for network changes
    const handleOnline = () => updateNetworkInfo()
    const handleOffline = () => updateNetworkInfo()
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes if supported
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  return {
    ...networkInfo,
    connectionQuality,
    isSlowConnection: connectionQuality === 'poor'
  }
}