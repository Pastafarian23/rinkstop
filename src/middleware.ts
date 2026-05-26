import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtected = [
  '/dashboard',
  '/account',
];

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isProtected.some(path => pathname.startsWith(path));
  
  if (isProtectedRoute && !userId) {
    const signInUrl = new URL('/login', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
};
