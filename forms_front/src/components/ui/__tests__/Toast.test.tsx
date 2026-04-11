import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  ToastProvider, 
  useToast, 
  useSuccessToast, 
  useErrorToast, 
  useWarningToast, 
  useInfoToast 
} from '../Toast'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Test component for using toast hooks
const ToastTestComponent = () => {
  const { addToast, removeToast, clearAllToasts } = useToast()
  
  return (
    <div>
      <button 
        onClick={() => addToast({ type: 'success', title: 'Success!', message: 'Operation completed' })}
      >
        Add Success Toast
      </button>
      <button 
        onClick={() => addToast({ type: 'error', title: 'Error!', message: 'Something went wrong' })}
      >
        Add Error Toast
      </button>
      <button 
        onClick={() => addToast({ type: 'warning', title: 'Warning!', message: 'Please be careful' })}
      >
        Add Warning Toast
      </button>
      <button 
        onClick={() => addToast({ type: 'info', title: 'Info', message: 'Just so you know' })}
      >
        Add Info Toast
      </button>
      <button onClick={clearAllToasts}>
        Clear All
      </button>
    </div>
  )
}

// Test component for specific toast hooks
const SpecificToastTestComponent = () => {
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const warningToast = useWarningToast()
  const infoToast = useInfoToast()
  
  return (
    <div>
      <button onClick={() => successToast('Success!', 'It worked!')}>
        Success Toast
      </button>
      <button onClick={() => errorToast('Error!', 'It failed!')}>
        Error Toast
      </button>
      <button onClick={() => warningToast('Warning!', 'Be careful!')}>
        Warning Toast
      </button>
      <button onClick={() => infoToast('Info!', 'Good to know!')}>
        Info Toast
      </button>
    </div>
  )
}

// Test component with action toast
const ActionToastTestComponent = () => {
  const { addToast } = useToast()
  
  const handleAddActionToast = () => {
    addToast({
      type: 'info',
      title: 'Action Required',
      message: 'Click the action button',
      action: {
        label: 'Take Action',
        onClick: () => console.log('Action clicked')
      }
    })
  }
  
  return (
    <button onClick={handleAddActionToast}>
      Add Action Toast
    </button>
  )
}

describe('ToastProvider and useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders toast when added', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    )
    
    const button = screen.getByText('Add Success Toast')
    fireEvent.click(button)
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Operation completed')).toBeInTheDocument()
  })

  it('renders different toast types with correct styling', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    )
    
    // Add different types of toasts
    fireEvent.click(screen.getByText('Add Success Toast'))
    fireEvent.click(screen.getByText('Add Error Toast'))
    fireEvent.click(screen.getByText('Add Warning Toast'))
    fireEvent.click(screen.getByText('Add Info Toast'))
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Error!')).toBeInTheDocument()
    expect(screen.getByText('Warning!')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('auto-removes toast after duration', async () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    )
    
    const button = screen.getByText('Add Success Toast')
    fireEvent.click(button)
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    
    // Fast-forward time
    vi.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument()
    })
  })

  it('allows manual toast removal', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    )
    
    const button = screen.getByText('Add Success Toast')
    fireEvent.click(button)
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    
    // Click close button
    const closeButton = screen.getByRole('button', { name: '' }) // X button
    fireEvent.click(closeButton)
    
    // Should start exit animation
    vi.advanceTimersByTime(300)
    
    expect(screen.queryByText('Success!')).not.toBeInTheDocument()
  })

  it('clears all toasts', () => {
    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    )
    
    // Add multiple toasts
    fireEvent.click(screen.getByText('Add Success Toast'))
    fireEvent.click(screen.getByText('Add Error Toast'))
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Error!')).toBeInTheDocument()
    
    // Clear all
    fireEvent.click(screen.getByText('Clear All'))
    
    expect(screen.queryByText('Success!')).not.toBeInTheDocument()
    expect(screen.queryByText('Error!')).not.toBeInTheDocument()
  })

  it('handles toast with action button', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(
      <ToastProvider>
        <ActionToastTestComponent />
      </ToastProvider>
    )
    
    fireEvent.click(screen.getByText('Add Action Toast'))
    
    expect(screen.getByText('Action Required')).toBeInTheDocument()
    expect(screen.getByText('Take Action')).toBeInTheDocument()
    
    // Click action button
    fireEvent.click(screen.getByText('Take Action'))
    
    expect(consoleSpy).toHaveBeenCalledWith('Action clicked')
    
    consoleSpy.mockRestore()
  })
})

describe('Specific toast hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('useSuccessToast creates success toast with default duration', () => {
    render(
      <ToastProvider>
        <SpecificToastTestComponent />
      </ToastProvider>
    )
    
    fireEvent.click(screen.getByText('Success Toast'))
    
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('It worked!')).toBeInTheDocument()
    
    // Should auto-remove after 5 seconds (default)
    vi.advanceTimersByTime(5000)
    
    waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument()
    })
  })

  it('useErrorToast creates error toast with longer duration', () => {
    render(
      <ToastProvider>
        <SpecificToastTestComponent />
      </ToastProvider>
    )
    
    fireEvent.click(screen.getByText('Error Toast'))
    
    expect(screen.getByText('Error!')).toBeInTheDocument()
    expect(screen.getByText('It failed!')).toBeInTheDocument()
    
    // Should still be visible after 5 seconds
    vi.advanceTimersByTime(5000)
    expect(screen.getByText('Error!')).toBeInTheDocument()
    
    // Should auto-remove after 8 seconds
    vi.advanceTimersByTime(3000)
    
    waitFor(() => {
      expect(screen.queryByText('Error!')).not.toBeInTheDocument()
    })
  })

  it('useWarningToast creates warning toast', () => {
    render(
      <ToastProvider>
        <SpecificToastTestComponent />
      </ToastProvider>
    )
    
    fireEvent.click(screen.getByText('Warning Toast'))
    
    expect(screen.getByText('Warning!')).toBeInTheDocument()
    expect(screen.getByText('Be careful!')).toBeInTheDocument()
  })

  it('useInfoToast creates info toast', () => {
    render(
      <ToastProvider>
        <SpecificToastTestComponent />
      </ToastProvider>
    )
    
    fireEvent.click(screen.getByText('Info Toast'))
    
    expect(screen.getByText('Info!')).toBeInTheDocument()
    expect(screen.getByText('Good to know!')).toBeInTheDocument()
  })
})

describe('Toast without provider', () => {
  it('throws error when useToast is used without provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<ToastTestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')
    
    consoleSpy.mockRestore()
  })
})