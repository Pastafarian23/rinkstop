import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected routes - require Clerk session cookie
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/account')) {
    const clerkCookies = ['__session', '__clerk_session', 'clerk_session'];
    const hasSession = clerkCookies.some(name => request.cookies.get(name));

    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
};
