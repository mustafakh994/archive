// Lightweight client for Schools search (survey backend)

export type SchoolSearchResult = {
  id: number
  name: string
  slug?: string
  category?: string
  city?: string
  district?: string
  hasCandidates?: boolean
  isOpenForVoting?: boolean
  votingStartsAt?: string | null
  votingEndsAt?: string | null
}

function getSchoolsApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_SCHOOLS_API_URL
  // Ensure base ends with /api
  if (envBase) return envBase.endsWith('/api') ? envBase : `${envBase}/api`
  // Fallback to production API used by survey_front
  const fallback = 'https://api.survey.hamaprov.net/api'
  return fallback
}

export async function searchSchools(
  name: string,
  options?: { cityId?: number; districtId?: number; signal?: AbortSignal }
): Promise<SchoolSearchResult[]> {
  if (!name || !name.trim()) return []
  const base = getSchoolsApiBase()
  const params = new URLSearchParams()
  params.set('name', name.trim())
  if (options?.cityId) params.set('cityId', String(options.cityId))
  if (options?.districtId) params.set('districtId', String(options.districtId))

  const url = `${base}/Schools/search?${params.toString()}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    signal: options?.signal,
    // Credentials not needed; public endpoint
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to search schools (${res.status}): ${text || res.statusText}`)
  }

  const data = await res.json().catch(() => [])
  // Backend returns an array of anonymous objects; coerce to expected shape
  return Array.isArray(data) ? (data as SchoolSearchResult[]) : []
}











