import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const submissionId = formData.get('submissionId') as string
    const fieldId = formData.get('fieldId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!submissionId || !fieldId) {
      return NextResponse.json({ error: 'Missing submissionId or fieldId' }, { status: 400 })
    }

    // Build upload directory: public/uploads/{submissionId}/
    const uploadDir = join(process.cwd(), 'public', 'uploads', submissionId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Sanitize the filename
    const originalName = file.name.replace(/[^a-zA-Z0-9._\u0600-\u06FF\-]/g, '_')
    const timestamp = Date.now()
    const filename = `${timestamp}_${fieldId}_${originalName}`
    const filePath = join(uploadDir, filename)

    // Write to disk
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Return a local URL the browser can access directly
    const url = `/uploads/${submissionId}/${filename}`
    
    console.log(`File saved locally: ${filePath}`)

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      message: 'File uploaded successfully'
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
