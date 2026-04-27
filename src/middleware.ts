import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage    = req.nextUrl.pathname.startsWith('/login')
  const isDashboard   = req.nextUrl.pathname.startsWith('/dashboard')
  const isApiRoute    = req.nextUrl.pathname.startsWith('/api')
  const isRoot        = req.nextUrl.pathname === '/'

  // Redirect root to dashboard or login
  if (isRoot) {
    return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', req.url))
  }

  // Protect dashboard routes
  if (isDashboard && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect logged-in users away from login
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/api/:path*'],
}
