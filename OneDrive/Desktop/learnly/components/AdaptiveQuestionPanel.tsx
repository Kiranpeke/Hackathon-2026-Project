/**
 * components/AdaptiveQuestionPanel.tsx
 *
 * Renders one AI-generated adaptive question with:
 *   – 4 answer choices (A/B/C/D)
 *   – Submit Answer button
 *   – Correct / Incorrect feedback + structured solution after submission
 *   – Updated mastery % and difficulty tier
 *   – "Next Question" button after feedback
 *
 * All data flows in through props — no BKT math happens here.
 * The parent calls observeCorrect / observeIncorrect and passes results back.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AdaptiveQuestion } from "@/lib/api";
import type { BKTState } from "@/lib/bkt";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnswerState = "idle" | "correct" | "incorrect";

export interface AdaptiveQuestionPanelProps {
  question: AdaptiveQuestion;
  /** BKT state AFTER submission (used for feedback display). Null while idle. */
  postAnswerBKT: BKTState | null;
  /** Called when the student submits — parent handles BKT update. */
  onSubmit: (selectedIndex: number, correct: boolean) => void;
  /** Called when the student wants the next question. */
  onNextQuestion: () => void;
  /** True while the next question is being generated. */
  loadingNext: boolean;
  /** Number of questions answered so far (for display). */
  questionsAnswered: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Option button
// ---------------------------------------------------------------------------

