"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { searchSchools, type SchoolSearchResult } from "@/lib/api/schools"
import { 
  Search, 
  GraduationCap, 
  MapPin, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Building
} from "lucide-react"

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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
            <GraduationCap className="text-indigo-600" size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">البحث السريع عن المدارس</h1>
            <p className="text-[15px] font-medium text-slate-500 mt-1">ابحث باسم المدرسة لمعرفة تفاصيلها ومجمعها وحالة الاستبيان الخاصة بها.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Search Box Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <label className="block text-[15px] font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Search size={18} className="text-indigo-500" strokeWidth={2.5} />
            كلمة البحث
          </label>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="text-slate-400" size={20} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب جزءاً من اسم المدرسة هنا (مثال: الوحدة)..."
              className="w-full pr-12 pl-4 py-3.5 text-[15px] font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 hover:bg-slate-50/50 transition-colors text-slate-900 placeholder:text-slate-400"
              dir="rtl"
            />
          </div>
          {!canSearch && query.length > 0 && (
            <p className="mt-3 text-[13px] font-bold text-amber-500 flex items-center gap-1.5">
              <AlertCircle size={14} />
              الرجاء إدخال حرفين على الأقل لبدء البحث
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-center text-[15px] font-bold text-slate-600" dir="rtl">جاري البحث في قاعدة البيانات...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="text-rose-600 mb-3" size={32} strokeWidth={2.5} />
            <p className="text-[15px] font-bold text-rose-800" dir="rtl">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && canSearch && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <Search className="text-slate-400" size={32} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2" dir="rtl">لا توجد نتائج</h3>
            <p className="text-[15px] font-medium text-slate-500 max-w-md" dir="rtl">
              لم يتم العثور على أي مدارس تطابق كلمة البحث "{query}". الرجاء التحقق من الاسم والمحاولة مرة أخرى.
            </p>
          </div>
        )}

        {/* Search Results Table */}
        {!loading && !error && results.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={18} className="text-slate-400" />
                نتائج البحث
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[13px] font-bold border border-indigo-100/50">
                المدارس المطابقة: {results.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                      اسم المدرسة
                    </th>
                    <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                      المدينة
                    </th>
                    <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                      المجمع / المنطقة
                    </th>
                    <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                      التصنيف
                    </th>
                    <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                      حالة الاستبيان
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {results.map((s) => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">
                            <GraduationCap size={16} strokeWidth={2.5} />
                          </div>
                          <span className="text-[14px] font-bold text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[14px] font-medium text-slate-600">
                          <MapPin size={14} className="text-slate-400" />
                          {s.city || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[14px] font-medium text-slate-600">
                          <Building2 size={14} className="text-slate-400" />
                          {s.district || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[14px] font-bold text-slate-700">
                        {s.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {s.isOpenForVoting ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[13px] font-bold border border-emerald-100/50">
                            <CheckCircle2 size={14} strokeWidth={2.5} />
                            استبيان متاح
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[13px] font-bold border border-slate-200">
                            <XCircle size={14} strokeWidth={2.5} />
                            مغلق
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}










