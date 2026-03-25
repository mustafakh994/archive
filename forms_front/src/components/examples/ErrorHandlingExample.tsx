'use client'

import React, { useState } from 'react'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { useToast, useSuccessToast, useErrorToast, useWarningToast, useInfoToast } from '../ui/Toast'
import { LoadingSpinner, LoadingButton } from '../ui/LoadingSpinner'
import { ProgressBar, CircularProgress } from '../ui/ProgressIndicator'
import { SuccessConfirmation, InlineSuccess } from '../ui/SuccessConfirmation'
import { OfflineIndicator, ConnectionQualityIndicator } from '../ui/OfflineIndicator'
import { useLoadingState, useAsyncOperation, useFormSubmission } from '../../hooks/useLoadingState'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useErrorStore } from '../../lib/store/useErrorStore'
import { DepartmentTestComponent } from './DepartmentTestComponent'
import { FormCreationTestComponent } from './FormCreationTestComponent'
import { UserManagementDemo } from './UserManagementDemo'
import { PermissionTestComponent } from './PermissionTestComponent'

// Component that throws an error for testing
const ErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a test error from ErrorComponent')
  }
  return <div className="p-4 bg-green-100 text-green-800 rounded">No error occurred!</div>
}

// Simulated API call
const simulateApiCall = (shouldFail: boolean = false, delay: number = 2000): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('API call failed'))
      } else {
        resolve('API call successful!')
      }
    }, delay)
  })
}

