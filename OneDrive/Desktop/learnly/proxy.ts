/**
 * proxy.ts
 *
 * Next.js 16 Proxy (formerly "Middleware") — session refresh + route protection.
 *
 * Runs before every request to:
 *  1. Refresh the Supabase session cookie so it stays valid.
 *  2. Protect /learn and /learn/* — redirect unauthenticated to /login?next=<path>
 *  3. Redirect already-authenticated users away from /login and /signup to /learn
 *
 * Named export "proxy" is required by Next.js 16 (not "middleware").
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SUPABASE NOT YET CONFIGURED?
 * ──────────────────────────────────────────────────────────────────────────
 * When NEXT_PUBLIC_SUPABASE_URL is a placeholder ("YOUR_SUPABASE_PROJECT_URL"
 * or any non-HTTP string), the proxy skips auth entirely and passes all
 * requests through.  The app remains fully usable — auth just isn't active.
 *
 * To activate auth:
 *  1. Create a project at https://supabase.com
 *  2. Set real values in .env.local:
 *       NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *       NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
 *  3. Run supabase/schema.sql in the Supabase SQL editor.
 *  4. Add http://localhost:3000/api/auth/callback to Supabase Auth → Redirect URLs.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** True only when both Supabase env vars look like real values. */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url.startsWith("https://") && key.length > 20;
}

export async function proxy(request: NextRequest) {
  // ── Supabase not yet configured — pass through without auth check ─────────
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  // ── Supabase configured — run full session refresh + route protection ─────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — validates and refreshes the access token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protect /learn and /learn/* ──────────────────────────────────────────
  if (
    (pathname === "/learn" || pathname.startsWith("/learn/")) &&
    !user
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect authenticated users away from auth pages ───────────────────
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const next = request.nextUrl.searchParams.get("next") ?? "/learn";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - common image extensions
     * - /api/* (API routes handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
