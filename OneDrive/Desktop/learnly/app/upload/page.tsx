/**
 * app/upload/page.tsx — /upload
 *
 * Step 10 — Syllabus Upload page.
 *
 * Students upload their own syllabus (PDF, .txt, .md).
 * Gemini/Groq extracts concepts + prerequisites.
 * Result → personalized learning path at /learn/custom.
 *
 * Accessible from:
 *  - /learn subject selector page ("Upload your syllabus" card)
 *  - Direct navigation
 */

import type { Metadata } from "next";
import Link from "next/link";
import LearnlyNav from "@/components/LearnlyNav";
import SyllabusUploader from "@/components/SyllabusUploader";
import { ChevronLeft, FileText, Zap, GitBranch } from "lucide-react";

export const metadata: Metadata = {
  title: "Upload Syllabus",
  description:
    "Upload your course syllabus and Learnly will build a personalized adaptive learning path from your exact topics.",
};

const HOW_IT_WORKS = [
  {
    icon: FileText,
    label: "Upload",
    desc: "Drop in your syllabus — PDF, text file, or markdown.",
  },
  {
    icon: Zap,
    label: "Analyze",
    desc: "Gemini reads your syllabus and extracts every concept and prerequisite.",
  },
  {
    icon: GitBranch,
    label: "Learn",
    desc: "Your personalized concept graph feeds directly into the adaptive engine.",
  },
] as const;

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <LearnlyNav variant="learn" />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-400 transition-colors mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          <ChevronLeft size={12} aria-hidden="true" />
          Choose a subject instead
        </Link>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_400px]">
          {/* ── Left: heading + how it works ── */}
          <div>
            <div className="animate-fade-up mb-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-4">
                Your syllabus
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-stone-100 sm:text-4xl lg:text-5xl">
                Learn exactly what your course teaches.
              </h1>
              <p className="mt-5 max-w-md text-sm text-stone-500 leading-relaxed sm:text-base">
                Upload any course syllabus and Learnly will extract its concepts,
                map their dependencies, and build a learning path personalised to you —
                using the same adaptive engine as the demo subjects.
              </p>
            </div>

            {/* How it works */}
            <ol
              className="space-y-6"
              aria-label="How syllabus upload works"
            >
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.label}
                    className="flex items-start gap-4 animate-fade-up"
                    style={{ animationDelay: `${i * 80 + 100}ms` }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-800 bg-stone-900/60 mt-0.5">
                      <Icon size={14} className="text-amber-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-200">{step.label}</p>
                      <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Supported formats */}
            <div className="mt-10 flex flex-wrap gap-2">
              {[".txt", ".md"].map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-lg border border-stone-800/60 bg-stone-900/30 px-3 py-1.5 text-[10px] font-mono font-semibold text-stone-500"
                >
                  {fmt}
                </span>
              ))}
              <span className="rounded-lg border border-stone-800/60 bg-stone-900/30 px-3 py-1.5 text-[10px] text-stone-600">
                max 10 MB
              </span>
            </div>
          </div>

          {/* ── Right: upload panel ── */}
          <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="rounded-2xl border border-stone-800/60 bg-stone-900/30 p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-6">
                Upload your syllabus
              </p>
              <SyllabusUploader />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
