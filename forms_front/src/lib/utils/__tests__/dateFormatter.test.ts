import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatDate,
  formatTableDate,
  formatDetailDate,
  formatInputDate,
  formatRelativeTime,
  isToday,
  isWithin24Hours,
  parseDate,
  getCurrentISOString,
  utcToLocal,
  localToUtc
} from '../dateFormatter'

describe('dateFormatter', () => {
  beforeEach(() => {
    // Mock current time to ensure consistent test results
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const date = '2024-01-15T10:30:00.000Z'
      const result = formatDate(date)
      expect(result).toContain('15')
      expect(result).toContain('2024')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(10)
    })

    it('should format date without time when includeTime is false', () => {
      const date = '2024-01-15T10:30:00.000Z'
      const result = formatDate(date, { includeTime: false })
      expect(result).toContain('15')
      expect(result).toContain('2024')
      expect(typeof result).toBe('string')
    })

    it('should format date with seconds when includeSeconds is true', () => {
      const date = '2024-01-15T10:30:45.000Z'
      const result = formatDate(date, { includeTime: true, includeSeconds: true })
      expect(result).toMatch(/15 كانون الثاني 2024 في \d{2}:\d{2}:\d{2}/)
    })

    it('should handle null/undefined dates', () => {
      const expected = String.fromCharCode(0x063A, 0x064A, 0x0631, 0x0020, 0x0645, 0x062A, 0x0648, 0x0641, 0x0631)
      expect(formatDate(null)).toBe(expected)
      expect(formatDate(undefined)).toBe(expected)
      expect(formatDate('')).toBe(expected)
    })

    it('should handle invalid dates', () => {
      const expected = String.fromCharCode(0x062A, 0x0627, 0x0631, 0x064A, 0x062E, 0x0020, 0x063A, 0x064A, 0x0631, 0x0020, 0x0635, 0x062D, 0x064A, 0x062D)
      expect(formatDate('invalid-date')).toBe(expected)
    })

    it('should use Gregorian calendar with Arabic month names', () => {
      const date = '2024-01-15T10:30:00.000Z'
      const result = formatDate(date)
      // Should not contain any Hijri calendar indicators
      expect(result).not.toMatch(/AH|هـ/)
      expect(result).toMatch(/2024/) // Gregorian year
      expect(result).toMatch(/كانون الثاني/) // Arabic month name
    })
  })

  describe('formatTableDate', () => {
    it('should format date for table display', () => {
      const date = '2024-01-15T10:30:00.000Z'
      const result = formatTableDate(date)
      expect(result).toMatch(/15 كانون ث 2024 في \d{2}:\d{2}/)
    })
  })

  describe('formatDetailDate', () => {
    it('should format date for detailed display with seconds', () => {
      const date = '2024-01-15T10:30:45.000Z'
      const result = formatDetailDate(date)
      expect(result).toMatch(/15 كانون الثاني 2024 في \d{2}:\d{2}:\d{2}/)
    })
  })

  describe('formatInputDate', () => {
    it('should format date for datetime-local input', () => {
      const date = '2024-01-15T10:30:00.000Z'
      const result = formatInputDate(date)
      expect(result).toMatch(/2024-01-15T\d{2}:\d{2}/)
    })

    it('should handle null/undefined dates', () => {
      expect(formatInputDate(null)).toBe('')
      expect(formatInputDate(undefined)).toBe('')
    })

    it('should handle invalid dates', () => {
      expect(formatInputDate('invalid-date')).toBe('')
    })
  })

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent dates', () => {
      const date = new Date(Date.now() - 30000) // 30 seconds ago
      const result = formatRelativeTime(date)
      expect(result).toBe('Just now')
    })

    it('should return minutes for recent dates', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      const result = formatRelativeTime(date)
      expect(result).toBe('5 minutes ago')
    })

    it('should return hours for dates within 24 hours', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      const result = formatRelativeTime(date)
      expect(result).toBe('3 hours ago')
    })

    it('should return days for dates within a week', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      const result = formatRelativeTime(date)
      expect(result).toBe('2 days ago')
    })

    it('should return formatted date for older dates', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const result = formatRelativeTime(date)
      expect(result).toMatch(/\d+ كانون ث 2024 في \d{2}:\d{2}/)
    })

    it('should handle singular forms correctly', () => {
      const date1 = new Date(Date.now() - 60 * 1000) // 1 minute ago
      expect(formatRelativeTime(date1)).toBe('1 minute ago')

      const date2 = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      expect(formatRelativeTime(date2)).toBe('1 hour ago')

      const date3 = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      expect(formatRelativeTime(date3)).toBe('1 day ago')
    })
  })

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date()
      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should handle null/undefined dates', () => {
      expect(isToday(null)).toBe(false)
      expect(isToday(undefined)).toBe(false)
    })
  })

  describe('isWithin24Hours', () => {
    it('should return true for dates within 24 hours', () => {
      const recent = new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      expect(isWithin24Hours(recent)).toBe(true)
    })

    it('should return false for dates older than 24 hours', () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      expect(isWithin24Hours(old)).toBe(false)
    })

    it('should return false for future dates', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000) // 1 hour in future
      expect(isWithin24Hours(future)).toBe(false)
    })
  })

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const result = parseDate('2024-01-15T10:30:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
    })

    it('should return Date objects as-is if valid', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      const result = parseDate(date)
      expect(result).toBe(date)
    })

    it('should return null for invalid inputs', () => {
      expect(parseDate('invalid-date')).toBe(null)
      expect(parseDate(null)).toBe(null)
      expect(parseDate(undefined)).toBe(null)
    })
  })

  describe('getCurrentISOString', () => {
    it('should return current date in ISO format', () => {
      const result = getCurrentISOString()
      expect(result).toBe('2024-01-15T12:00:00.000Z')
    })
  })

  describe('timezone conversion', () => {
    it('should convert UTC to local time', () => {
      const utcDate = '2024-01-15T12:00:00.000Z'
      const result = utcToLocal(utcDate)
      expect(result).toBeInstanceOf(Date)
    })

    it('should convert local to UTC time', () => {
      const localDate = new Date('2024-01-15T12:00:00')
      const result = localToUtc(localDate)
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('edge cases', () => {
    it('should handle leap year dates correctly', () => {
      const leapYearDate = '2024-02-29T12:00:00.000Z'
      const result = formatDate(leapYearDate)
      expect(result).toMatch(/02\/29\/2024/)
    })

    it('should handle year boundaries correctly', () => {
      const newYearDate = '2024-01-01T00:00:00.000Z'
      const result = formatDate(newYearDate)
      expect(result).toMatch(/1 كانون الثاني 2024/)
    })

    it('should handle different timezones consistently', () => {
      const date = '2024-01-15T12:00:00.000Z'
      const result1 = formatDate(date, { timeZone: 'UTC' })
      const result2 = formatDate(date, { timeZone: 'America/New_York' })
      
      // Both should be valid formatted dates with Arabic months
      expect(result1).toMatch(/كانون الثاني 2024/)
      expect(result2).toMatch(/كانون الثاني 2024/)
    })
  })
})