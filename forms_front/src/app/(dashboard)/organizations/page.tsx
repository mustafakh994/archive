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
            <div>
                <div className="mb-6">
                    <button
                        onClick={handleBackToList}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        ← Back to Departments
                    </button>
                </div>
                <DepartmentSettings department={selectedDepartment} />
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
                {hasPermission('create_departments') && (
                    <button 
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <PlusCircle size={16} />
                        <span>Add New Department</span>
                    </button>
                )}
            </div>

            <DepartmentList
                onEdit={handleEdit}
                onView={handleView}
                showActions={true}
            />

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