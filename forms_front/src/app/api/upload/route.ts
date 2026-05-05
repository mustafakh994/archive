import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'
import { encryptAttachmentBuffer, isAttachmentEncryptionEnabled } from '@/lib/attachment-crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('file').filter((entry): entry is File => entry instanceof File)
    const submissionId = formData.get('submissionId') as string
    const fieldId = formData.get('fieldId') as string

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!submissionId || !fieldId) {
      return NextResponse.json({ error: 'Missing submissionId or fieldId' }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'production' && !process.env.ATTACHMENT_ENCRYPTION_KEY_BASE64?.trim()) {
      return NextResponse.json(
        {
          error:
            'تشفير المرفقات مطلوب في الإنتاج. عيّن ATTACHMENT_ENCRYPTION_KEY_BASE64 (نفس AttachmentEncryption:KeyBase64 في API).',
          success: false,
        },
        { status: 503 }
      )
    }

    if (!isAttachmentEncryptionEnabled()) {
      return NextResponse.json(
        { error: 'تعذّر تهيئة التشفير.', success: false },
        { status: 503 }
      )
    }

    // NOTE:
    // يتم تخزين الملفات مباشرة داخل data/uploads_private بدون مجلد فرعي لكل submissionId.
    // يبقى submissionId مستخدمًا فقط كمعرّف منطقي في الرابط/الـ DB وليس كجزء من مسار النظام.
    const uploadDir = join(process.cwd(), 'data', 'uploads_private')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        // Keep human-readable name for UI/download only, but store encrypted bytes under an opaque name.
        const originalName = file.name.replace(/[^a-zA-Z0-9._\u0600-\u06FF\-]/g, '_')
        const timestamp = Date.now()
        const storageName = `aenc_${timestamp}_${crypto.randomUUID().replace(/-/g, '')}.aenc`
        const filePath = join(uploadDir, storageName)

        const bytes = await file.arrayBuffer()
        const plain = Buffer.from(bytes)
        const toWrite = encryptAttachmentBuffer(plain)

        await writeFile(filePath, toWrite)

        // file = original display/download name, stored = encrypted blob filename on disk.
        const url = `/api/attachments/download?submissionId=${encodeURIComponent(submissionId)}&file=${encodeURIComponent(originalName)}&stored=${encodeURIComponent(storageName)}`

        console.log(`File saved (private, encrypted): ${filePath}`)

        return {
          url,
          filename: originalName,
          storedFilename: storageName,
          size: file.size,
        }
      })
    )

    const firstFile = uploadedFiles[0]
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      // Backward compatibility for callers that still expect single-file fields.
      url: firstFile?.url,
      filename: firstFile?.filename,
      storedFilename: firstFile?.storedFilename,
      size: firstFile?.size,
      message: uploadedFiles.length === 1 ? 'File uploaded successfully' : `${uploadedFiles.length} files uploaded successfully`,
    })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: errorMessage, success: false }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
