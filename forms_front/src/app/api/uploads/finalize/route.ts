import { NextRequest, NextResponse } from 'next/server'
import { rename, access } from 'fs/promises'
import path from 'path'
import { constants } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { tempSubmissionId, actualSubmissionId } = await request.json()

    if (!tempSubmissionId || !actualSubmissionId) {
      return NextResponse.json(
        { error: 'Missing tempSubmissionId or actualSubmissionId' },
        { status: 400 }
      )
    }

    const tempDir = path.join(process.cwd(), 'uploads', tempSubmissionId)
    const actualDir = path.join(process.cwd(), 'uploads', actualSubmissionId)

    // Check if temp directory exists
    try {
      await access(tempDir, constants.F_OK)
    } catch {
      // Temp directory doesn't exist, nothing to move
      return NextResponse.json({
        success: true,
        message: 'No files to finalize'
      })
    }

    // Rename the directory from temp to actual submission ID
    await rename(tempDir, actualDir)

    console.log(`Moved files from ${tempSubmissionId} to ${actualSubmissionId}`)

    return NextResponse.json({
      success: true,
      message: 'Files finalized successfully',
      from: tempSubmissionId,
      to: actualSubmissionId
    })
  } catch (error) {
    console.error('Error finalizing file uploads:', error)
    return NextResponse.json(
      { error: 'Failed to finalize file uploads' },
      { status: 500 }
    )
  }
}


