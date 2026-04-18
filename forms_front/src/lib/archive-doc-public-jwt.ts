import jwt from 'jsonwebtoken'

export type ArchiveDocJwtPayload = {
  sid: string
  doc: string
  form: string
  emp: string
  ad: string
  /** zlib-compressed JSON: `{ rows: { label, value }[], truncated?: boolean }` */
  snap?: string
}

export function signArchiveDocToken(payload: ArchiveDocJwtPayload, secret: string): string {
  const { snap, ...rest } = payload
  const claims = snap ? { ...rest, snap } : { ...rest }
  return jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: '3650d' })
}

export function verifyArchiveDocToken(token: string, secret: string): ArchiveDocJwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload & Partial<ArchiveDocJwtPayload>
    if (!decoded.sid) return null
    return {
      sid: String(decoded.sid),
      doc: decoded.doc !== undefined && decoded.doc !== null ? String(decoded.doc) : '—',
      form: String(decoded.form ?? ''),
      emp: String(decoded.emp ?? ''),
      ad: String(decoded.ad ?? ''),
      snap: typeof decoded.snap === 'string' && decoded.snap.length > 0 ? decoded.snap : undefined,
    }
  } catch {
    return null
  }
}
