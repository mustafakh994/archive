'use client'

import React, { useRef, useState } from 'react'
import SignaturePad from 'react-signature-canvas'

interface SignatureFieldProps {
  label?: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  backgroundColor?: string
  penColor?: string
}

export default function SignatureField({
  label = 'Signature',
  required = false,
  value,
  onChange,
  className = '',
  disabled = false,
  backgroundColor = '#ffffff',
  penColor = '#000000'
}: SignatureFieldProps) {
  const sigPadRef = useRef<SignaturePad>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleBegin = () => {
    setIsEmpty(false)
  }

  const handleEnd = () => {
    if (sigPadRef.current) {
      const dataURL = sigPadRef.current.toDataURL('image/png')
      onChange?.(dataURL)
    }
  }

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear()
      setIsEmpty(true)
      onChange?.('')
    }
  }

  const handleSave = () => {
    if (sigPadRef.current && !isEmpty) {
      const dataURL = sigPadRef.current.toDataURL('image/png')
      onChange?.(dataURL)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <SignaturePad
          ref={sigPadRef}
          canvasProps={{
            className: 'w-full h-32 bg-white',
            style: { backgroundColor }
          }}
          penColor={penColor}
          onBegin={handleBegin}
          onEnd={handleEnd}
          backgroundColor={backgroundColor}
        />
        
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || isEmpty}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isEmpty}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Signature
            </button>
          </div>
          
          {value && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-green-600">✓ Signed</span>
              <img 
                src={value} 
                alt="Current signature" 
                className="w-8 h-6 border border-gray-200 rounded object-contain"
              />
            </div>
          )}
        </div>
      </div>
      
      {required && !value && (
        <p className="text-xs text-red-500">This field is required</p>
      )}
    </div>
  )
}
