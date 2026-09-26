/**
 * components/LearnlyNav.tsx
 *
 * Minimal global navigation for all Learnly routes.
 *
 * Variants:
 *   "landing"  — Learnly wordmark + "Start Learning" CTA (right)
 *   "learn"    — Learnly + Home + Subjects + UserMenu
 *   "subject"  — Learnly + ← Subjects + [subject name] + UserMenu
 *
 * Lightweight — no external nav libs, no sidebar.
 * Mobile: collapses to wordmark + single action.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavVariant = "landing" | "learn" | "subject";

export interface LearnlyNavProps {
  variant: NavVariant;
  /** Subject short name to display in the breadcrumb (subject variant only). */
  subjectName?: string;
  /** Authenticated user's email — renders UserMenu when provided. */
  userEmail?: string;
  /** Extra class names forwarded to the nav element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Wordmark
// ---------------------------------------------------------------------------

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
      aria-label="Learnly home"
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 shadow-lg shadow-amber-900/40 shrink-0"
        aria-hidden="true"
      >
        <Brain size={14} className="text-white" />
      </div>
      <span className="text-sm font-bold tracking-tight text-stone-100">Learnly</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main nav
// ---------------------------------------------------------------------------

export default function LearnlyNav({ variant, subjectName, userEmail, className }: LearnlyNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "learnly-nav sticky top-0 z-30",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">

        {/* ── Left: wordmark ── */}
        <Wordmark />

        {/* ── Center / Right depending on variant ── */}
        <div className="flex items-center gap-2">
          {variant === "landing" && (
            <Link
              href="/learn"
              id="nav-start-learning"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold",
                "bg-stone-100 text-stone-900 hover:bg-white",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              )}
            >
              Start Learning
            </Link>
          )}

          {variant === "learn" && (
            <>
              <NavLink href="/learn" active={pathname === "/learn"}>
                Home
              </NavLink>
              <NavLink href="/learn" active={false}>
                Subjects
              </NavLink>
              {userEmail && <UserMenu email={userEmail} />}
            </>
          )}

          {variant === "subject" && (
            <>
              <Link
                href="/learn"
                id="nav-back-subjects"
                className={cn(
                  "flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300",
                  "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md",
                  "shrink-0",
                )}
                aria-label="Back to subjects"
              >
                <ChevronLeft size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Subjects</span>
              </Link>
              {subjectName && (
                <>
                  <span className="text-stone-700 text-xs" aria-hidden="true">/</span>
                  <span className="text-xs font-semibold text-stone-400 truncate max-w-[100px] sm:max-w-none">
                    {subjectName}
                  </span>
                </>
              )}
              {userEmail && <UserMenu email={userEmail} />}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// NavLink helper
// ---------------------------------------------------------------------------

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        active
          ? "bg-stone-800 text-stone-200"
          : "text-stone-500 hover:text-stone-300 hover:bg-stone-900",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
