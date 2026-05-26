import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtected = createRouteMatcher([
  '/dashboard(.*)',
  '/account(.*)',
]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isProtected(request)) {
      return NextResponse.next();
    }

    const session = await auth();

    if (!session.userId) {
      return session.redirectToSignIn({ returnBackUrl: request.url });
    }

    return NextResponse.next();
  },
  {
    // Explicit keys so Clerk doesn't try to read from process.env
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/account/:path*',
    '/api/favorites/:path*',
    '/api/claims/:path*',
    '/api/support/:path*',
  ],
};
