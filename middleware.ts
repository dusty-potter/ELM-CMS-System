export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    // Protect everything except auth routes, public API, and Next.js internals
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)',
  ],
}
