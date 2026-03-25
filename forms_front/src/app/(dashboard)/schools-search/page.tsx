"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { searchSchools, type SchoolSearchResult } from "@/lib/api/schools"

export default function SchoolsSearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SchoolSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const canSearch = useMemo(() => query.trim().length >= 2, [query])

  useEffect(() => {
    if (!canSearch) {
      setResults([])
      setError(null)
      if (abortRef.current) abortRef.current.abort()
      return
    }

    setLoading(true)
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller

    const id = setTimeout(async () => {
      try {
        const data = await searchSchools(query, { signal: controller.signal })
        setResults(data)
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "فشل البحث")
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(id)
      controller.abort()
    }
  }, [query, canSearch])

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">بحث عن مدرسة</h1>
        <p className="text-gray-600 text-sm">اكتب جزءًا من اسم المدرسة</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثال: الوحدة"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="py-6 text-gray-600">جاري البحث...</div>
      )}
      {error && (
        <div className="py-4 text-red-600">{error}</div>
      )}

      {!loading && !error && results.length === 0 && canSearch && (
        <div className="py-6 text-gray-600">لا توجد نتائج</div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">المدرسة</th>
                <th className="p-3 text-right">المدينة</th>
                <th className="p-3 text-right">المجمع</th>
                <th className="p-3 text-right">التصنيف</th>
                <th className="p-3 text-right">حالة الاستبيان</th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.city || '-'}</td>
                  <td className="p-3">{s.district || '-'}</td>
                  <td className="p-3">{s.category || '-'}</td>
                  <td className="p-3">
                    {s.isOpenForVoting ? (
                      <span className="text-green-700">مفتوح</span>
                    ) : (
                      <span className="text-gray-600">مغلق</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        مصدر البيانات: <code>/api/Schools/search</code>
      </div>
    </main>
  )
}











