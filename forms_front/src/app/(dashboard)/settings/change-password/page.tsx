'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('جميع الحقول مطلوبة')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين')
      return
    }

    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
      return
    }

    if (newPassword === currentPassword) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية')
      return
    }

    setLoading(true)

    try {      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'فشل في تغيير كلمة المرور')
      }

      // Success
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/forms')
      }, 2000)

    } catch (err) {
      console.error('Change password error:', err)
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500" dir="rtl">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 mb-6 border border-slate-200 bg-white shadow-sm rounded-xl text-[14px] font-bold text-slate-700 hover:bg-slate-50 transition-all w-fit"
      >
        <ArrowLeft size={16} strokeWidth={2.5} className="rotate-180" />
        العودة للإعدادات
      </button>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-indigo-50 rounded-2xl ring-1 ring-indigo-100 shadow-inner">
          <KeyRound className="text-indigo-600" size={28} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">تغيير كلمة المرور</h1>
          <p className="text-[15px] font-medium text-slate-500 mt-1">قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك.</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-2">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-0.5">
            <CheckCircle size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-emerald-900 font-bold text-[15px]">تم تحديث كلمة المرور بنجاح!</p>
            <p className="text-emerald-700 text-[14px] font-medium mt-1">سيتم توجيهك إلى لوحة التحكم الرئيسية الآن...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-2">
          <div className="bg-rose-100 p-2 rounded-lg text-rose-600 mt-0.5">
            <AlertCircle size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-rose-900 font-bold text-[15px]">حدث خطأ أثناء التحديث</p>
            <p className="text-rose-700 text-[14px] font-medium mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative mb-8">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-indigo-600"></div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                كلمة المرور الحالية <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium bg-slate-50 border-slate-200 focus:border-indigo-500 hover:border-slate-300 text-slate-900 transition-colors shadow-sm"
                  placeholder="أدخل كلمة المرور الحالية"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                كلمة المرور الجديدة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium bg-slate-50 border-slate-200 focus:border-indigo-500 hover:border-slate-300 text-slate-900 transition-colors shadow-sm"
                  placeholder="أدخل 8 أحرف على الأقل"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[14px] font-bold text-slate-700 mb-2.5">
                تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pl-12 border rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium bg-slate-50 border-slate-200 focus:border-indigo-500 hover:border-slate-300 text-slate-900 transition-colors shadow-sm"
                  placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-6">
              <h4 className="text-[14px] font-bold text-slate-700 mb-3">متطلبات الأمان لكلمة المرور:</h4>
              <ul className="text-[13px] font-bold text-slate-600 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <li className="flex items-center gap-2">
                  <span className={newPassword.length >= 8 ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                  8 أحرف على الأقل
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                  حرف كبير واحد على الأقل
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[a-z]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                  حرف صغير واحد على الأقل
                </li>
                <li className="flex items-center gap-2">
                  <span className={/[0-9]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                  رقم واحد (0-9)
                </li>
                <li className="flex items-center gap-2 sm:col-span-2">
                  <span className={/[!@#$%^&*]/.test(newPassword) ? 'text-emerald-500' : 'text-slate-300'}>✓</span>
                  رمز خاص واحد على الأقل (!@#$%^&*)
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={20} strokeWidth={2.5} />
                    <span>حفظ وتغيير كلمة المرور</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="px-6 py-4 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                إلغاء الأمر
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
        <h4 className="flex items-center gap-2 text-[15px] font-bold text-amber-800 mb-4">
          <ShieldAlert size={18} strokeWidth={2.5} />
          نصائح أمنية إضافية
        </h4>
        <ul className="text-[14px] font-medium text-amber-700 space-y-2">
          <li className="flex gap-2"><span className="text-amber-400">•</span> تجنب مشاركة كلمة المرور الخاصة بك أو كتابتها في مكان مكشوف.</li>
          <li className="flex gap-2"><span className="text-amber-400">•</span> يفضل تغيير كلمة المرور بشكل دوري للحفاظ على تأمين حسابك.</li>
          <li className="flex gap-2"><span className="text-amber-400">•</span> تجنب استعمال كلمات المرور التي تم استخدامها في حسابات أو مواقع أخرى.</li>
        </ul>
      </div>
    </div>
  )
}

