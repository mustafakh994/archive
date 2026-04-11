// Cloudflare R2 Configuration
// This file contains the R2 configuration with fallback values
// Replace the placeholder values with your actual R2 credentials

export const cloudflareR2Config = {
  // Cloudflare R2 Account ID
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || '36ed0de33a034403887922788e515d08',
  
  // R2 API Credentials
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '0a3891ae5d47b5bfa0e62e8a5c5731c2',
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '30543ce62ec6b5b5784dea1ba100fb1e47f230001e0065136c2bd0e7e2cee049',
  
  // Bucket Configuration
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'forms',
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-0be9bcd1f0c541b28f464584250977b3.r2.dev',
  
  // File Upload Settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ],
  
  // R2 Endpoint
  get endpoint() {
    return `https://${this.accountId}.r2.cloudflarestorage.com`
  },
  
  // Validation
  isValid(): boolean {
    return (
      this.accountId !== 'your_account_id' &&
      this.accessKeyId !== 'your_access_key_id' &&
      this.secretAccessKey !== 'your_secret_access_key' &&
      this.publicUrl !== 'https://pub-xxxxx.r2.dev'
    )
  }
}

// Export individual values for easy access
export const {
  accountId,
  accessKeyId,
  secretAccessKey,
  bucketName,
  publicUrl,
  maxFileSize,
  allowedFileTypes,
  endpoint,
  isValid
} = cloudflareR2Config