function OptionButton({
  index,
  text,
  selected,
  answerState,
  correctIndex,
  disabled,
  onSelect,
}: {
  index: number;
  text: string;
  selected: boolean;
  answerState: AnswerState;
  correctIndex: number;
  disabled: boolean;
  onSelect: (i: number) => void;
}) {
  const revealed = answerState !== "idle";
  const isCorrect = index === correctIndex;
  const label = String.fromCharCode(65 + index); // A B C D

  let stateClasses: string;
  if (!revealed) {
    stateClasses = cn(
      "border-stone-700 bg-stone-900/50 text-stone-300",
      "hover:border-amber-600/50 hover:bg-amber-900/20 hover:text-stone-100",
      selected && "border-amber-500/70 bg-amber-900/30 text-stone-100 ring-1 ring-amber-500/30",
    );
  } else if (isCorrect) {
    stateClasses = "border-emerald-600/50 bg-emerald-900/30 text-emerald-200";
  } else if (selected && !isCorrect) {
    stateClasses = "border-red-700/50 bg-red-900/20 text-red-300 line-through";
  } else {
    stateClasses = "border-stone-800 bg-stone-900/20 text-stone-600";
  }

  return (
    <button
      type="button"
      id={`aq-option-${index}`}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Option ${label}: ${text}${revealed && isCorrect ? " — Correct answer" : ""}`}
      onClick={() => onSelect(index)}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-sm",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        "disabled:cursor-not-allowed",
        stateClasses,
      )}
    >
      {/* Letter badge */}
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
          "border transition-colors",
          !revealed && "border-stone-600 text-stone-500",
          !revealed && selected && "border-amber-500 text-amber-400",
          revealed && isCorrect && "border-emerald-500 text-emerald-400",
          revealed && selected && !isCorrect && "border-red-500 text-red-400",
          revealed && !isCorrect && !selected && "border-stone-700 text-stone-700",
        )}
        aria-hidden="true"
      >
        {label}
      </span>

      <span className="flex-1 font-medium leading-snug">{text}</span>

      {revealed && isCorrect && (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />
      )}
      {revealed && selected && !isCorrect && (
        <XCircle size={16} className="shrink-0 text-red-400" aria-hidden="true" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdaptiveQuestionPanel({
  question,
  postAnswerBKT,
  onSubmit,
  onNextQuestion,
  loadingNext,
  questionsAnswered,
  className,
}: AdaptiveQuestionPanelProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  const submitted = answerState !== "idle";

  function handleSubmit() {
    if (selected === null || submitted) return;
    const correct = selected === question.correct_index;
    setAnswerState(correct ? "correct" : "incorrect");
    onSubmit(selected, correct);
  }

  function handleNext() {
    setSelected(null);
    setAnswerState("idle");
    onNextQuestion();
  }

  const masteryPct = postAnswerBKT ? Math.round(postAnswerBKT.pKnown * 100) : null;

  return (
    <section
      className={cn("space-y-6", className)}
      aria-label="Adaptive practice question"
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            Practice · Question {questionsAnswered + 1}
          </p>
          <p
            id="aq-question-text"
            className="mt-2 text-base font-semibold leading-relaxed text-stone-100 sm:text-lg"
          >
            {question.question}
          </p>
        </div>
      </div>

      {/* ── Options ── */}
      <fieldset
        aria-labelledby="aq-question-text"
        disabled={submitted}
        className="space-y-2.5"
      >
        <legend className="sr-only">Answer options</legend>
        {question.options.map((opt, i) => (
          <OptionButton
            key={i}
            index={i}
            text={opt}
            selected={selected === i}
            answerState={answerState}
            correctIndex={question.correct_index}
            disabled={submitted}
            onSelect={setSelected}
          />
        ))}
      </fieldset>

      {/* ── Feedback ── */}
      {submitted && (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "rounded-xl border p-5 space-y-4 transition-all duration-300",
            answerState === "correct"
              ? "border-emerald-700/40 bg-emerald-900/20"
              : "border-red-800/40 bg-red-900/15",
          )}
        >
          {/* Result header */}
          <div className="flex items-center gap-3">
            {answerState === "correct" ? (
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle size={20} className="text-red-400 shrink-0" aria-hidden="true" />
            )}
            <p
              className={cn(
                "font-bold text-base",
                answerState === "correct" ? "text-emerald-300" : "text-red-300",
              )}
            >
              {answerState === "correct" ? "Correct!" : "Not quite."}
            </p>
          </div>

          {/* Solution — structured WHY explanation */}
          <div className="space-y-3">
            {/* Summary */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-1">
                Why?
              </p>
              <p className="text-sm leading-relaxed text-stone-300">
                {question.solution.summary}
              </p>
            </div>

            {/* Reasoning steps */}
            {question.solution.steps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-2">
                  Solution
                </p>
                <ol className="space-y-1.5 pl-0" aria-label="Solution steps">
                  {question.solution.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-stone-400">
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-stone-500"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Updated mastery + difficulty */}
          {postAnswerBKT && (
            <div className="flex flex-wrap gap-4 pt-2 border-t border-stone-800">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-600">
                  Mastery
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-stone-200">
                  {masteryPct}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-stone-600">
                  Next difficulty
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-lg font-bold",
                    postAnswerBKT.difficulty === "Hard" && "text-red-400",
                    postAnswerBKT.difficulty === "Medium" && "text-amber-400",
                    postAnswerBKT.difficulty === "Easy" && "text-emerald-400",
                  )}
                >
                  {postAnswerBKT.difficulty}
                </p>
              </div>
              {postAnswerBKT.mastery && (
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-700/30">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    Mastered!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center justify-end gap-3">
        {!submitted ? (
          <button
            type="button"
            id="aq-submit-btn"
            disabled={selected === null}
            onClick={handleSubmit}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
              "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              selected !== null
                ? "bg-stone-100 text-stone-900 hover:bg-white shadow-md"
                : "bg-stone-800 text-stone-600 cursor-not-allowed",
            )}
            aria-disabled={selected === null}
          >
            Submit Answer
          </button>
        ) : (
          <button
            type="button"
            id="aq-next-btn"
            onClick={handleNext}
            disabled={loadingNext}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
              "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              "bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/30",
              loadingNext && "opacity-70 cursor-not-allowed",
            )}
            aria-label="Generate next adaptive question"
          >
            {loadingNext ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                Next Question
                <ChevronRight size={15} aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
