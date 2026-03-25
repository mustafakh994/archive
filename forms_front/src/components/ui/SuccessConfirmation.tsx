'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle, X, ExternalLink, Copy, Check } from 'lucide-react'

interface SuccessConfirmationProps {
  isVisible: boolean
  title: string
  message?: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }>
  className?: string
}

export function SuccessConfirmation({
  isVisible,
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  actions = [],
  className = ''
}: SuccessConfirmationProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      
      if (autoClose && autoCloseDelay > 0) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoCloseDelay)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isVisible, autoClose, autoCloseDelay])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose?.()
    }, 300) // Match animation duration
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`
        bg-white rounded-lg shadow-xl max-w-md w-full p-6
        transform transition-all duration-300 ease-out
        ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        ${className}
      `}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
            
            {message && (
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
            )}
            
            {actions.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${action.variant === 'primary' 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {onClose && (
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline success message component
interface InlineSuccessProps {
  message: string
  isVisible: boolean
  onClose?: () => void
  className?: string
}

export function InlineSuccess({ message, isVisible, onClose, className = '' }: InlineSuccessProps) {
  if (!isVisible) return null

  return (
    <div className={`
      flex items-center p-3 bg-green-50 border border-green-200 rounded-lg
      ${className}
    `}>
      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      <span className="ml-2 text-sm text-green-800 flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-green-500 hover:text-green-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Success toast notification
interface SuccessToastProps {
  title: string
  message?: string
  isVisible: boolean
  onClose?: () => void
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function SuccessToast({
  title,
  message,
  isVisible,
  onClose,
  duration = 4000,
  position = 'top-right'
}: SuccessToastProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isVisible, duration])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (!isVisible) return null

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full`}>
      <div className={`
        bg-white border border-green-200 rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-out
        ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}>
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-gray-600">
                {message}
              </p>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={handleClose}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Copy to clipboard success feedback
interface CopySuccessProps {
  text: string
  className?: string
}

export function CopySuccess({ text, className = '' }: CopySuccessProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center px-3 py-1 text-sm border rounded-lg
        transition-all duration-200
        ${copied 
          ? 'bg-green-50 border-green-200 text-green-700' 
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
        }
        ${className}
      `}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-1" />
          Copy
        </>
      )}
    </button>
  )
}

// Form submission success
interface FormSuccessProps {
  isVisible: boolean
  formName: string
  submissionId?: string
  onClose?: () => void
  onViewSubmission?: () => void
  onCreateAnother?: () => void
}

export function FormSubmissionSuccess({
  isVisible,
  formName,
  submissionId,
  onClose,
  onViewSubmission,
  onCreateAnother
}: FormSuccessProps) {
  const actions = []
  
  if (onViewSubmission) {
    actions.push({
      label: 'View Submission',
      onClick: onViewSubmission,
      variant: 'primary' as const
    })
  }
  
  if (onCreateAnother) {
    actions.push({
      label: 'Create Another',
      onClick: onCreateAnother,
      variant: 'secondary' as const
    })
  }

  return (
    <SuccessConfirmation
      isVisible={isVisible}
      title="Form Submitted Successfully!"
      message={`Your ${formName} form has been submitted successfully.${
        submissionId ? ` Submission ID: ${submissionId}` : ''
      }`}
      onClose={onClose}
      actions={actions}
      autoClose={false}
    />
  )
}