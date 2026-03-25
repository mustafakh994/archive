'use client'

import React, { useState } from 'react'
import { useFormStore, FormOption } from '@/lib/store/useFormStore'
import { Plus, X, Settings, Eye, Wand2 } from 'lucide-react'
import ImageUpload from './ImageUpload'
import RegexBuilderWizard from './RegexBuilderWizard'

export default function PropertiesPanel() {
    const {
        selectedFieldId,
        form,
        updateFieldProperties,
        setFormTheme
    } = useFormStore()
    const [showRegexBuilder, setShowRegexBuilder] = useState(false)

    // Find the selected field
    const selectedField = form.fields.find(field => field.id === selectedFieldId)

    if (!selectedFieldId) {
        return (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">خصائص الحقل</h2>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">خصائص الحقل</h3>
                        <p className="text-sm text-gray-500">اختر حقل لتعديل خصائصه</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!selectedField) {
        return (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">خصائص الحقل</h2>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">لم يتم اختيار حقل</h3>
                        <p className="text-sm text-gray-500">اختر حقل لتعديل خصائصه</p>
                    </div>
                </div>
            </div>
        )
    }

    const addOption = () => {
        const newOption: FormOption = {
            id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            label: `خيار ${(selectedField.properties.options?.length || 0) + 1}`
        }

        updateFieldProperties(selectedField.id, {
            options: [...(selectedField.properties.options || []), newOption]
        })
    }

    const removeOption = (optionId: string) => {
        updateFieldProperties(selectedField.id, {
            options: selectedField.properties.options?.filter(opt => opt.id !== optionId)
        })
    }

    const updateOption = (optionId: string, updates: Partial<FormOption>) => {
        updateFieldProperties(selectedField.id, {
            options: selectedField.properties.options?.map(opt =>
                opt.id === optionId ? { ...opt, ...updates } : opt
            )
        })
    }

    const addValidation = () => {
        updateFieldProperties(selectedField.id, {
            validation: {
                rule: 'regex',
                pattern: '',
                errorMessage: ''
            }
        })
    }

    const removeValidation = () => {
        updateFieldProperties(selectedField.id, {
            validation: undefined
        })
    }

    const updateValidation = (updates: any) => {
        updateFieldProperties(selectedField.id, {
            validation: { ...selectedField.properties.validation, ...updates }
        })
    }

    const handleRegexBuilderSave = (pattern: string, errorMessage: string) => {
        updateFieldProperties(selectedField.id, {
            validation: {
                rule: 'regex',
                pattern: pattern,
                errorMessage: errorMessage
            }
        })
    }

    return (
        <>
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">خصائص الحقل</h2>
                    <p className="text-xs text-gray-500 mt-1">{selectedField.type.replace('_', ' ')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Label/Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {selectedField.type.startsWith('display_') ? 'المحتوى' : 'التسمية'}
                        </label>
                        {selectedField.type === 'display_text' ? (
                            <textarea
                                value={selectedField.properties.label}
                                onChange={(e) => updateFieldProperties(selectedField.id, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                rows={4}
                                placeholder="أدخل محتوى HTML..."
                            />
                        ) : selectedField.type === 'display_image' ? (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    عنوان الصورة
                                </label>
                                <input
                                    type="text"
                                    value={selectedField.properties.label}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="عنوان الصورة (اختياري)"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    تحميل الصورة
                                </label>
                                <ImageUpload
                                    value={selectedField.properties.src || ''}
                                    onChange={(imageUrl) => updateFieldProperties(selectedField.id, { src: imageUrl })}
                                    onRemove={() => updateFieldProperties(selectedField.id, { src: '' })}
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    نص بديل
                                </label>
                                <input
                                    type="text"
                                    value={selectedField.properties.placeholder || ''}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { placeholder: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="نص بديل/وصف"
                                />
                            </div>
                        ) : selectedField.type === 'display_video' ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={selectedField.properties.label}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="رابط الفيديو (يوتيوب، فيمو، إلخ)"
                                />
                                <input
                                    type="text"
                                    value={selectedField.properties.placeholder || ''}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { placeholder: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="وصف الفيديو"
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={selectedField.properties.label}
                                onChange={(e) => updateFieldProperties(selectedField.id, { label: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="أدخل التسمية"
                                aria-label="تسمية الحقل"
                            />
                        )}
                    </div>

                    {/* Placeholder (for input fields) */}
                    {(selectedField.type === 'short_text' || selectedField.type === 'long_text' || selectedField.type === 'number' || selectedField.type === 'email') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                النص المؤقت
                            </label>
                            <input
                                type="text"
                                value={selectedField.properties.placeholder || ''}
                                onChange={(e) => updateFieldProperties(selectedField.id, { placeholder: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                placeholder="أدخل النص المؤقت"
                                aria-label="النص المؤقت للحقل"
                            />
                        </div>
                    )}

                    {/* Required toggle (not for display elements) */}
                    {!selectedField.type.startsWith('display_') && (
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                                مطلوب
                            </label>
                            <input
                                type="checkbox"
                                checked={selectedField.properties.required || false}
                                onChange={(e) => updateFieldProperties(selectedField.id, { required: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                aria-label="Required"
                            />
                        </div>
                    )}

                    {/* isSearchable toggle */}
                    {!selectedField.type.startsWith('display_') && (
                        <div className="flex items-center justify-between mt-4">
                            <label className="text-sm font-medium text-gray-700">
                                قابل للبحث (Is Searchable)
                            </label>
                            <input
                                type="checkbox"
                                checked={selectedField.properties.isSearchable || false}
                                onChange={(e) => updateFieldProperties(selectedField.id, { isSearchable: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                aria-label="Is Searchable"
                            />
                        </div>
                    )}

                    {/* Question background customization */}
                    <div className="border-t border-gray-200 pt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                لون خلفية السؤال
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={selectedField.properties.questionBackgroundColor || '#ffffff'}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { questionBackgroundColor: e.target.value })}
                                    className="w-12 h-10 p-1 border border-gray-300 rounded"
                                    aria-label="Question background color"
                                />
                                <button
                                    onClick={() => updateFieldProperties(selectedField.id, { questionBackgroundColor: undefined })}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                    type="button"
                                >
                                    إعادة التعيين
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                صورة خلفية السؤال
                            </label>
                            <ImageUpload
                                value={selectedField.properties.questionBackgroundImageUrl || ''}
                                onChange={(imageUrl) => updateFieldProperties(selectedField.id, { questionBackgroundImageUrl: imageUrl })}
                                onRemove={() => updateFieldProperties(selectedField.id, { questionBackgroundImageUrl: undefined })}
                                placeholder="تحميل صورة أو إدخال رابط"
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <span className="text-sm font-medium text-gray-700">
                                خلفية الحاوية
                            </span>
                            <div className="flex items-center gap-4 rtl:flex-row-reverse">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        value="solid"
                                        checked={(selectedField.properties.containerStyle ?? 'solid') === 'solid'}
                                        onChange={() => updateFieldProperties(selectedField.id, { containerStyle: 'solid' })}
                                    />
                                    لون محدد
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        value="transparent"
                                        checked={selectedField.properties.containerStyle === 'transparent'}
                                        onChange={() => updateFieldProperties(selectedField.id, { containerStyle: 'transparent' })}
                                    />
                                    شفافة
                                </label>
                            </div>

                            {(selectedField.properties.containerStyle ?? 'solid') !== 'transparent' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={selectedField.properties.containerBackgroundColor || '#ffffff'}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { containerBackgroundColor: e.target.value })}
                                        className="w-12 h-10 p-1 border border-gray-300 rounded"
                                        aria-label="Container background color"
                                    />
                                    <button
                                        onClick={() => updateFieldProperties(selectedField.id, { containerBackgroundColor: '#ffffff' })}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                        type="button"
                                    >
                                        إعادة اللون الافتراضي
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validation (for input fields) */}
                    {(selectedField.type === 'short_text' || selectedField.type === 'long_text' || selectedField.type === 'number' || selectedField.type === 'email') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                    التحقق من الصحة
                                </label>
                                {!selectedField.properties.validation ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowRegexBuilder(true)}
                                            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 rtl-flex-row-reverse"
                                        >
                                            <Wand2 size={16} />
                                            منشئ القواعد
                                        </button>
                                        <button
                                            onClick={addValidation}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 rtl-flex-row-reverse"
                                        >
                                            <Plus size={16} />
                                            إضافة تحقق
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={removeValidation}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        إزالة
                                    </button>
                                )}
                            </div>

                            {selectedField.properties.validation && (
                                <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            قاعدة التحقق
                                        </label>
                                        <select
                                            value={selectedField.properties.validation.rule}
                                            onChange={(e) => updateValidation({ rule: e.target.value as any })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                            aria-label="قاعدة التحقق"
                                        >
                                            <option value="regex">تعبير منتظم مخصص</option>
                                            <option value="email">بريد إلكتروني</option>
                                            <option value="url">رابط</option>
                                            <option value="min">الحد الأدنى للطول</option>
                                            <option value="max">الحد الأقصى للطول</option>
                                        </select>
                                    </div>

                                    {selectedField.properties.validation.rule === 'regex' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                نمط التعبير المنتظم
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedField.properties.validation.pattern || ''}
                                                onChange={(e) => updateValidation({ pattern: e.target.value })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                                placeholder="^[a-zA-Z0-9]+$"
                                                aria-label="نمط التعبير المنتظم"
                                            />
                                        </div>
                                    )}

                                    {(selectedField.properties.validation.rule === 'min' || selectedField.properties.validation.rule === 'max') && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                {selectedField.properties.validation?.rule === 'min' ? 'الحد الأدنى' : 'الحد الأقصى'} للقيمة
                                            </label>
                                            <input
                                                type="number"
                                                value={selectedField.properties.validation?.[selectedField.properties.validation?.rule === 'min' ? 'minValue' : 'maxValue'] || ''}
                                                onChange={(e) => updateValidation({
                                                    [selectedField.properties.validation?.rule === 'min' ? 'minValue' : 'maxValue']: parseInt(e.target.value)
                                                })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                                aria-label="Validation value"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            رسالة الخطأ
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedField.properties.validation.errorMessage || ''}
                                            onChange={(e) => updateValidation({ errorMessage: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                            placeholder="يرجى إدخال قيمة صحيحة"
                                            aria-label="Error message"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Options (for choice fields) */}
                    {(selectedField.type === 'radio_group' || selectedField.type === 'checkbox' || selectedField.type === 'dropdown') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                    الخيارات
                                </label>
                                <button
                                    onClick={addOption}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 rtl-flex-row-reverse"
                                >
                                    <Plus size={16} />
                                    إضافة خيار
                                </button>
                            </div>

                            <div className="space-y-2">
                                {selectedField.properties.options?.map((option, index) => (
                                    <div key={option.id} className="p-2 border border-gray-200 rounded">
                                        <div className="flex items-center gap-2 mb-2 rtl-flex-row-reverse">
                                            <input
                                                type="text"
                                                value={option.label}
                                                onChange={(e) => updateOption(option.id, { label: e.target.value })}
                                                aria-label={`نص الخيار ${index + 1}`}
                                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                                placeholder="نص الخيار"
                                            />
                                            <button
                                                onClick={() => removeOption(option.id)}
                                                className="text-red-500 hover:text-red-700"
                                                aria-label="إزالة الخيار"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {/* Image upload for radio groups */}
                                        {selectedField.type === 'radio_group' && (
                                            <div className="mb-2">
                                                <ImageUpload
                                                    value={option.imageUrl || ''}
                                                    onChange={(imageUrl) => updateOption(option.id, { imageUrl })}
                                                    onRemove={() => updateOption(option.id, { imageUrl: null })}
                                                    placeholder="إضافة صورة للخيار"
                                                />
                                            </div>
                                        )}

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Linear Scale Configuration */}
                    {selectedField.type === 'linear_scale' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    نطاق المقياس
                                </label>
                                <div className="flex items-center gap-2 rtl-flex-row-reverse">
                                    <input
                                        type="number"
                                        value={selectedField.properties.minValue ?? 1}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { minValue: parseInt(e.target.value) })}
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                        aria-label="Min value"
                                    />
                                    <span className="text-sm text-gray-500">إلى</span>
                                    <input
                                        type="number"
                                        value={selectedField.properties.maxValue ?? 5}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { maxValue: parseInt(e.target.value) })}
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                        aria-label="Max value"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    التسمية اليسرى
                                </label>
                                <input
                                    type="text"
                                    value={selectedField.properties.minLabel ?? ''}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { minLabel: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="e.g. Strongly Disagree"
                                    aria-label="Min label"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    التسمية اليمنى
                                </label>
                                <input
                                    type="text"
                                    value={selectedField.properties.maxLabel ?? ''}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { maxLabel: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="e.g. Strongly Agree"
                                    aria-label="Max label"
                                />
                            </div>
                        </div>
                    )}

                    {/* Signature Configuration */}
                    {selectedField.type === 'signature' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    النص المؤقت
                                </label>
                                <input
                                    type="text"
                                    value={selectedField.properties.placeholder || ''}
                                    onChange={(e) => updateFieldProperties(selectedField.id, { placeholder: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="ارسم توقيعك هنا"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    لون القلم
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={selectedField.properties.penColor || '#000000'}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { penColor: e.target.value })}
                                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={selectedField.properties.penColor || '#000000'}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { penColor: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    لون الخلفية
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={selectedField.properties.backgroundColor || '#ffffff'}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { backgroundColor: e.target.value })}
                                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={selectedField.properties.backgroundColor || '#ffffff'}
                                        onChange={(e) => updateFieldProperties(selectedField.id, { backgroundColor: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    أبعاد لوحة التوقيع
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">العرض (px)</label>
                                        <input
                                            type="number"
                                            value={selectedField.properties.width || 500}
                                            onChange={(e) => updateFieldProperties(selectedField.id, { width: parseInt(e.target.value) })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                            min="200"
                                            max="800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">الارتفاع (px)</label>
                                        <input
                                            type="number"
                                            value={selectedField.properties.height || 200}
                                            onChange={(e) => updateFieldProperties(selectedField.id, { height: parseInt(e.target.value) })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                            min="100"
                                            max="400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Regex Builder Wizard */}
            <RegexBuilderWizard
                isOpen={showRegexBuilder}
                onClose={() => setShowRegexBuilder(false)}
                onSave={handleRegexBuilderSave}
            />
        </>
    )
} 