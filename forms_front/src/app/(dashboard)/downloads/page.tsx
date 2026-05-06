'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, FileWarning, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { listAttachmentPdfJobs, type AttachmentPdfJob } from '@/lib/attachment-pdf-jobs-client'

function formatDate(dateIso: string): string {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ar-SY')
}

function formatSize(size?: number): string {
  if (!size || size <= 0) return '-'
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export default function DownloadsPage() {
  const { token } = useAuthStore()
  const [jobs, setJobs] = useState<AttachmentPdfJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const hasActiveJobs = useMemo(
    () => jobs.some((job) => job.status === 'queued' || job.status === 'processing'),
    [jobs]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!token) {
        if (!cancelled) {
          setJobs([])
          setError('يجب تسجيل الدخول لعرض التحميلات.')
          setLoading(false)
        }
        return
      }
      try {
        const data = await listAttachmentPdfJobs(token, 100)
        if (!cancelled) {
          setJobs(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'فشل تحميل قائمة التحميلات.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token, refreshTick])

  useEffect(() => {
    if (!hasActiveJobs) return
    const timer = setInterval(() => {
      setRefreshTick((v) => v + 1)
    }, 2000)
    return () => clearInterval(timer)
  }, [hasActiveJobs])

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">التحميلات</h1>
          <p className="text-sm text-slate-600 mt-1">متابعة تجهيز ملفات PDF/ZIP وتحميلها عند الاكتمال.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((v) => v + 1)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-600">
          <Loader2 className="animate-spin" size={18} />
          <span className="font-semibold">جاري تحميل مهام التحميل...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          لا توجد مهام تجهيز بعد.
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">المهمة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">التقدم</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">الحجم</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">وقت الإنشاء</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const isCompleted = job.status === 'completed'
                const isFailed = job.status === 'failed'
                const isProcessing = job.status === 'processing' || job.status === 'queued'
                return (
                  <tr key={job.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-sm">{job.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {job.kind === 'template_zip' ? `Template: ${job.templateId || job.submissionId}` : `Submission: ${job.submissionId}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full text-xs font-bold">
                          <CheckCircle2 size={13} />
                          مكتمل
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full text-xs font-bold">
                          {job.status === 'queued' ? <Clock3 size={13} /> : <Loader2 className="animate-spin" size={13} />}
                          {job.status === 'queued' ? 'في الانتظار' : 'قيد المعالجة'}
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full text-xs font-bold">
                          <FileWarning size={13} />
                          فشل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }} />
                      </div>
                      <div className="text-xs text-slate-600 mt-1">{job.progress}%</div>
                      {isFailed && job.errorMessage && (
                        <div className="text-xs text-rose-600 mt-1">{job.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatSize(job.fileSizeBytes)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      {isCompleted && job.downloadUrl ? (
                        <a
                          href={job.downloadUrl}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold"
                        >
                          <Download size={14} />
                          {job.kind === 'template_zip' ? 'تحميل ZIP' : 'تحميل PDF'}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
