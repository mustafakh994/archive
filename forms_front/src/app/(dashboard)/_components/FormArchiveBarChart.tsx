'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface FormArchiveChartRow {
  formTitle: string
  archivedCount: number
  departmentName: string
}

const MAX_LABEL = 36

function truncateLabel(text: string): string {
  const t = text.trim()
  if (t.length <= MAX_LABEL) return t
  return `${t.slice(0, MAX_LABEL)}…`
}

export default function FormArchiveBarChart({ rows }: { rows: FormArchiveChartRow[] }) {
  const chartData = useMemo(
    () =>
      [...rows]
        .filter((r) => r.archivedCount > 0)
        // Recharts vertical layout: first row renders at bottom — ascending puts largest at top.
        .sort((a, b) => a.archivedCount - b.archivedCount)
        .map((r) => ({
          ...r,
          shortTitle: truncateLabel(r.formTitle),
        })),
    [rows]
  )

  const height = Math.min(520, Math.max(200, chartData.length * 44 + 80))

  if (chartData.length === 0) {
    return (
      <div className="border-b border-gray-200 px-6 py-8 text-center text-sm text-gray-500" dir="rtl">
        لا توجد وثائق مؤرشفة لعرضها في المخطط.
      </div>
    )
  }

  return (
    <div className="border-b border-gray-200 px-4 py-6" dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" horizontal={false} />
          <XAxis type="number" allowDecimals={false} className="text-xs fill-gray-600" />
          <YAxis
            type="category"
            dataKey="shortTitle"
            width={200}
            tick={{ fontSize: 11, fill: '#4b5563' }}
            interval={0}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as FormArchiveChartRow
              return (
                <div
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md"
                  style={{ direction: 'rtl', textAlign: 'right' }}
                >
                  <p className="font-semibold text-gray-900">{row.formTitle}</p>
                  <p className="text-gray-600">{row.departmentName}</p>
                  <p className="mt-1 text-amber-800">
                    الوثائق المؤرشفة: <span className="font-bold">{row.archivedCount}</span>
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="archivedCount" name="الوثائق المؤرشفة" fill="#d97706" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
