/**
 * scoresheet/middleware.ts
 *
 * Clerk middleware for the scoresheet app. Same Clerk instance as
 * rinkstop.com. Protects /scoresheet/* routes (everything except the
 * landing page, sign-in, sign-up, and public share view).
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/watch/(.*)',         // public read-only share view
  '/manifest.json',
  '/icon-:size.png',
  '/sw.js',
  '/api/qr/(.*)',         // for QR generation on rinkstop.com to link here
]);

const isProtectedRoute = createRouteMatcher([
  '/scoresheet/(.*)',
  '/favorites',
  '/api/scoresheet/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
