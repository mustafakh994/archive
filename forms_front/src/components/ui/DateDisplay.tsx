'use client'

import React from 'react'
import { 
  formatDate, 
  formatTableDate, 
  formatDetailDate, 
  formatRelativeTime, 
  isToday, 
  isWithin24Hours 
} from '@/lib/utils/dateFormatter'

interface DateDisplayProps {
  date: string | Date | null | undefined
  format?: 'table' | 'detail' | 'relative' | 'custom'
  options?: {
    includeTime?: boolean
    includeSeconds?: boolean
    format?: 'short' | 'medium' | 'long' | 'full'
    locale?: string
    timeZone?: string
  }
  className?: string
  showRelativeTooltip?: boolean
}

/**
 * Standardized date display component with consistent Gregorian calendar formatting
 */
export function DateDisplay({ 
  date, 
  format = 'table', 
  options = {},
  className = '',
  showRelativeTooltip = false
}: DateDisplayProps) {
  if (!date) {
    return <span className={`text-gray-400 ${className}`}>N/A</span>
  }

  let formattedDate: string
  let relativeTime: string | null = null

  switch (format) {
    case 'table':
      formattedDate = formatTableDate(date)
      break
    case 'detail':
      formattedDate = formatDetailDate(date)
      break
    case 'relative':
      formattedDate = formatRelativeTime(date)
      break
    case 'custom':
      formattedDate = formatDate(date, options)
      break
    default:
      formattedDate = formatTableDate(date)
  }

  if (showRelativeTooltip && format !== 'relative') {
    relativeTime = formatRelativeTime(date)
  }

  const isRecent = isWithin24Hours(date)
  const isTodayDate = isToday(date)

  const baseClasses = `${className} ${
    isRecent ? 'text-green-600 font-medium' : 
    isTodayDate ? 'text-blue-600' : 
    'text-gray-700'
  }`

  if (showRelativeTooltip && relativeTime) {
    return (
      <span 
        className={baseClasses}
        title={relativeTime}
      >
        {formattedDate}
      </span>
    )
  }

  return (
    <span className={baseClasses}>
      {formattedDate}
    </span>
  )
}

/**
 * Quick date display for tables
 */
export function TableDate({ date, className = '' }: { date: string | Date | null | undefined, className?: string }) {
  return <DateDisplay date={date} format="table" className={className} showRelativeTooltip />
}

/**
 * Detailed date display for forms and detail views
 */
export function DetailDate({ date, className = '' }: { date: string | Date | null | undefined, className?: string }) {
  return <DateDisplay date={date} format="detail" className={className} />
}

/**
 * Relative time display (e.g., "2 hours ago")
 */
export function RelativeDate({ date, className = '' }: { date: string | Date | null | undefined, className?: string }) {
  return <DateDisplay date={date} format="relative" className={className} />
}

/**
 * Date input component with proper formatting
 */
interface DateInputProps {
  value: string | Date | null | undefined
  onChange: (date: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
  includeTime?: boolean
}

export function DateInput({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = '',
  includeTime = true
}: DateInputProps) {
  const inputType = includeTime ? 'datetime-local' : 'date'
  
  const formatForInput = (date: string | Date | null | undefined): string => {
    if (!date) return ''
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(dateObj.getTime())) {
        return ''
      }

      if (includeTime) {
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        
        return `${year}-${month}-${day}T${hours}:${minutes}`
      } else {
        // Format for date input: YYYY-MM-DD
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        
        return `${year}-${month}-${day}`
      }
    } catch (error) {
      console.error('Error formatting date for input:', error)
      return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    if (inputValue) {
      // Convert to ISO string for consistent handling
      const date = new Date(inputValue)
      onChange(date.toISOString())
    } else {
      onChange('')
    }
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={inputType}
        value={formatForInput(value)}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className={`
          block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500
          ${className}
        `}
      />
    </div>
  )
}

/**
 * Date range picker component
 */
interface DateRangeProps {
  startDate: string | Date | null | undefined
  endDate: string | Date | null | undefined
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  startLabel?: string
  endLabel?: string
  required?: boolean
  disabled?: boolean
  className?: string
  includeTime?: boolean
}

export function DateRange({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  required = false,
  disabled = false,
  className = '',
  includeTime = true
}: DateRangeProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <DateInput
        value={startDate}
        onChange={onStartDateChange}
        label={startLabel}
        required={required}
        disabled={disabled}
        includeTime={includeTime}
      />
      <DateInput
        value={endDate}
        onChange={onEndDateChange}
        label={endLabel}
        required={required}
        disabled={disabled}
        includeTime={includeTime}
      />
    </div>
  )
}