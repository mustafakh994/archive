'use client'

import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { DepartmentList, DepartmentForm, DepartmentSettings } from '@/components/departments'
import { Department } from '@/lib/api/client'

export default function OrganizationsPage() {
    const { hasPermission } = useAuthStore()
    const [showForm, setShowForm] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
    const [viewMode, setViewMode] = useState<'list' | 'settings'>('list')

    const handleCreateNew = () => {
        setSelectedDepartment(null)
        setFormMode('create')
        setShowForm(true)
    }

    const handleEdit = (department: Department) => {
        setSelectedDepartment(department)
        setFormMode('edit')
        setShowForm(true)
    }

    const handleView = (department: Department) => {
        setSelectedDepartment(department)
        setViewMode('settings')
    }

    const handleFormSuccess = () => {
        setShowForm(false)
        setSelectedDepartment(null)
    }

    const handleBackToList = () => {
        setViewMode('list')
        setSelectedDepartment(null)
    }

    if (viewMode === 'settings' && selectedDepartment) {
        return (
            <div className="max-w-6xl mx-auto py-6 animate-in fade-in duration-500" dir="rtl">
                <div className="mb-8">
                    <button
                        onClick={handleBackToList}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white shadow-sm rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        <span>←</span> العودة إلى المؤسسات
                    </button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-600 to-blue-500"></div>
                    <div className="p-8">
                        <DepartmentSettings department={selectedDepartment} />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-8 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
                        <span className="text-2xl text-indigo-600">🏢</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة المؤسسات والأقسام</h1>
                        <p className="text-[15px] font-medium text-slate-500 mt-1">عرض وتنظيم الهيكل الإداري والمؤسسي</p>
                    </div>
                </div>

                {hasPermission('create_departments') && (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                    >
                        <PlusCircle size={20} strokeWidth={2.5} />
                        إضافة مؤسسة جديدة
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <DepartmentList
                    onEdit={handleEdit}
                    onView={handleView}
                    showActions={true}
                />
            </div>

            <DepartmentForm
                department={selectedDepartment}
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSuccess={handleFormSuccess}
                mode={formMode}
            />
        </div>
    )
}