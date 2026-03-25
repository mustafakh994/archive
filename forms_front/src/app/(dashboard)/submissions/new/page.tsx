'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search, PlusCircle, ArrowLeft } from 'lucide-react'
import { useFormStore } from '@/lib/store/useFormStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import Link from 'next/link'

export default function ArchiveNewDocumentSelector() {
    const router = useRouter()
    const { forms, isLoading, fetchForms } = useFormStore()
    const { user } = useAuthStore()
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (user) {
            const userRole = user.role?.name || user.roleName
            if (userRole === 'SuperAdmin' || userRole === 'DepartmentAdmin') {
                fetchForms()
            } else {
                fetchForms({ createdBy: user.id })
            }
        } else {
            fetchForms()
        }
    }, [user, fetchForms])

    const activeForms = Array.isArray(forms) ? forms.filter(f => f.status === 'Active' || f.isPublished) : []
    
    const filteredForms = activeForms.filter(form => 
        (form.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (form.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 max-w-7xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PlusCircle className="text-blue-600" />
                        أرشفة وثيقة جديدة
                    </h1>
                    <p className="text-gray-500 mt-1">الرجاء اختيار قالب الوثيقة المناسب للبدء بعملية الأرشفة</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft size={16} />
                    رجوع
                </button>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن اسم القالب..."
                    className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredForms.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد قوالب متوفرة</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        {searchQuery ? 'لم يتم العثور على قوالب تطابق بحثك.' : 'يرجى إنشاء قالب وثيقة جديد أولاً قبل البدء بالأرشفة.'}
                    </p>
                    {!searchQuery && (
                        <Link href="/forms/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <PlusCircle size={18} />
                            إنشاء قالب جديد
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredForms.map((form) => (
                        <Link
                            key={form.id}
                            href={`/submissions/new/${form.id}`}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <FileText size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{form.title || form.name}</h3>
                            <p className="text-gray-500 text-sm flex-1 mb-4 line-clamp-2">
                                {form.description || 'لا يوجد وصف متاح'}
                            </p>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-[-4px] transition-transform">
                                استخدام هذا القالب
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
