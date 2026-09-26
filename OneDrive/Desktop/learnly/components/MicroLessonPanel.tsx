/**
 * components/MicroLessonPanel.tsx
 *
 * Displays an AI-generated micro-lesson in an editorial layout.
 *
 * Receives a MicroLesson object (already fetched by the parent) and renders:
 *   – concept name as a large editorial heading
 *   – three key bullets
 *   – a worked example
 *
 * All data flows in through props — no AI calls here.
 */

"use client";

import { cn } from "@/lib/utils";
import type { MicroLesson } from "@/lib/api";
import { BookOpen, FlaskConical, ChevronRight } from "lucide-react";

interface MicroLessonPanelProps {
  lesson: MicroLesson;
  /** Extra class names forwarded to the root element. */
  className?: string;
  /** Called when the learner is ready to move to the practice question. */
  onReady?: () => void;
}

export default function MicroLessonPanel({
  lesson,
  className,
  onReady,
}: MicroLessonPanelProps) {
  return (
    <article
      className={cn("space-y-8", className)}
      aria-label={`Micro-lesson: ${lesson.concept}`}
    >
      {/* ── Concept name — large editorial heading ── */}
      <div className="space-y-2 border-b border-stone-800 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">
          Current Gap
        </p>
        <h2 className="text-4xl font-bold tracking-tight text-stone-100 sm:text-5xl">
          {lesson.concept}
        </h2>
        <p className="text-sm text-stone-500">
          Study this lesson, then answer the practice question below.
        </p>
      </div>

      {/* ── Three key ideas ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-amber-600" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            Three Key Ideas
          </p>
        </div>
        <ol className="space-y-3" aria-label="Key learning points">
          {lesson.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-4">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600/15 text-xs font-bold text-amber-500"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-stone-300">{bullet}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Worked example ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-teal-600" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            Worked Example
          </p>
        </div>
        <div className="rounded-xl border border-stone-700/60 bg-stone-900/60 p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
            {lesson.worked_example}
          </p>
        </div>
      </div>

      {/* ── CTA ── */}
      {onReady && (
        <div className="pt-2">
          <button
            type="button"
            id="lesson-ready-btn"
            onClick={onReady}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
              "bg-amber-600 text-white transition-all duration-200",
              "hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
              "shadow-lg shadow-amber-900/30",
            )}
            aria-label="Ready to practice — move to the adaptive question"
          >
            Ready to Practice
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </article>
  );
}
