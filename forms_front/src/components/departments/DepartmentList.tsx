'use client'

import React, { useEffect, useState } from 'react'
import { Building2, MoreHorizontal, Edit, Trash2, Eye, Users, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDepartmentStore } from '@/lib/store/useDepartmentStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { Department } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'

interface DepartmentListProps {
  onEdit?: (department: Department) => void
  onView?: (department: Department) => void
  onDelete?: (department: Department) => void
  showActions?: boolean
}

export default function DepartmentList({ 
  onEdit, 
  onView, 
  onDelete, 
  showActions = true 
}: DepartmentListProps) {
  const { departments, isLoading, error, fetchDepartments, deleteDepartment, pagination } = useDepartmentStore()
  const { hasPermission } = useAuthStore()
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchDepartments({
      page: currentPage,
      pageSize: pageSize,
      search: searchTerm || undefined
    })
  }, [fetchDepartments, currentPage, pageSize, searchTerm])

  const handleDelete = async (department: Department) => {
    if (window.confirm(`Are you sure you want to delete ${department.name}?`)) {
      const success = await deleteDepartment(department.id)
      if (success && onDelete) {
        onDelete(department)
      }
    }
  }

  const toggleActionMenu = (departmentId: string) => {
    setActionMenuOpen(actionMenuOpen === departmentId ? null : departmentId)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page when searching
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading departments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => fetchDepartments({
            page: currentPage,
            pageSize: pageSize,
            search: searchTerm || undefined
          })}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (departments.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No departments found. Start by creating a new department.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Show:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div 
            key={department.id} 
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow relative"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {department.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Code: {department.code}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {department.description}
                </p>
              </div>
              
              {showActions && (
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
                        {onView && (
                          <button
                            onClick={() => {
                              onView(department)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}
                        
                        {onEdit && hasPermission('manage_departments') && (
                          <button
                            onClick={() => {
                              onEdit(department)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        )}
                        
                        {hasPermission('delete_departments') && (
                          <button
                            onClick={() => {
                              handleDelete(department)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Stats */}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{department.userCount || 0} users</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span>{department.formCount || 0} forms</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">
                    Created: <TableDate date={department.createdAt} />
                  </p>
                  {department.updatedAt !== department.createdAt && (
                    <p className="text-xs text-gray-400">
                      Updated: <TableDate date={department.updatedAt} />
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500">Live</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} departments
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i
                if (pageNum > pagination.totalPages) return null
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}