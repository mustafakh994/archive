'use client'

import React, { useState } from 'react'
import { 
  DateDisplay, 
  TableDate, 
  DetailDate, 
  RelativeDate, 
  DateInput, 
  DateRange 
} from '@/components/ui/DateDisplay'
import { 
  formatDate, 
  formatTableDate, 
  formatDetailDate, 
  formatRelativeTime,
  getCurrentISOString
} from '@/lib/utils/dateFormatter'

/**
 * Example component demonstrating consistent date/time formatting
 * Shows Gregorian calendar dates with time information
 */
export function DateFormattingExample() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentISOString())
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Sample dates for demonstration
  const sampleDates = {
    now: new Date().toISOString(),
    today: new Date().toISOString(),
    yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastWeek: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastMonth: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastYear: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          أمثلة على تنسيق التاريخ والوقت
        </h1>
        <p className="text-gray-600 mb-8">
          جميع التواريخ تستخدم التقويم الميلادي مع أسماء الأشهر العربية وعرض معلومات الوقت بشكل متسق في جميع أنحاء النظام.
        </p>

        {/* Date Display Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">مكونات عرض التاريخ</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">تنسيق تاريخ الجدول</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">الآن:</span> <TableDate date={sampleDates.now} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">أمس:</span> <TableDate date={sampleDates.yesterday} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">الأسبوع الماضي:</span> <TableDate date={sampleDates.lastWeek} />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Detail Date Format</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Now:</span> <DetailDate date={sampleDates.now} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Yesterday:</span> <DetailDate date={sampleDates.yesterday} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Last Month:</span> <DetailDate date={sampleDates.lastMonth} />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Relative Time Format</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Now:</span> <RelativeDate date={sampleDates.now} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Yesterday:</span> <RelativeDate date={sampleDates.yesterday} />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Last Year:</span> <RelativeDate date={sampleDates.lastYear} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Format Options */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Custom Format Options</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">DateDisplay Component with Custom Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Short with time:</span>{' '}
                  <DateDisplay 
                    date={sampleDates.now} 
                    format="custom" 
                    options={{ format: 'short', includeTime: true }} 
                  />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Long without time:</span>{' '}
                  <DateDisplay 
                    date={sampleDates.now} 
                    format="custom" 
                    options={{ format: 'long', includeTime: false }} 
                  />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">With seconds:</span>{' '}
                  <DateDisplay 
                    date={sampleDates.now} 
                    format="custom" 
                    options={{ format: 'medium', includeTime: true, includeSeconds: true }} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">With tooltip:</span>{' '}
                  <DateDisplay 
                    date={sampleDates.lastWeek} 
                    format="table" 
                    showRelativeTooltip={true}
                    className="cursor-help"
                  />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Recent date (highlighted):</span>{' '}
                  <DateDisplay date={sampleDates.now} format="table" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Date Input Components */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Date Input Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Single Date Input</h3>
              <DateInput
                value={selectedDate}
                onChange={setSelectedDate}
                label="Select Date & Time"
                includeTime={true}
              />
              <div className="mt-3 text-sm text-gray-600">
                <strong>Selected:</strong> <DetailDate date={selectedDate} />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Date Range Input</h3>
              <DateRange
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                startLabel="From"
                endLabel="To"
                includeTime={true}
              />
              {(startDate || endDate) && (
                <div className="mt-3 text-sm text-gray-600">
                  <div><strong>From:</strong> {startDate ? <DetailDate date={startDate} /> : 'Not set'}</div>
                  <div><strong>To:</strong> {endDate ? <DetailDate date={endDate} /> : 'Not set'}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Utility Functions */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Utility Functions</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">Direct Function Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">formatTableDate():</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {formatTableDate(sampleDates.now)}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">formatDetailDate():</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {formatDetailDate(sampleDates.now)}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">formatRelativeTime():</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {formatRelativeTime(sampleDates.yesterday)}
                  </code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Custom format:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {formatDate(sampleDates.now, { format: 'long', includeTime: false })}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">With seconds:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {formatDate(sampleDates.now, { includeTime: true, includeSeconds: true })}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Guidelines */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Usage Guidelines</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Best Practices</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use <code>TableDate</code> for data tables and lists</li>
              <li>• Use <code>DetailDate</code> for detailed views and forms</li>
              <li>• Use <code>RelativeDate</code> for recent activity and notifications</li>
              <li>• Use <code>DateInput</code> for form inputs with proper validation</li>
              <li>• All dates are automatically converted to user's local timezone for display</li>
              <li>• Backend always stores dates in UTC format</li>
              <li>• Gregorian calendar is used throughout the system</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}