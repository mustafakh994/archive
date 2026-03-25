'use client'

import React, { useEffect, useState } from 'react'
import { useSubmissionStore } from '@/lib/store/useSubmissionStore'
import { FormSubmission } from '@/lib/api/client'
import { 
  X,
  Download,
  Clock,
  User,
  FileText,
  Tag,
  File,
  ExternalLink
} from 'lucide-react'
import { DetailDate, TableDate } from '@/components/ui/DateDisplay'

interface SubmissionViewerProps {
  submissionId?: string
  submission?: FormSubmission
  onClose?: () => void
  showExportOptions?: boolean
}

export default function SubmissionViewer({ 
  submissionId, 
  submission: propSubmission, 
  onClose,
  showExportOptions = true 
}: SubmissionViewerProps) {
  const {
    currentSubmission,
    isLoading,
    error,
    fetchSubmission,
    clearError
  } = useSubmissionStore()

  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Use prop submission or fetch from store
  const submission = propSubmission || currentSubmission

  useEffect(() => {
    if (submissionId && !propSubmission) {
      fetchSubmission(submissionId)
    }
  }, [submissionId, propSubmission, fetchSubmission])

  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  const getFileExtension = (url: string): string => {
    try {
      // Handle both full URLs and relative paths
      if (url.startsWith('http')) {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const extension = pathname.split('.').pop()?.toLowerCase() || ''
        return extension
      } else {
        // Handle relative paths like /uploads/...
        const extension = url.split('.').pop()?.toLowerCase() || ''
        return extension
      }
    } catch {
      return ''
    }
  }

  const getFileType = (url: string): 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'other' => {
    const ext = getFileExtension(url)
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi']
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a']
    const documentExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']
    
    // Check for base64 image data
    if (url.startsWith('data:image/')) return 'image'
    
    // Check for raw base64 data that looks like an image
    if (url.length > 50 && 
        !url.includes(' ') && 
        !url.includes('\n') && 
        /^[A-Za-z0-9+/]+=*$/.test(url) && 
        (url.includes('iVBORw0KGgo') || url.includes('/9j/') || 
         url.includes('SuQmCC') || url.includes('AAAAB3NzaC1yc2E'))) {
      return 'image'
    }
    
    if (imageExts.includes(ext)) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (videoExts.includes(ext)) return 'video'
    if (audioExts.includes(ext)) return 'audio'
    if (documentExts.includes(ext)) return 'document'
    
    return 'other'
  }

  const renderFilePreview = (url: string, fieldLabel: string): React.ReactNode => {
    const fileType = getFileType(url)
    
    // Debug logging
    console.log('File preview debug:', {
      url,
      fieldLabel,
      fileType,
      extension: getFileExtension(url)
    })
    
    switch (fileType) {
      case 'image':
        return (
          <div className="mt-2">
            <div className="relative inline-block">
              <img 
                src={url} 
                alt={fieldLabel}
                className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedImage(url)}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <button
                onClick={() => setExpandedImage(url)}
                className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-md transition-all"
                title="Expand image"
              >
                <ExternalLink className="h-4 w-4 text-gray-700" />
              </button>
            </div>
            <a 
              href={url} 
              download
              className="inline-flex items-center mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              <Download className="h-3 w-3 mr-1" />
              Download image
            </a>
          </div>
        )
      
      case 'pdf':
        return (
          <div className="mt-2 space-y-2">
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <iframe
                src={url}
                className="w-full h-96"
                title={`PDF: ${fieldLabel}`}
                style={{ border: 'none' }}
                onError={(e) => {
                  console.error('PDF iframe error:', e)
                  // Fallback: show error message
                  const iframe = e.currentTarget
                  iframe.style.display = 'none'
                  const errorDiv = document.createElement('div')
                  errorDiv.className = 'p-4 text-center text-gray-500'
                  errorDiv.innerHTML = `
                    <div class="text-sm">
                      <p class="font-medium">PDF Preview Not Available</p>
                      <p class="text-xs mt-1">The PDF cannot be displayed inline. This might be due to CORS restrictions or the file format.</p>
                    </div>
                  `
                  iframe.parentNode?.insertBefore(errorDiv, iframe.nextSibling)
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in new tab
              </a>
              <a 
                href={url} 
                download
                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
              >
                <Download className="h-3 w-3 mr-1" />
                Download PDF
              </a>
            </div>
          </div>
        )
      
      case 'video':
        return (
          <div className="mt-2 space-y-2">
            <video
              controls
              className="w-full max-h-96 rounded-lg border border-gray-200 bg-black"
            >
              <source src={url} />
              Your browser does not support the video tag.
            </video>
            <a 
              href={url} 
              download
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
            >
              <Download className="h-3 w-3 mr-1" />
              Download video
            </a>
          </div>
        )
      
      case 'audio':
        return (
          <div className="mt-2 space-y-2">
            <audio
              controls
              className="w-full"
            >
              <source src={url} />
              Your browser does not support the audio tag.
            </audio>
            <a 
              href={url} 
              download
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
            >
              <Download className="h-3 w-3 mr-1" />
              Download audio
            </a>
          </div>
        )
      
      case 'document':
      case 'other':
      default:
        // Check if this might be a PDF that wasn't detected properly
        const ext = getFileExtension(url)
        const isLikelyPdf = ext === 'pdf' || url.toLowerCase().includes('.pdf')
        
        if (isLikelyPdf) {
          return (
            <div className="mt-2 space-y-2">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  src={url}
                  className="w-full h-96"
                  title={`PDF: ${fieldLabel}`}
                  style={{ border: 'none' }}
                  onError={(e) => {
                    console.error('PDF iframe error:', e)
                    // Fallback: show error message
                    const iframe = e.currentTarget
                    iframe.style.display = 'none'
                    const errorDiv = document.createElement('div')
                    errorDiv.className = 'p-4 text-center text-gray-500'
                    errorDiv.innerHTML = `
                      <div class="text-sm">
                        <p class="font-medium">PDF Preview Not Available</p>
                        <p class="text-xs mt-1">The PDF cannot be displayed inline. This might be due to CORS restrictions or the file format.</p>
                      </div>
                    `
                    iframe.parentNode?.insertBefore(errorDiv, iframe.nextSibling)
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in new tab
                </a>
                <a 
                  href={url} 
                  download
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download PDF
                </a>
              </div>
            </div>
          )
        }
        
        return (
          <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <File className="h-8 w-8 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                {url.split('/').pop()?.substring(0, 50) || 'File'}
              </p>
              <p className="text-xs text-gray-500">
                {getFileExtension(url).toUpperCase()} file
              </p>
            </div>
            <div className="flex gap-2">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-300 rounded-md hover:bg-purple-50"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </a>
              <a 
                href={url} 
                download
                className="inline-flex items-center px-3 py-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-300 rounded-md hover:bg-purple-50"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </a>
            </div>
          </div>
        )
    }
  }

  const renderFieldValue = (key: string, value: any): React.ReactNode => {
    // Debug logging for signature fields
    if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('توقيع')) {
      console.log('Signature field debug:', {
        key,
        value: typeof value === 'string' ? value.substring(0, 100) + '...' : value,
        valueType: typeof value,
        valueLength: typeof value === 'string' ? value.length : 'N/A'
      })
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">No response</span>
    }

    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600' : 'text-red-600'}>{value ? 'Yes' : 'No'}</span>
    }

    if (Array.isArray(value)) {
      // Check if it's an array of file URLs - matching submissions page logic
      const areAllFiles = value.every(item => 
        typeof item === 'string' && (
          item.startsWith('http') || // Cloudflare R2 URLs
          item.startsWith('/uploads/') ||
          item.startsWith('/api/download/') ||
          item.startsWith('data:') ||
          item.includes('.pdf') ||
          item.includes('.jpg') ||
          item.includes('.jpeg') ||
          item.includes('.png') ||
          item.includes('.gif') ||
          item.includes('.webp') ||
          item.includes('.mp4') ||
          item.includes('.mp3') ||
          item.includes('.doc') ||
          item.includes('.docx')
        )
      )
      
      if (areAllFiles && value.length > 0) {
        return (
          <div className="space-y-4">
            {value.map((fileUrl, index) => (
              <div key={index}>
                <p className="text-xs text-gray-500 mb-1">File {index + 1}</p>
                {renderFilePreview(fileUrl, `${key} - File ${index + 1}`)}
              </div>
            ))}
          </div>
        )
      }
      
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              <span>{String(item)}</span>
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      return (
        <div className="bg-gray-50 rounded-md p-3 mt-1">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )
    }

    // Handle URLs (images, files, etc.) - matching submissions page logic
    if (typeof value === 'string') {
      // Special handling for signature fields - FORCE them to render as images
      const isSignatureField = key.toLowerCase().includes('signature') || key.toLowerCase().includes('توقيع')
      
      if (isSignatureField) {
        console.log('Signature field detected:', { key, valueLength: value.length, valueStart: value.substring(0, 50) })
        
        // For signature fields, always try to render as image
        const isValidBase64 = /^[A-Za-z0-9+/]+=*$/.test(value)
        
        if (isValidBase64 && value.length > 10) {
          // Force it to be treated as an image
          const displayUrl = value.startsWith('data:') ? value : `data:image/png;base64,${value}`
          console.log('Forcing signature to render as image:', { key, displayUrl: displayUrl.substring(0, 50) + '...' })
          return renderFilePreview(displayUrl, key)
        }
      }
      
      // Check if it's a Cloudflare R2 URL (starts with http)
      const isR2Url = value.startsWith('http')
      
      // Check if it's a base64 image (signature or other image data)
      const isDataImage = value.startsWith('data:image/')
      const isLongEnough = value.length > 50
      const hasNoSpaces = !value.includes(' ')
      const hasNoNewlines = !value.includes('\n')
      const isValidBase64 = /^[A-Za-z0-9+/]+=*$/.test(value)
      const hasImageSignature = value.includes('iVBORw0KGgo') || value.includes('/9j/') || 
                               value.includes('SuQmCC') || value.includes('AAAAB3NzaC1yc2E')
      
      const isBase64Image = isDataImage || 
                           (isLongEnough && hasNoSpaces && hasNoNewlines && isValidBase64 && hasImageSignature)
      
      // Check if it's other file patterns
      const isFileUrl = value.startsWith('/uploads/') ||
                       value.startsWith('/api/download/') ||
                       value.includes('.pdf') ||
                       value.includes('.jpg') ||
                       value.includes('.jpeg') ||
                       value.includes('.png') ||
                       value.includes('.gif') ||
                       value.includes('.webp') ||
                       value.includes('.mp4') ||
                       value.includes('.mp3') ||
                       value.includes('.doc') ||
                       value.includes('.docx')
      
      if (isR2Url || isFileUrl || isBase64Image) {
        // If it's base64 without proper prefix, add the prefix for image display
        const displayUrl = isBase64Image && !value.startsWith('data:') 
          ? `data:image/png;base64,${value}` 
          : value
        
        console.log('Rendering as image:', { key, displayUrl: displayUrl.substring(0, 50) + '...' })
        return renderFilePreview(displayUrl, key)
      }
    }

    return <span className="whitespace-pre-wrap">{String(value)}</span>
  }

  const exportSubmission = () => {
    if (!submission) return

    const data = {
      id: submission.id,
      formId: submission.formId,
      submitterEmail: submission.submitterEmail,
      submittedAt: submission.submittedAt,
      formVersion: submission.formVersion,
      responseData: submission.responseData,
      form: submission.form
    }

    let content: string
    let filename: string
    let mimeType: string

    if (exportFormat === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `submission-${submission.id}.json`
      mimeType = 'application/json'
    } else {
      // CSV format
      const headers = ['Field', 'Response']
      const rows = Object.entries(submission.responseData || {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join('; ') : String(value)
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      content = csvContent
      filename = `submission-${submission.id}.csv`
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Error</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading submission...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Submission Not Found</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
          <p className="text-gray-600">The requested submission could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white mb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Form Submission</h3>
            <p className="text-sm text-gray-500 mt-1">
              {submission.form?.title || `Form ${submission.formId}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showExportOptions && (
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                  className="border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
                <button
                  onClick={exportSubmission}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Submission Metadata */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Submitted by</p>
                <p className="text-sm font-medium text-gray-900">{submission.submitterEmail}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Submitted on</p>
                <p className="text-sm font-medium text-gray-900">
                  <DetailDate date={submission.submittedAt} />
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Tag className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Form version</p>
                <p className="text-sm font-medium text-gray-900">v{submission.formVersion}</p>
              </div>
            </div>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Submission ID</p>
                <p className="text-sm font-medium text-gray-900 font-mono">{submission.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Response Data */}
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-gray-900">Responses</h4>
          
          {submission.responseData && typeof submission.responseData === 'object' ? (
            <div className="space-y-4">
              {Object.entries(submission.responseData).map(([key, value]) => {
                // Debug logging for the entire submission data
                console.log('Processing field:', { key, value, submissionData: submission })
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h5>
                        <div className="text-sm text-gray-700">
                          {renderFieldValue(key, value)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No response data available</p>
            </div>
          )}
        </div>

        {/* Raw Data (for debugging) */}
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            View Raw Data
          </summary>
          <div className="mt-3 bg-gray-50 rounded-md p-4">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(submission, null, 2)}
            </pre>
          </div>
        </details>
      </div>
      
      {/* Image Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={expandedImage}
            alt="Expanded view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={expandedImage}
            download
            className="absolute bottom-4 right-4 inline-flex items-center px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </div>
      )}
    </div>
  )
}