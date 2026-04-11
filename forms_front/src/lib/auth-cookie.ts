/**
 * Same-site cookie mirror of the JWT so browser navigations (new tab, <img>, address bar)
 * to /api/attachments/* send credentials. Matches localStorage token from useAuthStore.
 * Not HttpOnly (same XSS surface as persisting token in localStorage).
 */
export const AUTH_ACCESS_COOKIE = 'archive_at'

const MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days

export function syncAuthAccessCookie(token: string | null): void {
  if (typeof document === 'undefined') return

  const isProd = process.env.NODE_ENV === 'production'
  const secure = isProd ? '; Secure' : ''

  if (!token) {
    document.cookie = `${AUTH_ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`
    return
  }

  const value = encodeURIComponent(token)
  if (value.length > 3800) {
    console.warn('[auth-cookie] Token is very large; cookie may be rejected by the browser.')
  }

  document.cookie = `${AUTH_ACCESS_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
}
