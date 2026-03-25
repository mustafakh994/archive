'use client'

import React from 'react'
import { FormField } from '@/lib/store/useFormStore'

interface FieldRendererProps {
    field: FormField
}

export default function FieldRenderer({ field }: FieldRendererProps) {
    let content: React.ReactNode

    switch (field.type) {
        case 'short_text':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <input
                        type="text"
                        placeholder={field.properties.placeholder || 'أدخل إجابتك'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pointer-events-none"
                        disabled
                    />
                    {field.properties.validation && (
                        <p className="text-xs text-gray-500">
                            التحقق: {field.properties.validation.rule}
                            {field.properties.validation.errorMessage && ` - ${field.properties.validation.errorMessage}`}
                        </p>
                    )}
                </div>
            )
            break

        case 'long_text':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <textarea
                        placeholder={field.properties.placeholder || 'أدخل إجابتك'}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pointer-events-none"
                        disabled
                    />
                    {field.properties.validation && (
                        <p className="text-xs text-gray-500">
                            التحقق: {field.properties.validation.rule}
                            {field.properties.validation.errorMessage && ` - ${field.properties.validation.errorMessage}`}
                        </p>
                    )}
                </div>
            )
            break

        case 'email':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <input
                        type="email"
                        placeholder={field.properties.placeholder || 'أدخل بريدك الإلكتروني'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pointer-events-none"
                        disabled
                    />
                    {field.properties.validation && (
                        <p className="text-xs text-gray-500">
                            التحقق: {field.properties.validation.rule}
                            {field.properties.validation.errorMessage && ` - ${field.properties.validation.errorMessage}`}
                        </p>
                    )}
                </div>
            )
            break

        case 'number':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <input
                        type="number"
                        placeholder={field.properties.placeholder || 'أدخل رقماً'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pointer-events-none"
                        disabled
                    />
                    {field.properties.validation && (
                        <p className="text-xs text-gray-500">
                            التحقق: {field.properties.validation.rule}
                            {field.properties.validation.minValue && ` الحد الأدنى: ${field.properties.validation.minValue}`}
                            {field.properties.validation.maxValue && ` الحد الأقصى: ${field.properties.validation.maxValue}`}
                        </p>
                    )}
                </div>
            )
            break

        case 'date':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <input
                        type="date"
                        aria-label={field.properties.label}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pointer-events-none"
                        disabled
                    />
                </div>
            )
            break

        case 'file_upload':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center pointer-events-none">
                        <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">انقر للرفع أو اسحب وأفلت</p>
                        <p className="text-xs text-gray-500">PDF، DOC، صور حتى 10 ميجابايت</p>
                    </div>
                </div>
            )
            break

        case 'radio_group':
            content = (
                <div className="space-y-3">
                    <label className="block.text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="space-y-2">
                        {field.properties.options?.map((option) => (
                            <div key={option.id} className="flex items-start gap-3 rtl-flex-row-reverse">
                                <input
                                    type="radio"
                                    name={`radio-${field.id}`}
                                    id={`radio-${field.id}-${option.id}`}
                                    aria-label={option.label}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500.pointer-events-none"
                                    disabled
                                />
                                <div className="flex.items-center gap-2 rtl-flex-row-reverse">
                                    <span className="text-sm text-gray-700">{option.label}</span>
                                    {option.imageUrl && (
                                        <img
                                            src={option.imageUrl}
                                            alt={option.label}
                                            className="w-8 h-8 object-cover rounded"
                                        />
                                    )}
                                    {option.onSelectGoToPageId && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            → الانتقال للصفحة
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
            break

        case 'checkbox':
            content = (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                    </label>
                    <div className="space-y-2">
                        {field.properties.options?.map((option) => (
                            <div key={option.id} className="flex items-start gap-3 rtl-flex-row-reverse">
                                <input
                                    type="checkbox"
                                    id={`checkbox-${field.id}-${option.id}`}
                                    aria-label={option.label}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500.pointer-events-none"
                                    disabled
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
            break

        case 'dropdown':
            content = (
                <div className="space-y-2">
                    <label className="block.text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <select
                        aria-label={field.properties.label}
                        className="w-full px-3 py-2.border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent.pointer-events-none"
                        disabled
                    >
                        <option value="">اختر خياراً</option>
                        {field.properties.options?.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            )
            break

        case 'linear_scale': {
            const minValue = field.properties.minValue ?? 1
            const maxValue = field.properties.maxValue ?? 5
            const scaleOptions = Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i)

            content = (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 px-2">
                            {scaleOptions.map((value) => (
                                <span key={value}>{value}</span>
                            ))}
                        </div>
                        <div className="flex items-center justify-between">
                            {scaleOptions.map((value) => (
                                <input
                                    key={value}
                                    type="radio"
                                    name={`scale-${field.id}`}
                                    value={value}
                                    className="h-4 w-4 text-blue-600.border border-gray-300 focus:ring-blue-500.pointer-events-none"
                                    disabled
                                    aria-label={`تقييم ${value}`}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{field.properties.minLabel || 'غير راضٍ على الإطلاق'}</span>
                            <span>{field.properties.maxLabel || 'راضٍ تمامًا'}</span>
                        </div>
                    </div>
                </div>
            )
            break
        }

        case 'display_text':
            content = (
                <div className="space-y-2">
                    <div
                        className="prose prose-sm max-w-none text-black"
                        style={{ color: '#000000' }}
                        dangerouslySetInnerHTML={{
                            __html: field.properties.label || '<p>محتوى كتلة النص</p>'
                        }}
                    />
                </div>
            )
            break

        case 'display_image':
            content = (
                <div className="space-y-2">
                    {field.properties.label && (
                        <label className="block text-sm font-medium text-gray-700">{field.properties.label}</label>
                    )}
                    <div className="text-center">
                        <img
                            src={field.properties.src || 'https://via.placeholder.com/400x200?text=صورة'}
                            alt={field.properties.placeholder || 'صورة عرض'}
                            className="max-w-full h-auto rounded-lg"
                            style={{ maxHeight: '300px' }}
                        />
                    </div>
                </div>
            )
            break

        case 'display_video':
            content = (
                <div className="space-y-2">
                    <div className="text-center">
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="text-gray-500">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="mt-2 text-sm">تضمين فيديو</p>
                            </div>
                        </div>
                        {field.properties.placeholder && (
                            <p className="text-sm text-gray-600 mt-2">{field.properties.placeholder}</p>
                        )}
                    </div>
                </div>
            )
            break

        case 'location':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 pointer-events-none"
                        disabled
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin h-4 w-4"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                        <span>الحصول على الموقع الحالي</span>
                    </button>
                </div>
            )
            break

        case 'signature':
            content = (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {field.properties.label}
                        {field.properties.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen-tool mx-auto h-12 w-12 text-gray-400">
                            <path d="m12 19 7-7 3 3-7 7-3-3z" />
                            <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            <path d="m2 2 7.586 7.586" />
                            <circle cx="11" cy="11" r="2" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">{field.properties.placeholder || 'حقل التوقيع'}</p>
                        <p className="text-xs text-gray-500 mt-1">سيتمكن المستخدمون من الرسم هنا</p>
                    </div>
                </div>
            )
            break

        default:
            content = (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-gray-500">نوع حقل غير معروف: {field.type}</p>
                </div>
            )
    }

    const questionBackgroundStyle: React.CSSProperties = {}
    if (field.properties.questionBackgroundColor) {
        questionBackgroundStyle.backgroundColor = field.properties.questionBackgroundColor
    }
    if (field.properties.questionBackgroundImageUrl) {
        questionBackgroundStyle.backgroundImage = `url(${field.properties.questionBackgroundImageUrl})`
        questionBackgroundStyle.backgroundSize = 'cover'
        questionBackgroundStyle.backgroundPosition = 'center'
        questionBackgroundStyle.backgroundRepeat = 'no-repeat'
    }

    const hasQuestionBackground = Object.keys(questionBackgroundStyle).length > 0

    return hasQuestionBackground ? (
        <div className="rounded-xl p-4" style={questionBackgroundStyle}>
            {content}
        </div>
    ) : (
        <>{content}</>
    )
} 