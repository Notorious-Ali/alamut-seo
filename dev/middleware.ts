import { NextResponse, type NextRequest } from 'next/server'

type RedirectMatch = {
  destination: string
  statusCode: number
}

/**
 * Dev middleware demonstrating the plugin's public redirects endpoint.
 * Host apps copy this pattern (or use toNextRedirects in next.config).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname

  let match: RedirectMatch | null = null

  try {
    const response = await fetch(
      `http://localhost:3000/api/seo/redirects?path=${encodeURIComponent(path)}`,
      { cache: 'no-store' },
    )

    if (response.ok) {
      match = (await response.json()) as RedirectMatch
    }
  } catch {
    match = null
  }

  if (!match) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL(match.destination, request.url), match.statusCode)
}

export const config = {
  matcher: ['/old-page/:path*', '/legacy/:path*'],
}
