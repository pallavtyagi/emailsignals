import { NextResponse, type NextRequest } from 'next/server';

export default function middleware(_request: NextRequest) {
  // Clerk auth is disabled — no valid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY found.
  // To enable auth, add your Clerk keys to .env.local and replace this
  // middleware with the Clerk version:
  //
  //   import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
  //   const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);
  //   export default clerkMiddleware(async (auth, req) => {
  //     if (!isPublicRoute(req)) await auth.protect();
  //   });

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
