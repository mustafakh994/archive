'use client'

import React, { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
    value?: string
    onChange: (imageUrl: string) => void
    onRemove: () => void
    placeholder?: string
}

export default function ImageUpload({ value, onChange, onRemove, placeholder = "رابط الصورة أو الرفع" }: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url')

    const handleFileUpload = async (file: File) => {
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('يرجى اختيار ملف صورة')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('يجب أن يكون حجم الصورة أقل من 5 ميجابايت')
            return
        }

        setIsUploading(true)

        try {
            // For demo purposes, we'll use a mock upload
            // In production, you'd upload to a service like Cloudinary, AWS S3, etc.
            const mockImageUrl = await mockImageUpload(file)
            onChange(mockImageUrl)
        } catch (error) {
            console.error('Upload failed:', error)
            alert('فشل الرفع. يرجى المحاولة مرة أخرى.')
        } finally {
            setIsUploading(false)
        }
    }

    const mockImageUpload = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                // Convert to base64 for demo
                const base64 = e.target?.result as string
                resolve(base64)
            }
            reader.readAsDataURL(file)
        })
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            handleFileUpload(file)
        }
    }

    const handleUrlChange = (url: string) => {
        onChange(url)
    }

    return (
        <div className="space-y-2">
            {/* Upload Method Toggle */}
            <div className="flex gap-2 text-sm rtl-flex-row-reverse">
                <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`px-2 py-1 rounded ${uploadMethod === 'url' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                    رابط
                </button>
                <button
                    type="button"
                    onClick={() => setUploadMethod('upload')}
                    className={`px-2 py-1 rounded ${uploadMethod === 'upload' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                >
                    رفع
                </button>
            </div>

            {/* URL Input */}
            {uploadMethod === 'url' && (
                <div className="flex gap-2 rtl-flex-row-reverse">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="أدخل رابط الصورة"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                    {value && (
                        <button
                            onClick={onRemove}
                            className="p-2 text-red-500 hover:text-red-700"
                            aria-label="إزالة الصورة"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* File Upload */}
            {uploadMethod === 'upload' && (
                <div className="space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        aria-label="رفع ملف صورة"
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50"
                    >
                        <div className="flex flex-col items-center gap-2">
                            {isUploading ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            ) : (
                                <Upload size={20} className="text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600">
                                {isUploading ? 'جاري الرفع...' : 'انقر لرفع صورة'}
                            </span>
                        </div>
                    </button>

                    {value && (
                        <div className="relative">
                            <img
                                src={value}
                                alt="تم الرفع"
                                className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                                onClick={onRemove}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                aria-label="إزالة الصورة"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Image Preview */}
            {value && uploadMethod === 'url' && (
                <div className="relative">
                    <img
                        src={value}
                        alt="معاينة"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                        }}
                    />
                </div>
            )}
        </div>
    )
} 