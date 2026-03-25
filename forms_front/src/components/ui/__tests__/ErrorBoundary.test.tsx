import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary, useErrorReporting } from '../ErrorBoundary'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Mock component for testing withErrorBoundary HOC
const TestComponent = () => <div>Test Component</div>
const WrappedComponent = withErrorBoundary(TestComponent)

// Mock component for testing useErrorReporting hook
const ErrorReportingComponent = () => {
  const { reportError } = useErrorReporting()
  
  const handleClick = () => {
    reportError(new Error('Manual error'), { context: 'test' })
  }
  
  return <button onClick={handleClick}>Report Error</button>
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom Error UI</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('logs error to localStorage', () => {
    localStorageMock.getItem.mockReturnValue('[]')
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'error-logs',
      expect.stringContaining('Test error')
    )
  })

  it('handles retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)
    
    // After retry, render without error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    render(<WrappedComponent />)
    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })

  it('sets correct display name', () => {
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })
})

describe('useErrorReporting hook', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('[]')
    sessionStorageMock.getItem.mockReturnValue(null)
  })

  it('reports errors to localStorage', () => {
    render(<ErrorReportingComponent />)
    
    const button = screen.getByText('Report Error')
    fireEvent.click(button)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'error-logs',
      expect.stringContaining('Manual error')
    )
  })

  it('dispatches custom event for manual error reports', () => {
    const eventListener = vi.fn()
    window.addEventListener('manualErrorReport', eventListener)
    
    render(<ErrorReportingComponent />)
    
    const button = screen.getByText('Report Error')
    fireEvent.click(button)
    
    expect(eventListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          message: 'Manual error',
          context: { context: 'test' }
        })
      })
    )
    
    window.removeEventListener('manualErrorReport', eventListener)
  })

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage error')
    })
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<ErrorReportingComponent />)
    
    const button = screen.getByText('Report Error')
    fireEvent.click(button)
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to report error:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})