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
        <div className="flex-1 flex flex-col">
          {/* Header with Better Layout */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            {/* Top Row - Title, Language, and Status */}
            <div className="px-6 py-3 border-b border-gray-100" dir="rtl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <h1 className="text-lg font-semibold text-gray-900">منشئ قوالب الوثائق</h1>
                    <p className="text-xs text-gray-500 mt-0.5">أنشئ وخصص قالبك</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-md">
                    <Globe size={13} />
                    <span>العربية</span>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-black">الحالة:</label>
                  <select
                    value={form.status || 'Draft'}
                    onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive' | 'Draft')}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                    dir="rtl"
                  >
                    <option value="Draft">مسودة</option>
                    <option value="Active">نشط</option>
                    <option value="Inactive">غير نشط</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Middle Row - LocalStorage Status */}
            <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50" dir="rtl">
              <div className="flex items-center justify-center">
                <LocalStorageStatus />
              </div>
            </div>

            {/* Bottom Row - Action Buttons */}
            <div className="px-6 py-3" dir="rtl">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                  title="حفظ القالب"
                >
                  <Save size={18} />
                  <span className="text-sm font-medium">حفظ القالب</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
                  title="معاينة"
                >
                  <Eye size={18} />
                  <span className="text-sm font-medium">معاينة</span>
                </button>
                <button
                  onClick={() => setShowCustomizeModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
                  title="تخصيص"
                >
                  <Palette size={18} />
                  <span className="text-sm font-medium">تخصيص</span>
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