import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * AES-256-GCM package (shared with aspforms AttachmentCryptoService):
 * Magic "AENC" (4) + version (1) + nonce (12) + ciphertext + tag (16).
 *
 * Production: set ATTACHMENT_ENCRYPTION_KEY_BASE64 = same as API AttachmentEncryption:KeyBase64.
 * Development: if unset, a key is auto-created at .cache/attachment-dev.key (gitignored).
 */
const MAGIC = Buffer.from('AENC', 'utf8')
const FORMAT_VERSION = 1
const NONCE_SIZE = 12
const TAG_SIZE = 16
const HEADER_SIZE = 4 + 1 + NONCE_SIZE

const DEV_KEY_REL = path.join('.cache', 'attachment-dev.key')

function devKeyPath(): string {
  return path.join(process.cwd(), DEV_KEY_REL)
}

function loadOrCreateDevKey(): Buffer {
  const keyFile = devKeyPath()
  const dir = path.dirname(keyFile)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  if (fs.existsSync(keyFile)) {
    const b64 = fs.readFileSync(keyFile, 'utf8').trim()
    const key = Buffer.from(b64, 'base64')
    if (key.length !== 32) {
      throw new Error(`Invalid ${DEV_KEY_REL}: must be Base64 of 32 bytes`)
    }
    return key
  }
  const key = crypto.randomBytes(32)
  fs.writeFileSync(keyFile, `${key.toString('base64')}\n`, { mode: 0o600 })
  console.info(
    `[attachment-crypto] Created dev encryption key at ${keyFile} (add ATTACHMENT_ENCRYPTION_KEY_BASE64 to share with API or other machines)`
  )
  return key
}

/** Resolves 32-byte key: env in prod or dev; dev file when env missing in non-production. */
function resolveKeyBuffer(): Buffer {
  const b64 = process.env.ATTACHMENT_ENCRYPTION_KEY_BASE64?.trim()
  if (b64) {
    const key = Buffer.from(b64, 'base64')
    if (key.length !== 32) {
      throw new Error('ATTACHMENT_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes')
    }
    return key
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ATTACHMENT_ENCRYPTION_KEY_BASE64 is required in production')
  }
  return loadOrCreateDevKey()
}

/** True if we can encrypt/decrypt (always in dev; in prod only when env is set). */
export function isAttachmentEncryptionEnabled(): boolean {
  if (process.env.ATTACHMENT_ENCRYPTION_KEY_BASE64?.trim()) return true
  if (process.env.NODE_ENV !== 'production') return true
  return false
}

export function encryptAttachmentBuffer(plain: Buffer): Buffer {
  const key = resolveKeyBuffer()
  const nonce = crypto.randomBytes(NONCE_SIZE)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, Buffer.from([FORMAT_VERSION]), nonce, encrypted, tag])
}

export function decryptAttachmentBuffer(packageBuf: Buffer): Buffer {
  const key = resolveKeyBuffer()
  if (packageBuf.length < HEADER_SIZE + TAG_SIZE) {
    throw new Error('Invalid encrypted package length')
  }
  if (!packageBuf.subarray(0, 4).equals(MAGIC) || packageBuf[4] !== FORMAT_VERSION) {
    throw new Error('Invalid encrypted package header')
  }
  const nonce = packageBuf.subarray(5, 5 + NONCE_SIZE)
  const tag = packageBuf.subarray(packageBuf.length - TAG_SIZE)
  const ciphertext = packageBuf.subarray(HEADER_SIZE, packageBuf.length - TAG_SIZE)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function looksLikeEncryptedAttachmentPackage(data: Buffer): boolean {
  return (
    data.length >= HEADER_SIZE + TAG_SIZE &&
    data.subarray(0, 4).equals(MAGIC) &&
    data[4] === FORMAT_VERSION
  )
}
