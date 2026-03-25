'use client'

import React, { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { RotateCcw, Check } from 'lucide-react'

interface SignaturePadProps {
  value?: string // URL or base64 of existing signature
  onChange: (signatureData: string) => void
  onUploadComplete?: (url: string) => void
  required?: boolean
  label?: string
  penColor?: string
  backgroundColor?: string
  width?: number
  height?: number
  placeholder?: string
  disabled?: boolean
}

export default function SignaturePad({
  value,
  onChange,
  onUploadComplete,
  required = false,
  label = 'التوقيع',
  penColor = '#000000',
  backgroundColor = '#ffffff',
  width = 500,
  height = 200,
  placeholder = 'ارسم توقيعك هنا',
  disabled = false
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(value)

  useEffect(() => {
    if (value) {
      setUploadedUrl(value)
      setIsEmpty(false)
    }
  }, [value])

  const handleClear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
    setUploadedUrl(undefined)
    onChange('')
  }

  const handleEnd = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setIsEmpty(true)
      return
    }

    setIsEmpty(false)
    
    // Get base64 PNG
    const base64 = sigCanvas.current?.toDataURL('image/png')
    
    if (!base64) return

    // Immediately store base64 (backup)
    onChange(base64)
    
    // Try to upload to R2 in background
    try {
      setIsUploading(true)
      const r2Url = await uploadSignatureToR2(base64)
      
      if (r2Url) {
        setUploadedUrl(r2Url)
        onChange(r2Url)
        onUploadComplete?.(r2Url)
      }
    } catch (error) {
      console.error('Signature upload failed, using base64:', error)
      // Keep the base64 as fallback
    } finally {
      setIsUploading(false)
    }
  }

  const uploadSignatureToR2 = async (base64: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const response = await fetch(base64)
      const blob = await response.blob()
      
      // Create form data
      const formData = new FormData()
      formData.append('file', blob, `signature-${Date.now()}.png`)
      
      // Upload to your existing /api/upload endpoint
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }
      
      const result = await uploadResponse.json()
      return result.url // R2 URL
    } catch (error) {
      console.error('Signature upload to R2 failed:', error)
      return null
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      
      {uploadedUrl && !disabled ? (
        // Show uploaded signature with option to redraw
        <div className="space-y-2">
          <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
            <img 
              src={uploadedUrl} 
              alt="توقيع" 
              className="max-w-full h-auto mx-auto"
              style={{ maxHeight: `${height}px` }}
            />
            <div className="flex items-center justify-center mt-2 text-sm text-green-700">
              <Check size={16} className="ml-1" />
              تم حفظ التوقيع
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
          >
            <RotateCcw size={14} />
            إعادة رسم التوقيع
          </button>
        </div>
      ) : (
        <>
          <div 
            className="border-2 border-gray-300 rounded-lg overflow-hidden relative"
            style={{ 
              width: '100%', 
              maxWidth: `${width}px`,
              opacity: disabled ? 0.6 : 1,
              pointerEvents: disabled ? 'none' : 'auto'
            }}
          >
            {isEmpty && !disabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="text-gray-400 text-sm">{placeholder}</span>
              </div>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="text-xs text-gray-600 mt-1">جاري الحفظ...</span>
                </div>
              </div>
            )}
            
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full',
                style: { 
                  backgroundColor,
                  height: `${height}px`,
                  width: '100%',
                  touchAction: 'none'
                }
              }}
              penColor={penColor}
              onEnd={handleEnd}
              dotSize={1}
              minWidth={0.5}
              maxWidth={2.5}
              velocityFilterWeight={0.7}
            />
          </div>
          
          {!isEmpty && !isUploading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <RotateCcw size={14} />
              مسح التوقيع
            </button>
          )}
        </>
      )}
      
      {isEmpty && required && (
        <p className="text-xs text-red-500">التوقيع مطلوب</p>
      )}
    </div>
  )
}

