'use client'

import React, { useState } from 'react'
import {
  Copy,
  Mail,
  MessageCircle,
  Share2,
  QrCode,
  X,
  Check,
  ExternalLink,
  Facebook,
  Twitter,
  Linkedin,
  Send
} from 'lucide-react'
import {
  generateFormShareUrl,
  copyFormUrlToClipboard,
  shareFormNatively,
  generateEmailShareContent,
  generateWhatsAppShareContent,
  generateSocialShareUrls,
  generateFormQRCodeData
} from '@/lib/utils/formSharing'

interface FormSharingModalProps {
  isOpen: boolean
  onClose: () => void
  formCode: string
  formTitle: string
  formId?: string
}

export default function FormSharingModal({
  isOpen,
  onClose,
  formCode,
  formTitle,
  formId
}: FormSharingModalProps) {
  const [copied, setCopied] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

  if (!isOpen) return null

  const shareUrl = generateFormShareUrl(formCode)
  const qrCodeUrl = generateFormQRCodeData(formCode)
  const socialUrls = generateSocialShareUrls(formCode, formTitle)
  const emailContent = generateEmailShareContent(formCode, formTitle, customMessage)
  const whatsappUrl = generateWhatsAppShareContent(formCode, formTitle, customMessage)

  const handleCopyUrl = async () => {
    const success = await copyFormUrlToClipboard(formCode)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    const success = await shareFormNatively(formCode, formTitle)
    if (!success) {
      // Fallback to copy URL
      handleCopyUrl()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">مشاركة قالب الوثيقة</h2>
            <p className="text-sm text-gray-900 mt-1">{formTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Form URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط القالب
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-900"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رسالة مخصصة (اختياري)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="أضف رسالة مخصصة للمشاركة..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Guest Form Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">قالب للضيوف</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>✓ يمكن الوصول إليه بدون تسجيل دخول</p>
              <p>✓ متاح للمشاركة العامة</p>
              <p>✓ يقبل الإجابات من الضيوف</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">مشاركة سريعة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Share2 size={20} className="text-blue-600" />
                <span className="text-xs text-gray-900">مشاركة</span>
              </button>

              <a
                href={emailContent.mailto}
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Mail size={20} className="text-green-600" />
                <span className="text-xs text-gray-900">بريد إلكتروني</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <MessageCircle size={20} className="text-green-500" />
                <span className="text-xs text-gray-900">واتساب</span>
              </a>

              <button
                onClick={() => window.open(shareUrl, '_blank')}
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <ExternalLink size={20} className="text-gray-900" />
                <span className="text-xs text-gray-900">فتح</span>
              </button>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">وسائل التواصل الاجتماعي</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href={socialUrls.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Facebook size={20} className="text-blue-600" />
                <span className="text-xs text-gray-900">فيسبوك</span>
              </a>

              <a
                href={socialUrls.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Twitter size={20} className="text-blue-400" />
                <span className="text-xs text-gray-900">تويتر</span>
              </a>

              <a
                href={socialUrls.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Linkedin size={20} className="text-blue-700" />
                <span className="text-xs text-gray-900">لينكد إن</span>
              </a>

              <a
                href={socialUrls.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Send size={20} className="text-blue-500" />
                <span className="text-xs text-gray-900">تيليجرام</span>
              </a>
            </div>
          </div>

          {/* QR Code */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">رمز QR</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-32 h-32 border border-gray-200 rounded"
              />
              <div className="text-center sm:text-right">
                <p className="text-sm text-gray-900 mb-2">
                  امسح الرمز بالهاتف للوصول للقالب مباشرة
                </p>
                <a
                  href={qrCodeUrl}
                  download={`form-${formCode}-qr.png`}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  <QrCode size={16} />
                  تحميل الرمز
                </a>
              </div>
            </div>
          </div>

          {/* Form Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">معلومات القالب</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>كود القالب:</strong> {formCode}</p>
              {formId && <p><strong>معرف القالب:</strong> {formId}</p>}
              <p><strong>الرابط المختصر:</strong> /forms/{formCode}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            إغلاق
          </button>
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {copied ? 'تم النسخ!' : 'نسخ الرابط'}
          </button>
        </div>
      </div>
    </div>
  )
}