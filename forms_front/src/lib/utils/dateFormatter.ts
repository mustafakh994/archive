/**
 * Centralized date formatting utilities for consistent date/time display
 * Uses Gregorian calendar with Arabic month names and time information throughout the system
 */

export interface DateFormatOptions {
  includeTime?: boolean
  includeSeconds?: boolean
  format?: 'short' | 'medium' | 'long' | 'full'
  locale?: string
  timeZone?: string
  useArabicMonths?: boolean
}

/**
 * Arabic month names mapping (Gregorian calendar)
 */
const ARABIC_MONTHS = {
  long: [
    'January',   // Will be replaced with Arabic
    'February',  // Will be replaced with Arabic
    'March',     // Will be replaced with Arabic
    'April',     // Will be replaced with Arabic
    'May',       // Will be replaced with Arabic
    'June',      // Will be replaced with Arabic
    'July',      // Will be replaced with Arabic
    'August',    // Will be replaced with Arabic
    'September', // Will be replaced with Arabic
    'October',   // Will be replaced with Arabic
    'November',  // Will be replaced with Arabic
    'December'   // Will be replaced with Arabic
  ],
  short: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
}

// Initialize Arabic month names safely
ARABIC_MONTHS.long[0] = String.fromCharCode(0x0643, 0x0627, 0x0646, 0x0648, 0x0646, 0x0020, 0x0627, 0x0644, 0x062B, 0x0627, 0x0646, 0x064A) // كانون الثاني
ARABIC_MONTHS.long[1] = String.fromCharCode(0x0634, 0x0628, 0x0627, 0x0637) // شباط
ARABIC_MONTHS.long[2] = String.fromCharCode(0x0622, 0x0630, 0x0627, 0x0631) // آذار
ARABIC_MONTHS.long[3] = String.fromCharCode(0x0646, 0x064A, 0x0633, 0x0627, 0x0646) // نيسان
ARABIC_MONTHS.long[4] = String.fromCharCode(0x0623, 0x064A, 0x0627, 0x0631) // أيار
ARABIC_MONTHS.long[5] = String.fromCharCode(0x062D, 0x0632, 0x064A, 0x0631, 0x0627, 0x0646) // حزيران
ARABIC_MONTHS.long[6] = String.fromCharCode(0x062A, 0x0645, 0x0648, 0x0632) // تموز
ARABIC_MONTHS.long[7] = String.fromCharCode(0x0622, 0x0628) // آب
ARABIC_MONTHS.long[8] = String.fromCharCode(0x0623, 0x064A, 0x0644, 0x0648, 0x0644) // أيلول
ARABIC_MONTHS.long[9] = String.fromCharCode(0x062A, 0x0634, 0x0631, 0x064A, 0x0646, 0x0020, 0x0627, 0x0644, 0x0623, 0x0648, 0x0644) // تشرين الأول
ARABIC_MONTHS.long[10] = String.fromCharCode(0x062A, 0x0634, 0x0631, 0x064A, 0x0646, 0x0020, 0x0627, 0x0644, 0x062B, 0x0627, 0x0646, 0x064A) // تشرين الثاني
ARABIC_MONTHS.long[11] = String.fromCharCode(0x0643, 0x0627, 0x0646, 0x0648, 0x0646, 0x0020, 0x0627, 0x0644, 0x0623, 0x0648, 0x0644) // كانون الأول

ARABIC_MONTHS.short[0] = String.fromCharCode(0x0643, 0x0627, 0x0646, 0x0648, 0x0646, 0x0020, 0x062B) // كانون ث
ARABIC_MONTHS.short[1] = String.fromCharCode(0x0634, 0x0628, 0x0627, 0x0637) // شباط
ARABIC_MONTHS.short[2] = String.fromCharCode(0x0622, 0x0630, 0x0627, 0x0631) // آذار
ARABIC_MONTHS.short[3] = String.fromCharCode(0x0646, 0x064A, 0x0633, 0x0627, 0x0646) // نيسان
ARABIC_MONTHS.short[4] = String.fromCharCode(0x0623, 0x064A, 0x0627, 0x0631) // أيار
ARABIC_MONTHS.short[5] = String.fromCharCode(0x062D, 0x0632, 0x064A, 0x0631, 0x0627, 0x0646) // حزيران
ARABIC_MONTHS.short[6] = String.fromCharCode(0x062A, 0x0645, 0x0648, 0x0632) // تموز
ARABIC_MONTHS.short[7] = String.fromCharCode(0x0622, 0x0628) // آب
ARABIC_MONTHS.short[8] = String.fromCharCode(0x0623, 0x064A, 0x0644, 0x0648, 0x0644) // أيلول
ARABIC_MONTHS.short[9] = String.fromCharCode(0x062A, 0x0634, 0x0631, 0x064A, 0x0646, 0x0020, 0x0623) // تشرين أ
ARABIC_MONTHS.short[10] = String.fromCharCode(0x062A, 0x0634, 0x0631, 0x064A, 0x0646, 0x0020, 0x062B) // تشرين ث
ARABIC_MONTHS.short[11] = String.fromCharCode(0x0643, 0x0627, 0x0646, 0x0648, 0x0646, 0x0020, 0x0623) // كانون أ