export function ErrorHandlingExample() {
  const [throwError, setThrowError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showInlineSuccess, setShowInlineSuccess] = useState(false)
  
  // Toast hooks
  const { addToast } = useToast()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const warningToast = useWarningToast()
  const infoToast = useInfoToast()
  
  // Loading state hooks
  const loadingState = useLoadingState()
  const asyncOperation = useAsyncOperation()
  const formSubmission = useFormSubmission()
  
  // Network status
  const { isOnline, isOffline } = useOnlineStatus()
  
  // Error store
  const { setGlobalError, clearGlobalError, globalError } = useErrorStore()

  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        successToast('Success!', 'Operation completed successfully')
        break
      case 'error':
        errorToast('Error!', 'Something went wrong')
        break
      case 'warning':
        warningToast('Warning!', 'Please be careful')
        break
      case 'info':
        infoToast('Info', 'Just so you know')
        break
    }
  }

  const handleLoadingDemo = async () => {
    loadingState.startLoading(0)
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      loadingState.setProgress(i)
    }
    
    loadingState.stopLoading()
    successToast('Loading Complete!', 'Progress reached 100%')
  }

  const handleAsyncOperationDemo = async (shouldFail: boolean = false) => {
    const result = await asyncOperation.execute(
      () => simulateApiCall(shouldFail),
      {
        onSuccess: (result) => successToast('Success!', result),
        onError: (error) => errorToast('Failed!', error.message)
      }
    )
    
    if (result) {
      console.log('Operation result:', result)
    }
  }

  const handleFormSubmissionDemo = async () => {
    const formData = { name: 'Test User', email: 'test@example.com' }
    
    const result = await formSubmission.submit(
      formData,
      async (data) => {
        await simulateApiCall(false, 1500)
        return { id: '123', ...data }
      },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        },
        onError: (error) => errorToast('Submission Failed', error.message),
        validate: (data) => {
          const errors: Record<string, string> = {}
          if (!data.name) errors.name = 'Name is required'
          if (!data.email) errors.email = 'Email is required'
          return Object.keys(errors).length > 0 ? errors : null
        }
      }
    )
    
    if (result) {
      console.log('Form submission result:', result)
    }
  }

  const handleProgressDemo = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setShowInlineSuccess(true)
          setTimeout(() => setShowInlineSuccess(false), 3000)
          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  const handleGlobalErrorDemo = () => {
    setGlobalError('This is a global error message')
    setTimeout(() => clearGlobalError(), 5000)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Error Handling & User Feedback Demo
        </h1>
        <p className="text-gray-600">
          Comprehensive demonstration of error handling, loading states, and user feedback components
        </p>
      </div>

      {/* Network Status */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Network Status</h2>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <ConnectionQualityIndicator />
        </div>
        <OfflineIndicator showConnectionQuality />
      </div>

      {/* Global Error Display */}
      {globalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-600 font-medium">Global Error:</div>
              <div className="ml-2 text-red-800">{globalError}</div>
            </div>
            <button
              onClick={clearGlobalError}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications Demo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Toast Notifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleToastDemo('success')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Success Toast
          </button>
          <button
            onClick={() => handleToastDemo('error')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Error Toast
          </button>
          <button
            onClick={() => handleToastDemo('warning')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Warning Toast
          </button>
          <button
            onClick={() => handleToastDemo('info')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Info Toast
          </button>
        </div>
      </div>

      {/* Error Boundary Demo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Error Boundary</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setThrowError(!throwError)}
              className={`px-4 py-2 rounded ${
                throwError 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {throwError ? 'Stop Error' : 'Trigger Error'}
            </button>
            <span className="text-sm text-gray-600">
              Toggle to test error boundary behavior
            </span>
          </div>
          
          <ErrorBoundary>
            <ErrorComponent shouldThrow={throwError} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Loading States Demo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="space-y-6">
          {/* Basic Loading */}
          <div>
            <h3 className="font-medium mb-2">Basic Loading with Progress</h3>
            <LoadingButton
              loading={loadingState.isLoading}
              onClick={handleLoadingDemo}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start Loading Demo
            </LoadingButton>
            {loadingState.isLoading && (
              <div className="mt-4">
                <ProgressBar progress={loadingState.progress || 0} />
              </div>
            )}
          </div>

          {/* Async Operation */}
          <div>
            <h3 className="font-medium mb-2">Async Operations</h3>
            <div className="flex space-x-3">
              <LoadingButton
                loading={asyncOperation.isLoading}
                onClick={() => handleAsyncOperationDemo(false)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Success Operation
              </LoadingButton>
              <LoadingButton
                loading={asyncOperation.isLoading}
                onClick={() => handleAsyncOperationDemo(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Failing Operation
              </LoadingButton>
            </div>
            {asyncOperation.error && (
              <div className="mt-2 text-red-600 text-sm">{asyncOperation.error}</div>
            )}
          </div>

          {/* Form Submission */}
          <div>
            <h3 className="font-medium mb-2">Form Submission</h3>
            <LoadingButton
              loading={formSubmission.isLoading}
              onClick={handleFormSubmissionDemo}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Submit Form
            </LoadingButton>
            {formSubmission.error && (
              <div className="mt-2 text-red-600 text-sm">{formSubmission.error}</div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicators Demo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Progress Indicators</h2>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Progress Bar</h3>
              <button
                onClick={handleProgressDemo}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Start Progress
              </button>
            </div>
            <ProgressBar progress={progress} />
            {showInlineSuccess && (
              <InlineSuccess
                message="Progress completed successfully!"
                isVisible={showInlineSuccess}
                onClose={() => setShowInlineSuccess(false)}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Circular Progress</h3>
            <div className="flex items-center space-x-4">
              <CircularProgress progress={progress} size={80} />
              <CircularProgress progress={75} size={60} color="green" />
              <CircularProgress progress={50} size={60} color="yellow" />
              <CircularProgress progress={25} size={60} color="red" />
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Demo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Global Error Management</h2>
        <button
          onClick={handleGlobalErrorDemo}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Trigger Global Error
        </button>
      </div>

      {/* Department API Test */}
      <div className="bg-white rounded-lg border">
        <DepartmentTestComponent />
      </div>

      {/* Form Creation Test */}
      <FormCreationTestComponent />

      {/* User Management Demo */}
      <UserManagementDemo />

      {/* Permission Test Component */}
      <PermissionTestComponent />

      {/* Success Confirmation Modal */}
      <SuccessConfirmation
        isVisible={showSuccess}
        title="Form Submitted Successfully!"
        message="Your form has been processed and saved."
        onClose={() => setShowSuccess(false)}
        actions={[
          {
            label: 'View Details',
            onClick: () => {
              infoToast('Details', 'Viewing submission details...')
              setShowSuccess(false)
            },
            variant: 'primary'
          },
          {
            label: 'Submit Another',
            onClick: () => {
              setShowSuccess(false)
              handleFormSubmissionDemo()
            },
            variant: 'secondary'
          }
        ]}
      />
    </div>
  )
}