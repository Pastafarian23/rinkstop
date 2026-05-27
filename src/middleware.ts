import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtected = createRouteMatcher([
  '/dashboard(.*)',
  '/account(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtected(request)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn({ returnBackUrl: request.url });
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
};