/**
 * Default formatting options
 */
const DEFAULT_OPTIONS: Required<DateFormatOptions> = {
  includeTime: true,
  includeSeconds: false,
  format: 'medium',
  locale: 'ar-SY',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  useArabicMonths: true
}

/**
 * Format a date string or Date object with Gregorian calendar and Arabic month names
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!date) return String.fromCharCode(0x063A, 0x064A, 0x0631, 0x0020, 0x0645, 0x062A, 0x0648, 0x0641, 0x0631) // غير متوفر
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return String.fromCharCode(0x062A, 0x0627, 0x0631, 0x064A, 0x062E, 0x0020, 0x063A, 0x064A, 0x0631, 0x0020, 0x0635, 0x062D, 0x064A, 0x062D) // تاريخ غير صحيح
    }

    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    if (opts.useArabicMonths) {
      // Use Arabic month names with Gregorian calendar
      const day = dateObj.getDate()
      const month = dateObj.getMonth()
      const year = dateObj.getFullYear()
      
      const monthName = opts.format === 'short' 
        ? ARABIC_MONTHS.short[month]
        : ARABIC_MONTHS.long[month]
      
      let dateStr = `${day} ${monthName} ${year}`
      
      if (opts.includeTime) {
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        let timeStr = `${hours}:${minutes}`
        
        if (opts.includeSeconds) {
          const seconds = String(dateObj.getSeconds()).padStart(2, '0')
          timeStr += `:${seconds}`
        }
        
        return `${dateStr} ${String.fromCharCode(0x0641, 0x064A)} ${timeStr}` // في
      }
      
      return dateStr
    } else {
      // Fallback to standard formatting
      const dateOptions: Intl.DateTimeFormatOptions = {
        calendar: 'gregory',
        timeZone: opts.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }

      const timeOptions: Intl.DateTimeFormatOptions = {
        calendar: 'gregory',
        timeZone: opts.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        ...(opts.includeSeconds && { second: '2-digit' }),
        hour12: false
      }

      const dateStr = dateObj.toLocaleDateString(opts.locale, dateOptions)
      
      if (opts.includeTime) {
        const timeStr = dateObj.toLocaleTimeString(opts.locale, timeOptions)
        return `${dateStr} ${String.fromCharCode(0x0641, 0x064A)} ${timeStr}` // في
      }
      
      return dateStr
    }
  } catch (error) {
    console.error('Error formatting date:', error)
    return String.fromCharCode(0x062A, 0x0627, 0x0631, 0x064A, 0x062E, 0x0020, 0x063A, 0x064A, 0x0631, 0x0020, 0x0635, 0x062D, 0x064A, 0x062D) // تاريخ غير صحيح
  }
}

/**
 * Format date for display in tables (compact format with time)
 */
export function formatTableDate(date: string | Date | null | undefined): string {
  return formatDate(date, {
    format: 'short',
    includeTime: true,
    includeSeconds: false
  })
}

/**
 * Format date for detailed views (full format with time)
 */
export function formatDetailDate(date: string | Date | null | undefined): string {
  return formatDate(date, {
    format: 'long',
    includeTime: true,
    includeSeconds: true
  })
}

/**
 * Format date for form inputs (ISO format for input[type="datetime-local"])
 */
export function formatInputDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return ''
    }

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting input date:', error)
    return ''
  }
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }

    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    } else {
      // For older dates, show the actual date with time
      return formatDate(dateObj, { format: 'short', includeTime: true })
    }
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Invalid Date'
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    
    return dateObj.toDateString() === today.toDateString()
  } catch (error) {
    return false
  }
}

/**
 * Check if a date is within the last 24 hours
 */
export function isWithin24Hours(date: string | Date | null | undefined): boolean {
  if (!date) return false
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000
  } catch (error) {
    return false
  }
}

/**
 * Parse date from various input formats
 */
export function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }
  
  try {
    const parsed = new Date(input)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch (error) {
    return null
  }
}

/**
 * Get current date/time in ISO format for API calls
 */
export function getCurrentISOString(): string {
  return new Date().toISOString()
}

/**
 * Convert UTC date to local timezone
 */
export function utcToLocal(utcDate: string | Date): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
}

/**
 * Convert local date to UTC
 */
export function localToUtc(localDate: string | Date): Date {
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate
  return new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
}