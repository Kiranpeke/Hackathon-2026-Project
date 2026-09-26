/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client (used in Client Components).
 * Uses @supabase/ssr's createBrowserClient for proper cookie handling
 * with Next.js App Router.
 *
 * Singleton pattern — one client instance per browser tab.
 * Defers creation to first call so SSG prerender doesn't throw when
 * NEXT_PUBLIC_SUPABASE_URL contains a placeholder value.
 */

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Guard: don't instantiate during SSG when env vars are placeholders
  if (!url.startsWith("http")) {
    // Return a mock client shape that throws on use — safe for prerender
    // (the component using this is always "use client" so this branch
    //  only runs if somehow called server-side with invalid config)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. " +
      "Set it in .env.local before using Supabase Auth.",
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
