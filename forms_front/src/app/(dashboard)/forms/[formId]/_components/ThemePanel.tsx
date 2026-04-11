'use client'

import React from 'react'
import { useFormStore, FormTheme } from '@/lib/store/useFormStore'
import ImageUpload from './ImageUpload'
import { Palette } from 'lucide-react'

export default function ThemePanel() {
    const { form, setFormTheme } = useFormStore()

    const handleThemeChange = <K extends keyof FormTheme>(property: K, value: FormTheme[K]) => {
        setFormTheme({ [property]: value } as Partial<FormTheme>)
    }

    const cardStyleSetting = form.theme?.cardStyle ?? 'solid'

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Palette size={20} />
                    <span>تخصيص المظهر</span>
                </h3>
                <div className="space-y-4">
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
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
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
                            className="w-full h-10 p-1 border border-gray-300 rounded-md cursor-pointer"
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
                </div>
            </div>
        </div>
    )
} 