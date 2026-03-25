'use client'

import React, { useState, useEffect } from 'react'
import { Database, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useFormStore } from '@/lib/store/useFormStore'

export default function LocalStorageStatus() {
  const [hasLocalData, setHasLocalData] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const { loadFromLocalStorage, clearLocalStorage } = useFormStore()

  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const saved = localStorage.getItem('formBuilderData')
        if (saved) {
          const data = JSON.parse(saved)
          setHasLocalData(true)
          setLastSaved(data.lastSaved || null)
        } else {
          setHasLocalData(false)
          setLastSaved(null)
        }
      } catch (error) {
        console.error('Error checking localStorage:', error)
        setHasLocalData(false)
        setLastSaved(null)
      }
    }

    checkLocalStorage()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      checkLocalStorage()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLoadFromLocalStorage = () => {
    loadFromLocalStorage()
    alert('تم تحميل النموذج من التخزين المحلي')
  }

  const handleClearLocalStorage = () => {
    if (confirm('هل أنت متأكد من حذف النموذج المحفوظ محلياً؟')) {
      clearLocalStorage()
      setHasLocalData(false)
      setLastSaved(null)
      alert('تم حذف النموذج من التخزين المحلي')
    }
  }

  const formatLastSaved = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ar-SY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'غير معروف'
    }
  }

  if (!hasLocalData) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-200">
        <AlertCircle size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">لا توجد بيانات محفوظة</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-green-50 rounded-md border border-green-200 px-3 py-1.5">
      <CheckCircle size={16} className="text-green-600" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-green-700">بيانات محفوظة محلياً</span>
        {lastSaved && (
          <span className="text-xs text-green-600">
            {formatLastSaved(lastSaved)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 border-l border-green-300 pl-2 ml-1">
        <button
          onClick={handleLoadFromLocalStorage}
          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
          title="تحميل من التخزين المحلي"
        >
          <Download size={14} />
        </button>
        <button
          onClick={handleClearLocalStorage}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
          title="حذف من التخزين المحلي"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}


