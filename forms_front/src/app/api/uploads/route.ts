import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const submissionId = formData.get('submissionId') as string
    const fieldId = formData.get('fieldId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!submissionId || !fieldId) {
      return NextResponse.json(
        { error: 'Missing submissionId or fieldId' },
        { status: 400 }
      )
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', submissionId, fieldId)
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = path.join(uploadDir, file.name)
    
    await writeFile(filepath, buffer)

    console.log(`File uploaded: ${filepath}`)

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      path: `/uploads/${submissionId}/${fieldId}/${file.name}`
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}


