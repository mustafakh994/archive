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
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shadow-inner">
                            <PlusCircle size={32} strokeWidth={2.5} />
                        </div>
                        أرشفة وثيقة جديدة
                    </h1>
                    <p className="text-lg text-slate-500 font-medium mt-2">الرجاء اختيار قالب الوثيقة المناسب للبدء بعملية إدخال البيانات</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 bg-white shadow-sm rounded-xl text-[15px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all hover:shadow"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                    العودة للقائمة
                </button>
            </div>

            <div className="mb-8 relative max-w-2xl">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-indigo-400" strokeWidth={2.5} />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن اسم القالب السريع..."
                    className="block w-full pl-4 pr-12 py-4 border border-slate-200/80 rounded-2xl bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold placeholder-slate-400 transition-all text-right"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600"></div>
                </div>
            ) : filteredForms.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-16 text-center animate-in fade-in">
                    <div className="mx-auto w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-slate-100 shadow-inner">
                        <FileText className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">لا توجد قوالب متاحة للبحث</h3>
                    <p className="text-[17px] font-medium text-slate-500 max-w-sm mx-auto">
                        {searchQuery ? 'لم نتمكن من العثور على أي قوالب تطابق هذا البحث.' : 'يرجى إنشاء قالب وثيقة جديد أولاً قبل البدء بالأرشفة والتحرير.'}
                    </p>
                    {!searchQuery && (
                        <Link href="/forms/new" className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5">
                            <PlusCircle size={20} strokeWidth={2.5} />
                            إنشاء قالب أساسي جديد
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredForms.map((form) => (
                        <Link
                            key={form.id}
                            href={`/submissions/new/${form.id}`}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all group flex flex-col relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-white/0 rounded-bl-full z-0 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex items-start justify-between mb-5 relative z-10">
                                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-blue-500 group-hover:text-white transition-all shadow-sm group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
                                    <FileText size={26} strokeWidth={2} />
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-indigo-700 transition-colors relative z-10">
                                {form.title || form.name}
                            </h3>
                            
                            <p className="text-slate-500 font-medium text-[14px] flex-1 mb-6 line-clamp-2 relative z-10 leading-relaxed">
                                {form.description || 'اضغط هنا للبدء في تعبئة هذا القالب الفارغ وتوثيق البيانات.'}
                            </p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center text-indigo-600 font-bold text-[14px] group-hover:translate-x-[-8px] transition-transform relative z-10">
                                اختيار هذا القالب
                                <ArrowLeft size={16} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
