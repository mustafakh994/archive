'use client'

import React, { useEffect } from 'react'
import { useDepartmentStore } from '../../lib/store/useDepartmentStore'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export function DepartmentTestComponent() {
  const { 
    departments, 
    isLoading, 
    error, 
    fetchDepartments 
  } = useDepartmentStore()

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading departments..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium">Error loading departments:</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={() => fetchDepartments()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Departments ({departments.length})</h2>
      
      {departments.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No departments found
        </div>
      ) : (
        <div className="grid gap-4">
          {departments.map((department) => (
            <div
              key={department.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{department.name}</h3>
                  <p className="text-sm text-gray-600">{department.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Code: {department.code}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Users: {department.userCount || 0}</div>
                  <div>Forms: {department.formCount || 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify({ 
            departmentCount: departments.length,
            isLoading,
            error,
            sampleDepartment: departments[0] || null
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
}