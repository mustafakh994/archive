'use client'

import React, { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { Save, Eye, Copy, Globe, Palette, Download, Upload, X } from 'lucide-react'
import { useFormStore } from '@/lib/store/useFormStore'
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast'
import SidebarToolbox from './SidebarToolbox'
import BuilderCanvas from './BuilderCanvas'
import PropertiesPanel from './PropertiesPanel'
import CustomizeModal from './CustomizeModal'
import FormPreview from './FormPreview'
import LocalStorageStatus from './LocalStorageStatus'

interface FormBuilderClientProps {
  formId: string
}

export default function FormBuilderClient({ formId }: FormBuilderClientProps) {
  const {
    form,
    currentForm,
    reorderFields,
    addField,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    saveForm,
    fetchForm,
    setFormStatus,
    isLoading,
    error
  } = useFormStore()
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const successToast = useSuccessToast()
  const errorToast = useErrorToast()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // Handle dropping from toolbox to canvas
    if (active.data?.current?.source === 'toolbox') {
      const fieldType = active.data.current.type

      // Create a new field based on the type
      const newField = {
        type: fieldType as any,
        properties: {
          label: `حقل جديد ${fieldType.replace('_', ' ')}`,
          placeholder: '',
          required: false,
          ...(fieldType === 'radio_group' || fieldType === 'checkbox' || fieldType === 'dropdown') && {
            options: [
              { id: `opt_${Date.now()}_1`, label: 'خيار 1' },
              { id: `opt_${Date.now()}_2`, label: 'خيار 2' }
            ]
          }
        }
      }

      addField(newField)
      return
    }

    // Handle reordering within canvas
    if (active.id !== over.id) {
      const oldIndex = form.fields.findIndex(field => field.id === active.id)
      const newIndex = form.fields.findIndex(field => field.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderFields(oldIndex, newIndex)
      }
    }
  }

  const handleSave = async () => {
    try {
      // Save to localStorage first
      saveToLocalStorage()

      // Save to server using the store method
      const success = await saveForm()

      if (success) {
        successToast('Form Saved!', 'Your form has been saved successfully.')
      } else {
        errorToast('Save Failed', 'Failed to save the form. Please try again.')
      }
    } catch (error) {
      console.error('Error saving form:', error)
      errorToast('Save Error', 'An error occurred while saving the form.')
    }
  }

  const handleLoadFromLocalStorage = () => {
    loadFromLocalStorage()
    alert('تم تحميل القالب من التخزين المحلي')
  }

  const handleClearLocalStorage = () => {
    if (confirm('هل أنت متأكد من حذف القالب المحفوظ محلياً؟')) {
      clearLocalStorage()
      alert('تم حذف القالب المحفوظ محلياً')
    }
  }

  // Load form data on component mount
  useEffect(() => {
    if (formId && formId !== 'new') {
      fetchForm(formId)
    } else {
      loadFromLocalStorage()
    }
  }, [formId, fetchForm, loadFromLocalStorage])

  // Auto-save to localStorage when form changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage()
    }, 1000) // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId)
  }, [form, saveToLocalStorage])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('تم نسخ الرابط إلى الحافظة!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('فشل في نسخ الرابط')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => fetchForm(formId)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gray-50 rtl-flex-row-reverse">
        {/* Right Column - Sidebar Toolbox */}
        <SidebarToolbox />

        {/* Center Column - Builder Canvas */}
        <div className="flex-1 flex flex-col relative bg-slate-50">
          {/* Header with Better Layout */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm z-10 sticky top-0">
            {/* Top Row - Title, Language, and Status */}
            <div className="px-6 py-4 border-b border-slate-100" dir="rtl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 border-r-2 border-indigo-500 pr-3">
                  <div className="text-right">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">محرر التكوين المتقدم</h1>
                    <p className="text-[13px] text-slate-500 font-medium mt-0.5">صمم قالبك الاحترافي بخطوات بسيطة</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full ring-1 ring-inset ring-slate-200/50">
                    <Globe size={13} strokeWidth={2.5} />
                    <span>العربية</span>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                  <label className="text-sm font-bold text-slate-700">الحالة النظامية:</label>
                  <select
                    value={form.status || 'Draft'}
                    onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive' | 'Draft')}
                    className="pl-4 pr-8 py-1.5 text-sm font-bold border-none bg-transparent focus:ring-0 text-indigo-700 cursor-pointer"
                    dir="rtl"
                  >
                    <option className="text-slate-700 font-bold" value="Draft">مسودة 📝</option>
                    <option className="text-slate-700 font-bold" value="Active">نشط وملزم 🟢</option>
                    <option className="text-slate-700 font-bold" value="Inactive">غير نشط (معلق) 🔴</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Middle Row - LocalStorage Status */}
            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 hidden md:block" dir="rtl">
              <div className="flex items-center justify-center">
                <LocalStorageStatus />
              </div>
            </div>

            {/* Bottom Row - Action Buttons */}
            <div className="px-6 py-3.5 bg-white/50" dir="rtl">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2.5 px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl hover:from-indigo-700 hover:to-blue-600 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5"
                  title="حفظ التكوين"
                >
                  <Save size={18} strokeWidth={2.5} />
                  <span className="text-[15px] font-bold">حفظ واعتماد الأساس</span>
                </button>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-bold shadow-sm"
                  title="معاينة ديناميكية"
                >
                  <Eye size={18} strokeWidth={2.5} />
                  <span className="text-[14px]">معاينة كـ مستخدم</span>
                </button>
                <button
                  onClick={() => setShowCustomizeModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-bold shadow-sm"
                  title="تخصيص المظهر"
                >
                  <Palette size={18} strokeWidth={2.5} />
                  <span className="text-[14px]">إعدادات المظهر</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <BuilderCanvas />
        </div>

        {/* Left Column - Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Form Preview Modal */}
      <FormPreview
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </DndContext>
  )
} 