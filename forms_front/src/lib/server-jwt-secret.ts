/**
 * Secret used to verify JWTs issued by the ASP.NET API (JwtSettings:SecretKey).
 * When JWT_SECRET is unset in Next.js, development falls back to the same default
 * as aspforms/appsettings.Development.json so local API + Next work together.
 */
const ASPNET_DEVELOPMENT_JWT_SECRET = 'DevelopmentSecretKeyThatIsAtLeast32CharactersLong!'

export function getJwtVerificationSecret(): string | null {
  const fromEnv = process.env.JWT_SECRET?.trim()
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV !== 'production') {
    return ASPNET_DEVELOPMENT_JWT_SECRET
  }
  return null
}
