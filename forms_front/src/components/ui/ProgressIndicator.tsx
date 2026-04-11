'use client'

import React from 'react'
import { CheckCircle, Circle, Clock } from 'lucide-react'

interface ProgressBarProps {
  progress: number // 0-100
  className?: string
  showPercentage?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red'
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({ 
  progress, 
  className = '', 
  showPercentage = true, 
  color = 'blue',
  size = 'md'
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  color?: 'blue' | 'green' | 'yellow' | 'red'
  showPercentage?: boolean
}

export function CircularProgress({ 
  progress, 
  size = 64, 
  strokeWidth = 4, 
  className = '',
  color = 'blue',
  showPercentage = true
}: CircularProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

  const colorClasses = {
    blue: 'stroke-blue-600',
    green: 'stroke-green-600',
    yellow: 'stroke-yellow-600',
    red: 'stroke-red-600'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClasses[color]} transition-all duration-300 ease-out`}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-900">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Step progress indicator
interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'current' | 'completed'
}

interface StepProgressProps {
  steps: Step[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function StepProgress({ steps, className = '', orientation = 'horizontal' }: StepProgressProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${step.status === 'completed' 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : step.status === 'current'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-500'
                }
              `}>
                {step.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : step.status === 'current' ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-0.5 h-8 mt-2 
                  ${step.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`
                text-sm font-medium 
                ${step.status === 'current' ? 'text-blue-600' : 'text-gray-900'}
              `}>
                {step.title}
              </h3>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 
              ${step.status === 'completed' 
                ? 'bg-green-600 border-green-600 text-white' 
                : step.status === 'current'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-500'
              }
            `}>
              {step.status === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : step.status === 'current' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <span className="text-xs font-medium">{index + 1}</span>
              )}
            </div>
            <div className="mt-2 text-center">
              <h3 className={`
                text-xs font-medium 
                ${step.status === 'current' ? 'text-blue-600' : 'text-gray-900'}
              `}>
                {step.title}
              </h3>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`
              flex-1 h-0.5 mx-4 
              ${step.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// Upload progress component
interface UploadProgressProps {
  files: Array<{
    name: string
    progress: number
    status: 'uploading' | 'completed' | 'error'
    error?: string
  }>
  className?: string
}

export function UploadProgress({ files, className = '' }: UploadProgressProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {files.map((file, index) => (
        <div key={index} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </span>
            <span className={`
              text-xs px-2 py-1 rounded-full
              ${file.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : file.status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
              }
            `}>
              {file.status === 'completed' ? 'Completed' : 
               file.status === 'error' ? 'Error' : 'Uploading'}
            </span>
          </div>
          
          <ProgressBar
            progress={file.progress}
            color={file.status === 'error' ? 'red' : file.status === 'completed' ? 'green' : 'blue'}
            size="sm"
            showPercentage={false}
          />
          
          {file.error && (
            <p className="text-xs text-red-600 mt-1">{file.error}</p>
          )}
        </div>
      ))}
    </div>
  )
}