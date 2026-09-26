/**
 * app/api/auth/callback/route.ts
 *
 * Supabase Auth callback handler — exchanges the code from the OAuth/magic-link
 * redirect for a session. Required for:
 *   - Email magic link sign-in
 *   - OAuth providers (Google, GitHub, etc.)
 *   - Email + password confirmation links
 *
 * Supabase redirects to: <origin>/api/auth/callback?code=<code>&next=<path>
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/learn";

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
    }
  }

  // Auth error — redirect to login with error param
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
