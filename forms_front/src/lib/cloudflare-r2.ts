import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { cloudflareR2Config } from '@/config/cloudflare-r2'

// For encryption at rest on R2 storage, enable server-side encryption (SSE) on the bucket in the
// Cloudflare dashboard (Object Lifecycle / default encryption) or use SSE-C via PutObject params.

// Initialize R2 client
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: cloudflareR2Config.endpoint,
  credentials: {
    accessKeyId: cloudflareR2Config.accessKeyId,
    secretAccessKey: cloudflareR2Config.secretAccessKey,
  },
})

export const BUCKET_NAME = cloudflareR2Config.bucketName
export const PUBLIC_URL = cloudflareR2Config.publicUrl

// File validation
const ALLOWED_FILE_TYPES = cloudflareR2Config.allowedFileTypes

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` 
    }
  }
  
  return { valid: true }
}

// Upload file to R2
export async function uploadFileToR2(
  file: File,
  submissionId: string,
  fieldId: string
): Promise<{ url: string; filename: string; size: number }> {
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Generate unique filename
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const fileExtension = file.name.split('.').pop()
  const uniqueFilename = `${timestamp}_${randomId}.${fileExtension}`
  
  // Create key for R2 storage
  const key = `submissions/${submissionId}/${fieldId}/${uniqueFilename}`
  
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        submissionId,
        fieldId,
        uploadedAt: new Date().toISOString(),
      },
    })
    
    await r2Client.send(command)
    
    return {
      url: `${PUBLIC_URL}/${key}`,
      filename: file.name, // Return original filename for display
      size: file.size,
    }
  } catch (error) {
    console.error('R2 upload error:', error)
    throw new Error('Failed to upload file to cloud storage')
  }
}

// Check if file exists in R2
export async function checkFileExists(
  submissionId: string,
  fieldId: string,
  filename: string
): Promise<{ exists: boolean; url?: string }> {
  try {
    // Try to find the file by checking metadata
    const key = `submissions/${submissionId}/${fieldId}/${filename}`
    
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    
    await r2Client.send(command)
    
    return {
      exists: true,
      url: `${PUBLIC_URL}/${key}`,
    }
  } catch (error) {
    return { exists: false }
  }
}

// Get file from R2 (for direct download)
export async function getFileFromR2(
  submissionId: string,
  fieldId: string,
  filename: string
): Promise<{ url: string; exists: boolean; error?: string }> {
  try {
    const key = `submissions/${submissionId}/${fieldId}/${filename}`
    
    // Check if file exists
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    
    await r2Client.send(headCommand)
    
    return {
      url: `${PUBLIC_URL}/${key}`,
      exists: true,
    }
  } catch (error) {
    console.error('R2 file check error:', error)
    return {
      url: '',
      exists: false,
      error: 'File not found in cloud storage',
    }
  }
}

// Delete file from R2 (for cleanup)
export async function deleteFileFromR2(
  submissionId: string,
  fieldId: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = `submissions/${submissionId}/${fieldId}/${filename}`
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: '', // Empty body to delete
    })
    
    await r2Client.send(command)
    
    return { success: true }
  } catch (error) {
    console.error('R2 delete error:', error)
    return {
      success: false,
      error: 'Failed to delete file from cloud storage',
    }
  }
}

// Get file info from R2
export async function getFileInfo(
  submissionId: string,
  fieldId: string,
  filename: string
): Promise<{ 
  exists: boolean; 
  size?: number; 
  contentType?: string; 
  lastModified?: Date;
  metadata?: Record<string, string>;
  error?: string;
}> {
  try {
    const key = `submissions/${submissionId}/${fieldId}/${filename}`
    
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    
    const response = await r2Client.send(command)
    
    return {
      exists: true,
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    }
  } catch (error) {
    console.error('R2 file info error:', error)
    return {
      exists: false,
      error: 'File not found in cloud storage',
    }
  }
}
