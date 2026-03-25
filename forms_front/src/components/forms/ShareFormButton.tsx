'use client'

import React, { useState } from 'react'
import { Share2, Copy, ExternalLink, QrCode, Check } from 'lucide-react'
import { Form } from '@/lib/api/client'

interface ShareFormButtonProps {
  form: Form
  className?: string
}

export default function ShareFormButton({ form, className = '' }: ShareFormButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  // Use guest URLs to match the form wizard sharing
  const shareUrlById = `${baseUrl}/guest/id/${form.id}`
  const shareUrlByCode = form.code ? `${baseUrl}/guest/${form.code}` : null

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(type)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const generateQRCode = (url: string) => {
    // You can integrate with a QR code service like qr-server.com
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    window.open(qrUrl, '_blank', 'noopener,noreferrer')
  }

  // Check if form allows anonymous submissions (for display purposes only)
  const isPublicForm = (form as any).settings?.allowAnonymousSubmissions || false

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className={`inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <Share2 size={16} />
        مشاركة
      </button>

      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowShareMenu(false)}
          />

          {/* Share Menu */}
          <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">مشاركة قالب الوثيقة</h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Form Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 text-sm">{form.title}</h4>
                  {form.description && (
                    <p className="text-gray-900 text-xs mt-1 line-clamp-2">{form.description}</p>
                  )}
                </div>

                {/* Share by Code (Preferred) */}
                {shareUrlByCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رابط ضيف سهل التذكر (مُوصى به)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1">
                        <input
                          type="text"
                          value={shareUrlByCode}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(shareUrlByCode, 'code')}
                          className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 hover:bg-gray-200 flex items-center"
                          title="نسخ الرابط"
                        >
                          {copiedUrl === 'code' ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => openInNewTab(shareUrlByCode)}
                          className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md hover:bg-gray-200"
                          title="فتح في تبويب جديد"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => generateQRCode(shareUrlByCode)}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                        title="إنشاء رمز QR"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-900 mt-1">
                      يحتوي على كود القالب: <code className="bg-gray-100 px-1 rounded">{form.code}</code>
                    </p>
                  </div>
                )}

                {/* Share by ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط ضيف مباشر (بالمعرف)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1">
                      <input
                        type="text"
                        value={shareUrlById}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(shareUrlById, 'id')}
                        className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 hover:bg-gray-200 flex items-center"
                        title="نسخ الرابط"
                      >
                        {copiedUrl === 'id' ? (
                          <Check size={14} className="text-green-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => openInNewTab(shareUrlById)}
                        className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md hover:bg-gray-200"
                        title="فتح في تبويب جديد"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => generateQRCode(shareUrlById)}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                      title="إنشاء رمز QR"
                    >
                      <QrCode size={14} />
                    </button>
                  </div>
                </div>

                {/* Usage Instructions */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 text-sm mb-2">قالب للضيوف:</h4>
                  <ul className="text-blue-800 text-xs space-y-1">
                    <li>✓ شارك الرابط مع الأشخاص المطلوب منهم تعبئة القالب</li>
                    <li>✓ يمكن للزوار تعبئة القالب بدون تسجيل دخول</li>
                    <li>✓ متاح للمشاركة العامة</li>
                    <li>✓ ستصلك الإجابات في لوحة التحكم</li>
                    {form.settings?.allowMultipleSubmissions && (
                      <li>✓ يُسمح بتعبئة القالب أكثر من مرة</li>
                    )}
                  </ul>
                </div>



              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}