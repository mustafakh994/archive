'use client'

import React, { useEffect, useState } from 'react'
import { useSubmissionStore, SubmissionFilters } from '@/lib/store/useSubmissionStore'
import { FormSubmission } from '@/lib/api/client'
import { TableDate } from '@/components/ui/DateDisplay'
import { 
  Search, 
  Filter, 
  Eye,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface SubmissionListProps {
  formId: string
  onViewSubmission?: (submission: FormSubmission) => void
}

export default function SubmissionList({ formId, onViewSubmission }: SubmissionListProps) {
  const {
    submissions,
    isLoading,
    error,
    pagination,
    filters,
    searchResults,
    isSearching,
    fetchFormSubmissions,
    setFilters,
    clearFilters,
    searchSubmissions,
    goToPage,
    changePageSize,
    refreshSubmissions,
    clearError
  } = useSubmissionStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [localFilters, setLocalFilters] = useState<Partial<SubmissionFilters>>({})

  // Fetch submissions on component mount and when formId changes
  useEffect(() => {
    if (formId) {
      fetchFormSubmissions(formId)
    }
  }, [formId, fetchFormSubmissions])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      await searchSubmissions(formId, searchTerm.trim())
    } else {
      await fetchFormSubmissions(formId, filters)
    }
  }

  const handleFilterChange = (key: keyof SubmissionFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = async () => {
    const newFilters = { ...filters, ...localFilters, page: 1 }
    setFilters(newFilters)
    await fetchFormSubmissions(formId, newFilters)
    setShowFilters(false)
  }

  const clearAllFilters = async () => {
    clearFilters()
    setLocalFilters({})
    setSearchTerm('')
    await fetchFormSubmissions(formId)
    setShowFilters(false)
  }

  const handlePageChange = async (newPage: number) => {
    await goToPage(newPage)
  }

  const handlePageSizeChange = async (newPageSize: number) => {
    await changePageSize(newPageSize)
  }

  const displaySubmissions = searchTerm ? searchResults : submissions



  const getSubmissionPreview = (responseData: any) => {
    if (!responseData || typeof responseData !== 'object') {
      return 'No data'
    }

    // Get first few fields for preview
    const entries = Object.entries(responseData).slice(0, 2)
    return entries.map(([key, value]) => `${key}: ${String(value).slice(0, 50)}`).join(', ')
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading submissions</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => fetchFormSubmissions(formId)}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Form Submissions</h2>
          <p className="text-sm text-gray-500">
            {pagination.totalCount} total submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshSubmissions}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search submissions by email or content..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || isSearching}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={localFilters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={localFilters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={localFilters.sortBy || filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="submittedAt">Submission Date</option>
                <option value="submitterEmail">Email</option>
                <option value="formVersion">Form Version</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="sortOrder"
                  value="desc"
                  checked={(localFilters.sortOrder || filters.sortOrder) === 'desc'}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Newest first</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="sortOrder"
                  value="asc"
                  checked={(localFilters.sortOrder || filters.sortOrder) === 'asc'}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Oldest first</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="px-3 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">Loading submissions...</span>
        </div>
      )}

      {/* Submissions Table */}
      {!isLoading && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {displaySubmissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'No submissions found matching your search.' : 'No submissions yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {displaySubmissions.map((submission) => (
                <li key={submission.id}>
                  <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {submission.submitterEmail}
                          </p>
                          <p className="text-sm text-gray-500">
                            <TableDate date={submission.submittedAt} />
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Version {submission.formVersion}</p>
                            <p className="text-xs text-gray-400 max-w-xs truncate">
                              {getSubmissionPreview(submission.responseData)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => onViewSubmission?.(submission)}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && displaySubmissions.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalCount}</span> results
              </p>
              <select
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.page
                          ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}