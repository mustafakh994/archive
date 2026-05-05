import { NextRequest, NextResponse } from 'next/server'

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  return configured.endsWith('/api') ? configured : `${configured}/api`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params
    const apiBase = getApiBaseUrl()
    const upstreamUrl = `${apiBase}/Files/download/by-name/${encodeURIComponent(fileName)}`

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: request.headers.get('accept') || '*/*',
      },
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('Content-Disposition') || 'inline',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('File proxy by-name download failed:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
