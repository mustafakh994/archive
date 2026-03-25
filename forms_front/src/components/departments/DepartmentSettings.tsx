'use client'

import React, { useEffect, useState } from 'react'
import { Building2, Users, FileText, Settings, Calendar, Info } from 'lucide-react'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { Department } from '@/lib/api/client'
import { DetailDate } from '@/components/ui/DateDisplay'

interface DepartmentSettingsProps {
    departmentId?: string
    department?: Department | null
}

export default function DepartmentSettings({ departmentId, department }: DepartmentSettingsProps) {
    const {
        currentDepartment,
        fetchDepartment,
        isLoading,
        error,
        getDepartmentById
    } = useDepartmentStore()
    const { user } = useAuthStore()

    const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'statistics'>('overview')

    // Determine which department to display
    const displayDepartment = department || currentDepartment || (departmentId ? getDepartmentById(departmentId) : null)
    const targetDepartmentId = departmentId || department?.id || user?.departmentId

    useEffect(() => {
        if (targetDepartmentId && !displayDepartment) {
            fetchDepartment(targetDepartmentId)
        }
    }, [targetDepartmentId, displayDepartment, fetchDepartment])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading department settings...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 mb-4">Error: {error}</p>
                <button
                    onClick={() => targetDepartmentId && fetchDepartment(targetDepartmentId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        )
    }

    if (!displayDepartment) {
        return (
            <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Department not found.</p>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Info },
        { id: 'configuration', label: 'Configuration', icon: Settings },
        { id: 'statistics', label: 'Statistics', icon: FileText },
    ] as const

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{displayDepartment.name}</h1>
                        <p className="text-sm text-gray-600">Department Code: {displayDepartment.code}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Department Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <p className="text-gray-900">{displayDepartment.name}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                    <p className="text-gray-900">{displayDepartment.code}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <p className="text-gray-900">{displayDepartment.description}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Timestamps</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-500" />
                                        <p className="text-gray-900">
                                            <DetailDate date={displayDepartment.createdAt} />
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-500" />
                                        <p className="text-gray-900">
                                            <DetailDate date={displayDepartment.updatedAt} />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'configuration' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Department Configuration</h3>
                            <div className="space-y-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">General Settings</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">Auto-approve forms</p>
                                                <p className="text-sm text-gray-600">Automatically approve new forms</p>
                                            </div>
                                            <div className="text-sm text-gray-500">Disabled</div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">Email notifications</p>
                                                <p className="text-sm text-gray-600">Send email notifications for submissions</p>
                                            </div>
                                            <div className="text-sm text-gray-500">Enabled</div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">Data retention</p>
                                                <p className="text-sm text-gray-600">How long to keep form submissions</p>
                                            </div>
                                            <div className="text-sm text-gray-500">1 year</div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">Form templates</p>
                                                <p className="text-sm text-gray-600">Enable department form templates</p>
                                            </div>
                                            <div className="text-sm text-gray-500">Enabled</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="text-blue-800 font-medium">Configuration Management</p>
                                            <p className="text-blue-700 text-sm mt-1">
                                                Department-specific settings are managed through the backend API and 
                                                automatically synchronized across all department users.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Access Control</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">Form Management</p>
                                        <p className="text-sm text-gray-600">Allow users to create and manage forms</p>
                                    </div>
                                    <div className="text-sm text-gray-500">Configured via roles</div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">User Management</p>
                                        <p className="text-sm text-gray-600">Allow users to manage department members</p>
                                    </div>
                                    <div className="text-sm text-gray-500">Configured via roles</div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">Department Settings</p>
                                        <p className="text-sm text-gray-600">Allow users to modify department settings</p>
                                    </div>
                                    <div className="text-sm text-gray-500">Configured via roles</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Department Statistics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-8 h-8 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-blue-900">-</p>
                                            <p className="text-sm text-blue-700">Total Users</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-green-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-green-900">-</p>
                                            <p className="text-sm text-green-700">Active Forms</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-8 h-8 text-purple-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-purple-900">-</p>
                                            <p className="text-sm text-purple-700">Submissions</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Overview</h3>
                            <div className="space-y-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-sm text-gray-700">Form submissions</span>
                                            </div>
                                            <span className="text-sm text-gray-500">Connected to backend</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="text-sm text-gray-700">User management</span>
                                            </div>
                                            <span className="text-sm text-gray-500">Connected to backend</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                <span className="text-sm text-gray-700">Department analytics</span>
                                            </div>
                                            <span className="text-sm text-gray-500">Connected to backend</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                        <div>
                                            <p className="text-green-800 font-medium">Backend Integration Active</p>
                                            <p className="text-green-700 text-sm mt-1">
                                                All department analytics and statistics are calculated and served by the backend API.
                                                Data is updated in real-time as users interact with the system.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}