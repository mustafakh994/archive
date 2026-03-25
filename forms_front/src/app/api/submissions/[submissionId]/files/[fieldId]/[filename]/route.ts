import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string; fieldId: string; filename: string }> }
) {
  try {
    const { submissionId, fieldId, filename } = await params

    // Get the submission to verify it exists
    const submission = await prisma.formResponse.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        data: true,
        formId: true
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Verify the field exists in the submission data
    const submissionData = submission.data as any
    const fieldValue = submissionData[fieldId]

    console.log('Debug file download:', {
      submissionId,
      fieldId,
      filename,
      fieldValue,
      decodedFilename: decodeURIComponent(filename),
      submissionData: JSON.stringify(submissionData, null, 2)
    })

    // Check if the filename matches (try both encoded and decoded versions)
    const filenameMatches = fieldValue === filename || fieldValue === decodeURIComponent(filename)

    if (!fieldValue) {
      return NextResponse.json(
        { 
          error: 'Field not found in submission',
          debug: {
            fieldValue,
            filename,
            decodedFilename: decodeURIComponent(filename)
          }
        },
        { status: 404 }
      )
    }

    // If filename doesn't match exactly, try to find the file anyway
    if (!filenameMatches) {
      console.log('Filename mismatch, but trying to find file anyway')
    }

    // In a real implementation, files would be stored in a file storage service
    // like AWS S3, Azure Blob Storage, or local filesystem
    // For now, we'll create a placeholder response
    
    // Example file storage paths - adjust based on your setup:
    // Option 1: Local storage
    const uploadsDir = path.join(process.cwd(), 'uploads', submissionId, fieldId)
    const filePath = path.join(uploadsDir, filename)

    console.log('File path check:', {
      uploadsDir,
      filePath,
      exists: fs.existsSync(filePath),
      dirExists: fs.existsSync(uploadsDir)
    })

    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Read the file
      const fileBuffer = fs.readFileSync(filePath)
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase()
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.zip': 'application/zip'
      }
      const contentType = contentTypes[ext] || 'application/octet-stream'

      // Return the file
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600'
        }
      })
    }

    // If file doesn't exist with the exact filename, try to find it with the field value
    const fallbackFilePath = path.join(uploadsDir, fieldValue)
    console.log('Trying fallback path:', fallbackFilePath)
    
    if (fs.existsSync(fallbackFilePath)) {
      console.log('Found file with fallback path')
      const fileBuffer = fs.readFileSync(fallbackFilePath)
      
      // Determine content type based on file extension
      const ext = path.extname(fieldValue).toLowerCase()
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.zip': 'application/zip'
      }
      const contentType = contentTypes[ext] || 'application/octet-stream'

      // Return the file
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fieldValue)}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600'
        }
      })
    }

    // If file doesn't exist locally, return a helpful error
    return NextResponse.json(
      { 
        error: 'File not available for download',
        message: 'The file exists in the submission but is not stored on the server. Configure file storage to enable downloads.',
        submissionId,
        fieldId,
        filename,
        fieldValue,
        debug: {
          filePath,
          fallbackFilePath,
          fileExists: fs.existsSync(filePath),
          fallbackExists: fs.existsSync(fallbackFilePath)
        }
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

