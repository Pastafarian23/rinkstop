import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher([
  '/dashboard(.*)',
  '/account(.*)',
  '/api/favorites(.*)',
  '/api/claims(.*)',
  '/api/support(.*)',
  '/api/profile(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();
  if (isProtected(request) && !session.userId) {
    return session.redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*', '/api/favorites/:path*', '/api/claims/:path*', '/api/support/:path*', '/profile/:path*'],
};
