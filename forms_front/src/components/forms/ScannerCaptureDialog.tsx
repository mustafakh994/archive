'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Loader2, ScanSearch, X } from 'lucide-react'

interface ScannerCaptureDialogProps {
  onSave: (file: File) => Promise<void> | void
  disabled?: boolean
  buttonText?: string
  title?: string
}

interface ScannerDeviceOption {
  id: string
  label: string
}

export default function ScannerCaptureDialog({
  onSave,
  disabled = false,
  buttonText = 'المسح المباشر من الماسح',
  title = 'المسح من الماسح الضوئي'
}: ScannerCaptureDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<ScannerDeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [capturedDataUrl, setCapturedDataUrl] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hasDevices = devices.length > 0
  const canCapture = hasDevices && !capturedDataUrl && !isInitializing && !isSaving
  const canSave = !!capturedDataUrl && !isSaving

  const selectedLabel = useMemo(() => {
    return devices.find((device) => device.id === selectedDeviceId)?.label
  }, [devices, selectedDeviceId])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const openDialog = async () => {
    setIsOpen(true)
    setError('')
    setCapturedDataUrl('')
    setIsInitializing(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        throw new Error('المتصفح لا يدعم الوصول إلى أجهزة المسح/الكاميرا.')
      }

      const warmupStream = await navigator.mediaDevices.getUserMedia({ video: true })
      warmupStream.getTracks().forEach((track) => track.stop())

      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = mediaDevices.filter((device) => device.kind === 'videoinput')
      const mapped = videoInputs.map((device, index) => ({
        id: device.deviceId,
        label: device.label?.trim() || `Scanner ${index + 1}`
      }))

      setDevices(mapped)
      if (mapped.length === 0) {
        throw new Error('لم يتم العثور على أجهزة مسح/تصوير متاحة.')
      }

      const firstDeviceId = mapped[0].id
      setSelectedDeviceId(firstDeviceId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذّر تهيئة الماسح.'
      setError(message)
    } finally {
      setIsInitializing(false)
    }
  }

  const closeDialog = () => {
    setIsOpen(false)
    setError('')
    setCapturedDataUrl('')
    setDevices([])
    setSelectedDeviceId('')
    setIsSaving(false)
    stopStream()
  }

  useEffect(() => {
    if (!isOpen || !selectedDeviceId || capturedDataUrl) return

    let cancelled = false
    const startPreview = async () => {
      try {
        stopStream()
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
          }
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'تعذّر تشغيل معاينة الماسح.'
        setError(message)
      }
    }

    void startPreview()

    return () => {
      cancelled = true
    }
  }, [isOpen, selectedDeviceId, capturedDataUrl])

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, width, height)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedDataUrl(imageDataUrl)
    stopStream()
  }

  const handleRetake = () => {
    setCapturedDataUrl('')
    setError('')
  }

  const handleSave = async () => {
    if (!capturedDataUrl) return

    setIsSaving(true)
    setError('')
    try {
      const response = await fetch(capturedDataUrl)
      const blob = await response.blob()
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
      await onSave(file)
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل حفظ الصورة الممسوحة.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { void openDialog() }}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50'
        }`}
      >
        <ScanSearch size={18} />
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900" dir="rtl">{title}</h3>
              <button
                type="button"
                onClick={closeDialog}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" dir="rtl">
                  الأجهزة المتاحة
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={!hasDevices || !!capturedDataUrl || isInitializing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                {isInitializing ? (
                  <div className="h-64 flex items-center justify-center text-gray-600">
                    <Loader2 className="animate-spin ml-2" size={20} />
                    جاري تهيئة الماسح...
                  </div>
                ) : capturedDataUrl ? (
                  <img
                    src={capturedDataUrl}
                    alt="Scanned preview"
                    className="max-h-[440px] w-full object-contain rounded-lg bg-white"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-[440px] w-full object-contain rounded-lg bg-white"
                  />
                )}
              </div>

              {selectedLabel && (
                <p className="text-xs text-gray-500" dir="rtl">
                  الجهاز المحدد: {selectedLabel}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-600" dir="rtl">{error}</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
              {!capturedDataUrl ? (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!canCapture}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Camera size={17} />
                  التقاط
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    إعادة المسح
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleSave() }}
                    disabled={!canSave}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                    حفظ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
