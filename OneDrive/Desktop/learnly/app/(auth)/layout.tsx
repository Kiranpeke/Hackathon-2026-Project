/**
 * app/(auth)/layout.tsx
 *
 * Shared layout for auth pages: /login, /signup, /forgot-password, /reset-password
 *
 * Centres the auth card on screen with the warm stone background.
 * The (auth) route group keeps these pages out of the /learn URL tree
 * without nesting them under a visible path segment.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Brain } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Minimal nav — wordmark only */}
      <nav className="learnly-nav" aria-label="Site navigation">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
            aria-label="Learnly home"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 shadow-lg shadow-amber-900/40"
              aria-hidden="true"
            >
              <Brain size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-stone-100">Learnly</span>
          </Link>
        </div>
      </nav>

      {/* Centred card area */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 px-4 py-4 text-center">
        <p className="text-[10px] text-stone-700">
          © {new Date().getFullYear()} Learnly
        </p>
      </footer>
    </div>
  );
}
