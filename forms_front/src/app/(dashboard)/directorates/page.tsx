'use client'

import React, { useEffect, useState } from 'react'
import { PlusCircle, MoreHorizontal, Building2, Edit, Trash2, Eye, ShieldAlert } from 'lucide-react'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { Department } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'
import DepartmentForm from '@/components/departments/DepartmentForm'
import { useRouter } from 'next/navigation'

export default function DirectoratesPage() {
    const { departments, isLoading, error, fetchDepartments, deleteDepartment } = useDepartmentStore()
    const { user, hasPermission } = useAuthStore()
    const router = useRouter()
    
    // State for form modal
    const [showForm, setShowForm] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

    // Debug log to see what departments contains
    console.log('Departments in component:', departments, 'Type:', typeof departments, 'Is Array:', Array.isArray(departments))

    // Check if user is SuperAdmin - only SuperAdmin can access directories
    useEffect(() => {
        if (user) {
            const isSuperAdmin = user.role?.name === 'SuperAdmin' || user.roleName === 'SuperAdmin'
            
            if (!isSuperAdmin) {
                // Redirect non-SuperAdmin users
                router.push('/unauthorized')
            }
        }
    }, [user, router])

    useEffect(() => {
        void fetchDepartments({ page: 1, pageSize: 500 })
    }, [fetchDepartments])

    // Form handlers
    const handleCreateNew = () => {
        setSelectedDepartment(null)
        setFormMode('create')
        setShowForm(true)
    }

    const handleEdit = (department: Department) => {
        setSelectedDepartment(department)
        setFormMode('edit')
        setShowForm(true)
        setActionMenuOpen(null)
    }

    const handleView = (department: Department) => {
        // For now, just log - you can implement a view modal later
        console.log('View department:', department)
        setActionMenuOpen(null)
    }

    const handleDelete = async (department: Department) => {
        if (window.confirm(`هل أنت متأكد من حذف ${department.name}؟`)) {
            const success = await deleteDepartment(department.id)
            if (success) {
                setActionMenuOpen(null)
            }
        }
    }

    const handleFormSuccess = (department: Department) => {
        setShowForm(false)
        setSelectedDepartment(null)
        // Refresh the list
        void fetchDepartments({ page: 1, pageSize: 500 })
    }

    const toggleActionMenu = (departmentId: string) => {
        setActionMenuOpen(actionMenuOpen === departmentId ? null : departmentId)
    }

    // Fallback mock data if API is not available
    const mockDepartments: Department[] = [
        { 
            id: 'mock-1', 
            name: 'الموارد البشرية', 
            code: 'HR',
            description: 'إدارة الموارد البشرية والتوظيف',
            createdAt: '2023-10-26T08:00:00Z',
            updatedAt: '2023-10-26T08:00:00Z',
            settings: {},
            userCount: 0,
            formCount: 0
        },
        { 
            id: 'mock-2', 
            name: 'تقنية المعلومات', 
            code: 'IT',
            description: 'إدارة تقنية المعلومات والأنظمة',
            createdAt: '2023-10-24T08:00:00Z',
            updatedAt: '2023-10-24T08:00:00Z',
            settings: {},
            userCount: 0,
            formCount: 0
        }
    ]

    // Use mock data if departments is not an array (API error)
    const displayDepartments = Array.isArray(departments) ? departments : mockDepartments

  if (isLoading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
                <div className="flex flex-col items-center gap-5 p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-w-[300px]">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-[17px] font-bold text-slate-700" dir="rtl">جاري تحميل المديريات...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-rose-100 p-8 max-w-sm w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">خطأ في التحميل</h3>
                    <p className="text-[15px] text-slate-600 mb-8" dir="rtl">{error}</p>
                    <button 
                        onClick={() => void fetchDepartments({ page: 1, pageSize: 500 })}
                        className="w-full px-5 py-3 text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors font-bold shadow-sm"
                        dir="rtl"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-8 animate-in fade-in duration-500" dir="rtl">
            {!Array.isArray(departments) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <ShieldAlert size={20} className="text-amber-500" strokeWidth={2.5}/>
                    <p className="text-amber-800 text-[14px] font-bold">
                        API غير متاح حالياً. يتم عرض بيانات تجريبية.
                    </p>
                </div>
            )}
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
                        <Building2 size={28} className="text-indigo-600" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة المديريات</h1>
                        <p className="text-[15px] font-medium text-slate-500 mt-1">تتبع وإدارة جميع الأقسام والمديريات في النظام</p>
                    </div>
                </div>

                {hasPermission('create_departments') && (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                    >
                        <PlusCircle size={20} strokeWidth={2.5}/>
                        إضافة مديرية جديدة
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {!displayDepartments || displayDepartments.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Building2 size={32} className="text-slate-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-[18px] font-bold text-slate-900 mb-1">لا توجد مديريات</h3>
                        <p className="text-[15px] text-slate-500">لم يتم إضافة أي مديريات بعد. ابدأ بإضافة مديرية جديدة الآن.</p>
                    </div>
                ) : (
                    displayDepartments.map((department) => (
                        <div key={department.id} className="group bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-indigo-100 transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                                        <Building2 size={24} className="text-indigo-500" strokeWidth={2} />
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={() => toggleActionMenu(department.id)}
                                            className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            <MoreHorizontal size={20} strokeWidth={2.5} />
                                        </button>
                                        
                                        {actionMenuOpen === department.id && (
                                            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden py-1">
                                                <button
                                                    onClick={() => handleView(department)}
                                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                                >
                                                    <div className="p-1 bg-slate-100 rounded-md"><Eye size={16} /></div>
                                                    عرض التفاصيل
                                                </button>
                                                
                                                {hasPermission('manage_departments') && (
                                                    <button
                                                        onClick={() => handleEdit(department)}
                                                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <div className="p-1 bg-slate-100 rounded-md"><Edit size={16} /></div>
                                                        تعديل البيانات
                                                    </button>
                                                )}
                                                
                                                {hasPermission('delete_departments') && (
                                                    <button
                                                        onClick={() => handleDelete(department)}
                                                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                                                    >
                                                        <div className="p-1 bg-rose-100 rounded-md"><Trash2 size={16} /></div>
                                                        حذف المديرية
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <h3 className="text-[18px] font-black text-slate-900 line-clamp-1" title={department.name}>
                                        {department.name}
                                    </h3>
                                    <div className="inline-flex px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[13px] font-bold text-slate-600">
                                        الكود: <span className="mr-1 text-slate-900">{department.code}</span>
                                    </div>
                                </div>
                                <p className="text-[14px] text-slate-500 font-medium line-clamp-2 leading-relaxed h-10">
                                    {department.description || 'لا يوجد وصف متاح لهذه المديرية.'}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[12px] font-bold text-slate-400">تاريخ التوثيق</p>
                                <div className="text-[13px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    <TableDate date={department.createdAt} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Department Form Modal */}
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