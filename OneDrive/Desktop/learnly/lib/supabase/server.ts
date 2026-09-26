/**
 * lib/supabase/server.ts
 *
 * Server-side Supabase client (used in Server Components and Route Handlers).
 * Uses @supabase/ssr's createServerClient with Next.js cookies() for sessions.
 *
 * Returns null when Supabase is not yet configured (env vars are placeholders)
 * so callers can gracefully degrade instead of crashing.
 *
 * Must be called once per request — do not cache across requests.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** True only when both Supabase env vars look like real values. */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url.startsWith("https://") && key.length > 20;
}

export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll throws in Server Components — safe to ignore
            // (proxy handles session refresh in that case)
          }
        },
      },
    },
  );
}
