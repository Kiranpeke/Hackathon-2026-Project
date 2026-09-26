/**
 * app/page.tsx — Landing page  /
 *
 * Learnly landing page. Premium, calm, editorial.
 *
 * Visual influences (not copied):
 *   - Lusion: immersive atmosphere, depth, memorable interactive element
 *   - Dogstudio: generous whitespace, editorial typography, restrained motion
 *   - Henry Heffernan: warm neutrals, earthy palette, calm premium feel
 *
 * The hero interactive element: an animated "adaptive loop" visualisation
 * showing the ASSESS → UNDERSTAND → PRACTICE → ADAPT cycle.
 * It responds subtly to pointer movement (tilt effect) using CSS transforms.
 *
 * No fake testimonials. No pricing. No stock imagery.
 * No generic SaaS dashboard screenshots.
 */

import type { Metadata } from "next";
import Link from "next/link";
import LearnlyNav from "@/components/LearnlyNav";
import { AdaptiveLoopViz } from "@/components/AdaptiveLoopViz";

export const metadata: Metadata = {
  title: "Learning, personalized. | Learnly",
  description:
    "Learnly adapts to what you actually know. Your syllabus. Your gaps. Your learning path.",
};

// ---------------------------------------------------------------------------
// Static feature columns (concise — NOT a feature grid)
// ---------------------------------------------------------------------------

const PILLARS = [
  {
    label: "Assess",
    description: "A short diagnostic locates exactly where your understanding breaks down.",
  },
  {
    label: "Understand",
    description: "Targeted micro-lessons address only the concepts you need — nothing you already know.",
  },
  {
    label: "Practice",
    description: "Adaptive questions calibrate in difficulty as you answer, guided by Bayesian Knowledge Tracing.",
  },
  {
    label: "Adapt",
    description: "Every response updates your personal knowledge map. The path changes as you do.",
  },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* ── Navigation ── */}
      <LearnlyNav variant="landing" />

      {/* ── Hero ── */}
      <main className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center overflow-hidden"
        >
          {/* Subtle radial grain background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 40%, rgba(217,119,6,0.6) 0%, transparent 60%)",
            }}
            aria-hidden="true"
          />

          {/* Eyebrow */}
          <p
            className="animate-fade-up text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-6"
            aria-hidden="true"
          >
            Adaptive Learning Platform
          </p>

          {/* Main headline */}
          <h1
            id="hero-heading"
            className="animate-fade-up delay-1 hero-title text-stone-100 max-w-3xl"
          >
            Learning,{" "}
            <em className="not-italic" style={{ color: "var(--accent-light)" }}>
              personalized.
            </em>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up delay-2 mt-6 max-w-md text-base text-stone-500 leading-relaxed sm:text-lg">
            Your syllabus.&ensp;Your gaps.&ensp;Your learning path.
          </p>

          {/* CTA */}
          <div className="animate-fade-up delay-3 mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/learn"
              id="hero-cta"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-stone-100 px-8 py-3.5 text-sm font-semibold text-stone-900 shadow-xl shadow-stone-950/60 transition-all duration-200 hover:bg-white hover:shadow-2xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
            >
              Start Learning
              <svg
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 7h8M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* Interactive adaptive loop visualization */}
          <div className="animate-fade-up delay-4 mt-20 w-full max-w-lg mx-auto">
            <AdaptiveLoopViz />
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          aria-labelledby="how-heading"
          className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 sm:pb-32"
        >
          <div className="mb-14 text-center">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600"
              aria-hidden="true"
            >
              The adaptive loop
            </p>
            <h2
              id="how-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-stone-200 sm:text-3xl"
            >
              Not every student needs the same path.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm text-stone-500 leading-relaxed">
              Learnly doesn&apos;t hand you a syllabus and hope for the best.
              It finds where your understanding actually begins — then builds from there.
            </p>
          </div>

          <ol
            className="grid grid-cols-1 gap-px sm:grid-cols-4 rounded-2xl overflow-hidden border border-stone-800/60"
            aria-label="The four phases of adaptive learning"
          >
            {PILLARS.map((pillar, i) => (
              <li
                key={pillar.label}
                className="relative bg-stone-900/40 px-6 py-7 flex flex-col gap-3 hover:bg-stone-900/70 transition-colors duration-200"
              >
                <span
                  className="text-[10px] font-bold tabular-nums text-stone-700"
                  aria-hidden="true"
                >
                  0{i + 1}
                </span>
                <p className="text-base font-bold text-stone-200">{pillar.label}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{pillar.description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Bottom CTA band ── */}
        <section
          className="border-t border-stone-900 px-4 py-16 text-center"
          aria-label="Get started"
        >
          <p className="text-xs text-stone-600 uppercase tracking-widest mb-6">
            Three subjects. Fully adaptive.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-stone-500 mb-10">
            {["ADSA", "Automata Theory", "DBMS"].map((s) => (
              <span
                key={s}
                className="rounded-full border border-stone-800 px-4 py-1.5 text-xs font-medium text-stone-500"
              >
                {s}
              </span>
            ))}
          </div>
          <Link
            href="/learn"
            id="bottom-cta"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-6 py-3 text-sm font-semibold text-stone-300 hover:border-stone-500 hover:text-stone-100 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Choose a subject
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-900 px-4 py-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <p className="text-[10px] text-stone-700">
            © {new Date().getFullYear()} Learnly
          </p>
          <p className="text-[10px] text-stone-700">
            Adaptive · Personalized · AI-powered
          </p>
        </div>
      </footer>
    </div>
  );
}
