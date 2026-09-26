/**
 * app/learn/page.tsx — Subject home  /learn
 *
 * Server Component — reads authenticated user from Supabase server client
 * and passes email to the nav for the UserMenu.
 *
 * Middleware guarantees this page is only reachable when authenticated.
 */

import type { Metadata } from "next";
import Link from "next/link";
import LearnlyNav from "@/components/LearnlyNav";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Choose a Subject",
  description:
    "Choose a subject and Learnly will adapt your learning path to what you actually know.",
};

// ---------------------------------------------------------------------------
// Subject catalogue
// ---------------------------------------------------------------------------

const AVAILABLE_SUBJECTS = [
  {
    id: "adsa",
    code: "ADSA",
    name: "Advanced Data Structures & Algorithms",
    description:
      "Dynamic programming, graph algorithms, trees, and beyond. Adaptive mastery from gaps up.",
    href: "/learn/adsa",
    accent: "#c8892a",
  },
  {
    id: "at",
    code: "AT",
    name: "Automata Theory",
    description:
      "DFA, NFA, PDA, Turing machines, and formal languages. Build rigorous theoretical foundations.",
    href: "/learn/at",
    accent: "#4a8c6a",
  },
  {
    id: "dbms",
    code: "DBMS",
    name: "Database Management Systems",
    description:
      "Normalization, SQL, transactions, indexing, and query optimization. From foundations to fluency.",
    href: "/learn/dbms",
    accent: "#5a7aa8",
  },
] as const;

const COMING_SOON = [
  { code: "AMT", name: "Analog & Mixed-signal Theory" },
  { code: "Java", name: "Java Programming" },
  { code: "SQL", name: "Advanced SQL" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LearnHome() {
  // Read authenticated user (null when Supabase is not yet configured)
  const supabase = await getSupabaseServerClient();
  const userEmail = supabase
    ? (await supabase.auth.getUser()).data.user?.email ?? undefined
    : undefined;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <LearnlyNav variant="learn" userEmail={userEmail} />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        {/* ── Heading ── */}
        <div className="mb-14 animate-fade-up">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600 mb-4">
            Step 1
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-100 sm:text-4xl lg:text-5xl">
            What are you learning?
          </h1>
          <p className="mt-4 max-w-lg text-sm text-stone-500 leading-relaxed sm:text-base">
            Choose a subject and Learnly will adapt your learning path to what
            you actually know.
          </p>
        </div>

        {/* ── Available subjects ── */}
        <section aria-labelledby="subjects-heading">
          <h2 id="subjects-heading" className="sr-only">
            Available subjects
          </h2>

          <ul className="space-y-3 mb-10" role="list">
            {AVAILABLE_SUBJECTS.map((subject, i) => (
              <li
                key={subject.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Link
                  href={subject.href}
                  id={`subject-card-${subject.id}`}
                  className={cn(
                    "group relative flex items-center gap-5 rounded-2xl border border-stone-800/60",
                    "bg-stone-900/30 px-6 py-5 sm:px-7 sm:py-6",
                    "subject-card",
                    "hover:border-stone-700 hover:bg-stone-900/60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                    "transition-colors duration-200",
                  )}
                  aria-label={`Start learning ${subject.name}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span
                        className="text-xs font-bold tracking-wider"
                        style={{ color: subject.accent }}
                      >
                        {subject.code}
                      </span>
                      <span className="text-[9px] text-stone-700 font-medium uppercase tracking-widest">
                        Available
                      </span>
                    </div>
                    <p className="text-base font-semibold text-stone-200 sm:text-lg leading-tight">
                      {subject.name}
                    </p>
                    <p className="mt-1.5 text-sm text-stone-600 leading-relaxed line-clamp-2">
                      {subject.description}
                    </p>
                  </div>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-stone-700 transition-all duration-200 group-hover:text-stone-400 group-hover:translate-x-1"
                    aria-hidden="true"
                  />

                  <div
                    className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: subject.accent }}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* Coming soon */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-700 mb-3 px-1">
              Coming soon
            </p>
            <ul className="flex flex-wrap gap-2" role="list" aria-label="Coming soon subjects">
              {COMING_SOON.map((s) => (
                <li key={s.code}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-stone-800/40",
                      "bg-stone-900/20 px-4 py-2.5",
                      "opacity-40 cursor-not-allowed select-none",
                    )}
                    aria-label={`${s.name} — coming soon`}
                    role="status"
                  >
                    <Lock size={10} className="text-stone-700" aria-hidden="true" />
                    <span className="text-xs font-semibold text-stone-600">{s.code}</span>
                    <span className="hidden sm:inline text-xs text-stone-700">{s.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
