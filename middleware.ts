import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require no authentication
const PUBLIC_PREFIXES = ['/auth', '/api/auth']

// Routes operators are allowed to access (in addition to public routes)
const OPERATOR_ALLOWED_PREFIXES = ['/intake', '/sites', '/api/intake', '/api/cms/sites', '/api/sites']

// Where operators land when they hit a restricted page
const OPERATOR_HOME = '/sites'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets and public routes — always allow
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = await getToken({ req })

  // Unauthenticated — redirect pages to sign-in, return 401 for API routes
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  const role = token.role as string

  // Operator role — restrict to allowed routes only
  if (role === 'operator') {
    const allowed = OPERATOR_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
    if (!allowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL(OPERATOR_HOME, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
