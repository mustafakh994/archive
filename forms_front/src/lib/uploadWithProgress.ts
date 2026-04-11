/**
 * POST FormData with upload progress (fetch does not expose upload progress).
 */
export function uploadFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)), e.loaded, e.total)
      } else {
        onProgress(0, e.loaded, e.total)
      }
    }

    xhr.onload = () => {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>
      } catch {
        reject(new Error('استجابة غير صالحة من الخادم'))
        return
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        const msg = typeof data.error === 'string' ? data.error : xhr.statusText || 'فشل رفع الملف'
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => reject(new Error('خطأ في الشبكة أثناء الرفع'))
    xhr.ontimeout = () => reject(new Error('انتهت مهلة الرفع'))
    xhr.send(formData)
  })
}
