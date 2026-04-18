import { deflateSync, inflateSync } from 'node:zlib'

export function compressJsonForArchiveSnap(obj: unknown): string {
  const input = Buffer.from(JSON.stringify(obj), 'utf8')
  return deflateSync(input, { level: 9 }).toString('base64url')
}

export function decompressArchiveSnap<T>(snap: string): T | null {
  try {
    const buf = inflateSync(Buffer.from(snap, 'base64url'))
    return JSON.parse(buf.toString('utf8')) as T
  } catch {
    return null
  }
}
