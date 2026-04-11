'use client'

import React, { useState } from 'react'
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface RegexBuilderWizardProps {
    isOpen: boolean
    onClose: () => void
    onSave: (pattern: string, errorMessage: string) => void
}

interface ValidationRule {
    type: string
    pattern: string
    description: string
    example: string
}

const validationRules: ValidationRule[] = [
    {
        type: 'email',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'بريد إلكتروني صحيح',
        example: 'user@example.com'
    },
    {
        type: 'phone',
        pattern: '^[+]?[0-9]{10,15}$',
        description: 'رقم هاتف (10-15 رقم)',
        example: '+1234567890'
    },
    {
        type: 'arabic_text',
        pattern: '^[\\u0600-\\u06FF\\s]+$',
        description: 'نص عربي فقط',
        example: 'مرحبا بالعالم'
    },
    {
        type: 'english_text',
        pattern: '^[a-zA-Z\\s]+$',
        description: 'نص إنجليزي فقط',
        example: 'Hello World'
    },
    {
        type: 'numbers_only',
        pattern: '^[0-9]+$',
        description: 'أرقام فقط',
        example: '12345'
    },
    {
        type: 'letters_numbers',
        pattern: '^[a-zA-Z0-9]+$',
        description: 'حروف وأرقام فقط',
        example: 'abc123'
    },
    {
        type: 'url',
        pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
        description: 'رابط صحيح',
        example: 'https://example.com'
    },
    {
        type: 'date_yyyy_mm_dd',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'تاريخ بصيغة YYYY-MM-DD',
        example: '2024-01-15'
    },
    {
        type: 'postal_code',
        pattern: '^[0-9]{5}$',
        description: 'رمز بريدي (5 أرقام)',
        example: '12345'
    },
    {
        type: 'custom_length',
        pattern: '',
        description: 'طول مخصص',
        example: 'حسب الطول المحدد'
    }
]

export default function RegexBuilderWizard({ isOpen, onClose, onSave }: RegexBuilderWizardProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedRule, setSelectedRule] = useState<ValidationRule | null>(null)
    const [customLength, setCustomLength] = useState({ min: 3, max: 10 })
    const [errorMessage, setErrorMessage] = useState('')
    const [testValue, setTestValue] = useState('')
    const [testResult, setTestResult] = useState<boolean | null>(null)

    if (!isOpen) return null

    const steps = [
        'اختر نوع التحقق',
        'تخصيص القاعدة',
        'اختبار القاعدة',
        'إنهاء'
    ]

    const handleRuleSelect = (rule: ValidationRule) => {
        setSelectedRule(rule)
        setCurrentStep(1)
    }

    const getFinalPattern = () => {
        if (!selectedRule) return ''

        if (selectedRule.type === 'custom_length') {
            return `^.{${customLength.min},${customLength.max}}$`
        }

        return selectedRule.pattern
    }

    const testPattern = () => {
        if (!testValue) return

        try {
            const pattern = getFinalPattern()
            const regex = new RegExp(pattern)
            const result = regex.test(testValue)
            setTestResult(result)
        } catch (error) {
            setTestResult(false)
        }
    }

    const handleSave = () => {
        const pattern = getFinalPattern()
        const finalErrorMessage = errorMessage || `يجب أن يكون ${selectedRule?.description}`
        onSave(pattern, finalErrorMessage)
        onClose()
        // Reset state
        setCurrentStep(0)
        setSelectedRule(null)
        setCustomLength({ min: 3, max: 10 })
        setErrorMessage('')
        setTestValue('')
        setTestResult(null)
    }

    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">اختر نوع التحقق المطلوب</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {validationRules.map((rule) => (
                    <button
                        key={rule.type}
                        onClick={() => handleRuleSelect(rule)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-right"
                    >
                        <div className="font-medium text-gray-900">{rule.description}</div>
                        <div className="text-sm text-gray-600 mt-1">مثال: {rule.example}</div>
                    </button>
                ))}
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">تخصيص قاعدة التحقق</h3>

            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium text-gray-900 mb-2">القاعدة المختارة:</div>
                <div className="text-sm text-gray-600">{selectedRule?.description}</div>
            </div>

            {selectedRule?.type === 'custom_length' && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">تحديد الطول</label>
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">الحد الأدنى</label>
                            <input
                                type="number"
                                value={customLength.min}
                                onChange={(e) => setCustomLength(prev => ({ ...prev, min: parseInt(e.target.value) || 1 }))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-900"
                                min="1"
                                aria-label="الحد الأدنى للطول"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">الحد الأقصى</label>
                            <input
                                type="number"
                                value={customLength.max}
                                onChange={(e) => setCustomLength(prev => ({ ...prev, max: parseInt(e.target.value) || 10 }))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-900"
                                min="1"
                                aria-label="الحد الأقصى للطول"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    رسالة الخطأ المخصصة
                </label>
                <input
                    type="text"
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder={`يجب أن يكون ${selectedRule?.description}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-800">
                    <strong>النمط المُنشأ:</strong> <code className="bg-white px-2 py-1 rounded text-xs">{getFinalPattern()}</code>
                </div>
            </div>
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">اختبار قاعدة التحقق</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    أدخل قيمة للاختبار
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={testValue}
                        onChange={(e) => setTestValue(e.target.value)}
                        placeholder="أدخل قيمة للاختبار"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                        onClick={testPattern}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        اختبار
                    </button>
                </div>
            </div>

            {testResult !== null && (
                <div className={`p-3 rounded-lg ${testResult ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2">
                        {testResult ? (
                            <Check size={16} className="text-green-600" />
                        ) : (
                            <X size={16} className="text-red-600" />
                        )}
                        <span className={testResult ? 'text-green-800' : 'text-red-800'}>
                            {testResult ? 'القيمة صحيحة' : 'القيمة غير صحيحة'}
                        </span>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-700">
                    <strong>مثال صحيح:</strong> {selectedRule?.example}
                </div>
            </div>
        </div>
    )

    const renderStep4 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">مراجعة النهائية</h3>

            <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-700">
                        <strong>نوع التحقق:</strong> {selectedRule?.description}
                    </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-700">
                        <strong>النمط:</strong> <code className="bg-white px-2 py-1 rounded text-xs">{getFinalPattern()}</code>
                    </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-700">
                        <strong>رسالة الخطأ:</strong> {errorMessage || `يجب أن يكون ${selectedRule?.description}`}
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return renderStep1()
            case 1:
                return renderStep2()
            case 2:
                return renderStep3()
            case 3:
                return renderStep4()
            default:
                return renderStep1()
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">منشئ قواعد التحقق</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-center">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${index <= currentStep
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {index + 1}
                                </div>
                                <span className={`ml-2 text-sm ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {step}
                                </span>
                                {index < steps.length - 1 && (
                                    <div className={`w-8 h-0.5 mx-2 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderCurrentStep()}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft size={16} />
                        السابق
                    </button>

                    <div className="flex gap-2">
                        {currentStep < steps.length - 1 ? (
                            <button
                                onClick={() => setCurrentStep(currentStep + 1)}
                                disabled={!selectedRule}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                التالي
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                <Check size={16} />
                                حفظ القاعدة
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
