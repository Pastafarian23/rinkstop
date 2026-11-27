/**
 * STAGING-ONLY signed-out Clerk stand-in.
 *
 * Active only when the build sets CLERK_STAGING_STUB=1 (see next.config.js),
 * and the build refuses to start when VERCEL_ENV=production. It never
 * authenticates anyone:
 *   - auth() always reports no user, so protected routes stay closed.
 *   - auth.protect() throws, so a route that relies on it fails closed.
 *   - clerkMiddleware() runs the app's own middleware with a signed-out auth.
 * Production never loads this file.
 */
import { createElement, Fragment, type ReactNode } from 'react';

type AnyProps = { children?: ReactNode; fallback?: ReactNode } & Record<string, unknown>;

// ---- client components / hooks (signed out) ----
export function ClerkProvider({ children }: AnyProps) {
  return createElement(Fragment, null, children);
}
export function Show({ fallback }: AnyProps) {
  return createElement(Fragment, null, fallback ?? null);
}
export function SignedIn() {
  return null;
}
export function SignedOut({ children }: AnyProps) {
  return createElement(Fragment, null, children ?? null);
}
export function UserButton() {
  return null;
}
export function UserProfile() {
  return null;
}
export function SignIn() {
  return null;
}
export function SignUp() {
  return null;
}
export function useUser() {
  return { isLoaded: true, isSignedIn: false, user: null };
}
export function useClerk() {
  return {
    signOut: async () => {},
    openSignIn: () => {},
    openSignUp: () => {},
    redirectToSignIn: () => {},
  };
}
export function useAuth() {
  return { isLoaded: true, isSignedIn: false, userId: null, sessionId: null, getToken: async () => null, signOut: async () => {} };
}

// ---- server helpers (signed out, fail closed) ----
const signedOutAuth = {
  userId: null,
  sessionId: null,
  orgId: null,
  sessionClaims: null,
  has: () => false,
  getToken: async () => null,
};
function protectFailsClosed(): never {
  throw new Error('auth.protect() called in signed-out staging stub: route must not be served');
}
export const auth = Object.assign(async () => signedOutAuth, {
  protect: protectFailsClosed,
});
export const clerkAuth = auth;
export async function currentUser() {
  return null;
}
export async function clerkClient() {
  return {
    users: {
      getUser: async () => {
        throw new Error('clerkClient in signed-out staging stub');
      },
    },
  };
}
export function createRouteMatcher() {
  return () => false;
}
/** Runs the app's own middleware with the signed-out auth object. */
export function clerkMiddleware(handler?: (auth: typeof auth, req: Request, evt?: unknown) => unknown) {
  return async (req: Request, evt?: unknown) => {
    if (!handler) return undefined;
    return handler(auth, req, evt);
  };
}
