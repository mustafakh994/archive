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
        fetchDepartments()
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
        fetchDepartments()
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">جاري تحميل المديريات...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">خطأ: {error}</p>
                    <button 
                        onClick={() => fetchDepartments()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {!Array.isArray(departments) && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 text-sm">
                        ⚠️ API غير متاح. يتم عرض بيانات تجريبية.
                    </p>
                </div>
            )}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">المديريات</h1>
                {hasPermission('create_departments') && (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <PlusCircle size={16} />
                        <span>إضافة مديرية جديدة</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!displayDepartments || displayDepartments.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">لا توجد مديريات بعد. ابدأ بإضافة مديرية جديدة.</p>
                    </div>
                ) : (
                    displayDepartments.map((department) => (
                        <div key={department.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {department.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        الكود: {department.code}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {department.description}
                                    </p>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => toggleActionMenu(department.id)}
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>
                                    
                                    {actionMenuOpen === department.id && (
                                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => handleView(department)}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Eye size={14} />
                                                    عرض
                                                </button>
                                                
                                                {hasPermission('manage_departments') && (
                                                    <button
                                                        onClick={() => handleEdit(department)}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Edit size={14} />
                                                        تعديل
                                                    </button>
                                                )}
                                                
                                                {hasPermission('delete_departments') && (
                                                    <button
                                                        onClick={() => handleDelete(department)}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                        حذف
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400">
                                    تم الإنشاء: <TableDate date={department.createdAt} />
                                </p>
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