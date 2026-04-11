'use client'

import React, { useState } from 'react'
import { SubmissionFilters } from '@/lib/store/useSubmissionStore'
import { 
  Filter,
  X,
  Calendar,
  Search,
  ArrowUpDown
} from 'lucide-react'

interface SubmissionFiltersProps {
  filters: SubmissionFilters
  onFiltersChange: (filters: Partial<SubmissionFilters>) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  isOpen: boolean
  onToggle: () => void
}

export default function SubmissionFiltersComponent({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  isOpen,
  onToggle
}: SubmissionFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Partial<SubmissionFilters>>(filters)

  const handleFilterChange = (key: keyof SubmissionFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleApply = () => {
    onApplyFilters()
    onToggle()
  }

  const handleClear = () => {
    setLocalFilters({})
    onClearFilters()
    onToggle()
  }

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SubmissionFilters]
    return value !== undefined && value !== '' && key !== 'page' && key !== 'pageSize'
  })

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={onToggle}
        className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
          hasActiveFilters
            ? 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {hasActiveFilters && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Active
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filter Submissions</h3>
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
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
                    <Calendar className="h-4 w-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={localFilters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Submitter Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Search className="h-4 w-4 inline mr-1" />
                  Submitter Email
                </label>
                <input
                  type="email"
                  value={localFilters.submitterEmail || ''}
                  onChange={(e) => handleFilterChange('submitterEmail', e.target.value)}
                  placeholder="Filter by email address..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>

              {/* Form Version */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Version
                </label>
                <input
                  type="number"
                  min="1"
                  value={localFilters.formVersion || ''}
                  onChange={(e) => handleFilterChange('formVersion', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Filter by form version..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>

              {/* Search Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search in Responses
                </label>
                <input
                  type="text"
                  value={localFilters.searchTerm || ''}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  placeholder="Search in submission content..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>

              {/* Sort Options */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ArrowUpDown className="h-4 w-4 inline mr-1" />
                  Sort Options
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sort By</label>
                    <select
                      value={localFilters.sortBy || filters.sortBy || 'submittedAt'}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    >
                      <option value="submittedAt">Submission Date</option>
                      <option value="submitterEmail">Email</option>
                      <option value="formVersion">Form Version</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Order</label>
                    <select
                      value={localFilters.sortOrder || filters.sortOrder || 'desc'}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Results Per Page
                </label>
                <select
                  value={localFilters.pageSize || filters.pageSize || 10}
                  onChange={(e) => handleFilterChange('pageSize', Number(e.target.value))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Clear All
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggle}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="px-3 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}