'use client'

import React, { useState, useEffect } from 'react'
import { useFormStore, FormTheme } from '@/lib/store/useFormStore'
import ImageUpload from './ImageUpload'
import { Palette, X } from 'lucide-react'
import { ARABIC_GOOGLE_FONTS, loadGoogleFont } from '@/lib/utils/arabicGoogleFonts'

interface CustomizeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CustomizeModal({ isOpen, onClose }: CustomizeModalProps) {
  const { form, setFormTheme } = useFormStore()
  const [searchTerm, setSearchTerm] = useState('')

  const handleThemeChange = <K extends keyof FormTheme>(property: K, value: FormTheme[K]) => {
    setFormTheme({ [property]: value } as Partial<FormTheme>)

    // Load the font dynamically when changed
    if (property === 'fontFamily' && typeof value === 'string') {
      loadGoogleFont(value)
    }
  }

  // Load current font on mount
  useEffect(() => {
    const currentFont = form.theme?.fontFamily || 'Cairo'
    loadGoogleFont(currentFont)
  }, [form.theme?.fontFamily])

  // Filter fonts based on search
  const filteredFonts = ARABIC_GOOGLE_FONTS.filter(font =>
    font.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    font.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  const cardStyleSetting = form.theme?.cardStyle ?? 'solid'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette size={20} />
            تخصيص المظهر
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لون الخلفية
            </label>
            <input
              type="color"
              value={form.theme?.backgroundColor || '#ffffff'}
              onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
              className="w-full h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
              aria-label="Background color"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صورة الخلفية
            </label>
            <ImageUpload
              value={form.theme?.backgroundImageUrl || ''}
              onChange={(imageUrl) => handleThemeChange('backgroundImageUrl', imageUrl)}
              onRemove={() => handleThemeChange('backgroundImageUrl', '')}
              placeholder="تحميل صورة أو إدخال رابط"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اللون الأساسي
            </label>
            <input
              type="color"
              value={form.theme?.primaryColor || '#3b82f6'}
              onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
              className="w-full h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
              aria-label="Primary color"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              شعار النموذج
            </label>
            <ImageUpload
              value={form.theme?.logoUrl || ''}
              onChange={(logoUrl) => handleThemeChange('logoUrl', logoUrl)}
              onRemove={() => handleThemeChange('logoUrl', '')}
              placeholder="تحميل شعار أو إدخال رابط"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نمط البطاقة
            </label>
            <select
              value={cardStyleSetting}
              onChange={(e) => handleThemeChange('cardStyle', e.target.value as FormTheme['cardStyle'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="solid">لون مخصص</option>
              <option value="transparent">شفاف</option>
            </select>
          </div>

          {cardStyleSetting === 'solid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                لون خلفية البطاقة
              </label>
              <input
                type="color"
                value={form.theme?.cardBackgroundColor || '#ffffff'}
                onChange={(e) => handleThemeChange('cardBackgroundColor', e.target.value)}
                className="w-full h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                aria-label="Card background color"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              لون إطار البطاقة
            </label>
            <input
              type="color"
              value={form.theme?.cardBorderColor || '#e5e7eb'}
              onChange={(e) => handleThemeChange('cardBorderColor', e.target.value)}
              className="w-full h-10 p-1.border border-gray-300 rounded-md cursor-pointer"
              aria-label="Card border color"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              checked={form.theme?.cardBackdropBlur ?? true}
              onChange={(e) => handleThemeChange('cardBackdropBlur', e.target.checked)}
            />
            تفعيل تأثير الضبابية للخلفية
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نوع الخط (خطوط جوجل العربية)
            </label>

            {/* Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="ابحث عن خط..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white z-10 relative"
              />
            </div>

            {/* Font Selection Dropdown */}
            <div className="relative">
              <div className="border border-gray-300 rounded-md bg-white shadow-sm max-h-64 overflow-y-auto relative z-20">
                <div className="p-2 space-y-1">
                  {filteredFonts.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => handleThemeChange('fontFamily', font.name)}
                      className={`w-full text-right px-3 py-2 rounded-md transition-colors hover:bg-blue-50 hover:text-blue-700 ${form.theme?.fontFamily === font.name
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      style={{
                        fontFamily: font.name,
                        fontSize: '14px'
                      }}
                    >
                      {font.displayName}
                    </button>
                  ))}

                  {filteredFonts.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 text-center">
                      لا توجد خطوط مطابقة للبحث
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md border">
              <p className="text-xs text-gray-600 mb-2">معاينة:</p>
              <p
                className="text-base font-medium"
                style={{
                  fontFamily: form.theme?.fontFamily || 'Cairo',
                  fontSize: '16px',
                  color: '#374151'
                }}
              >
                مرحباً بك في منشئ قوالب الوثائق
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              حفظ التخصيص
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 