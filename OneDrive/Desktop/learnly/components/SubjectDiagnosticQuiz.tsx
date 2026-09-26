/**
 * components/SubjectDiagnosticQuiz.tsx
 *
 * Subject-aware diagnostic quiz (replaces the Mathematics-specific
 * DiagnosticQuiz for Step 9+ multi-subject flow).
 *
 * Phase 1: Tests the subject's target concept (most advanced).
 *   Correct → student knows the target → transition to learning there.
 *   Incorrect → find root gap via findSubjectRootGap.
 *
 * Phase 2: Tests the identified root gap concept.
 *   Either way → fire onComplete callback with the gap concept.
 *
 * No BKT math here. No AI calls here. Purely uses the static
 * diagnosticQuestions defined in each SubjectDefinition.
 */

"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SubjectDefinition } from "@/lib/subjects";
import { findSubjectRootGap } from "@/lib/subjects";
import { CheckCircle2, XCircle, ChevronRight, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectDiagnosticResult {
  concept: string;   // the concept the student was tested on in the final phase
  correct: boolean;
  rootGap: string | null; // null if Phase 1 was correct (no gap found)
  phase: 1 | 2;
}

export interface SubjectDiagnosticQuizProps {
  subject: SubjectDefinition;
  /** pKnown values keyed by concept ID. Used for root-gap traversal. */
  pKnownMap: Record<string, number>;
  /** Called after Phase 1 (correct) or Phase 2 (any result). */
  onAnswer: (result: SubjectDiagnosticResult) => void;
  /** Lets the parent highlight concepts in the DAG as we identify gaps. */
  onHighlightConcept?: (conceptId: string | null) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Answer option button
// ---------------------------------------------------------------------------

function OptionButton({
  index,
  text,
  selected,
  revealed,
  correctIndex,
  disabled,
  onSelect,
}: {
  index: number;
  text: string;
  selected: boolean;
  revealed: boolean;
  correctIndex: number;
  disabled: boolean;
  onSelect: (i: number) => void;
}) {
  const label = String.fromCharCode(65 + index);
  const isCorrect = index === correctIndex;

  let stateClass: string;
  if (!revealed) {
    stateClass = cn(
      "border-stone-700 bg-stone-900/50 text-stone-300",
      "hover:border-amber-600/50 hover:bg-amber-900/20 hover:text-stone-100",
      selected && "border-amber-500/70 bg-amber-900/30 text-stone-100 ring-1 ring-amber-500/30",
    );
  } else if (isCorrect) {
    stateClass = "border-emerald-600/50 bg-emerald-900/30 text-emerald-200";
  } else if (selected && !isCorrect) {
    stateClass = "border-red-700/50 bg-red-900/20 text-red-300 line-through";
  } else {
    stateClass = "border-stone-800 bg-stone-900/20 text-stone-600";
  }

  return (
    <button
      type="button"
      id={`diag-opt-${index}`}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Option ${label}: ${text}`}
      onClick={() => onSelect(index)}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        "disabled:cursor-not-allowed",
        stateClass,
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors",
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
      {revealed && isCorrect && <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />}
      {revealed && selected && !isCorrect && <XCircle size={16} className="shrink-0 text-red-400" aria-hidden="true" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Phase panel (renders one diagnostic question)
// ---------------------------------------------------------------------------

function QuestionPanel({
  phase,
  question,
  conceptLabel,
  onSubmit,
  onContinue,
}: {
  phase: 1 | 2;
  question: SubjectDefinition["diagnosticQuestions"][string];
  conceptLabel: string;
  onSubmit: (selectedIndex: number, correct: boolean) => void;
  onContinue: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleSubmit() {
    if (selected === null || revealed) return;
    const correct = selected === question.correctIndex;
    setRevealed(true);
    onSubmit(selected, correct);
  }

  const isCorrect = revealed && selected === question.correctIndex;

  return (
    <div className="space-y-5">
      {/* Phase label */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">
          Phase {phase} Diagnostic — {conceptLabel}
        </p>
        <p className="text-sm font-semibold leading-relaxed text-stone-100 sm:text-base" id="diag-question-text">
          {question.text}
        </p>
      </div>

      {/* Options */}
      <fieldset
        aria-labelledby="diag-question-text"
        disabled={revealed}
        className="space-y-2"
      >
        <legend className="sr-only">Answer options</legend>
        {question.options.map((opt, i) => (
          <OptionButton
            key={i}
            index={i}
            text={opt}
            selected={selected === i}
            revealed={revealed}
            correctIndex={question.correctIndex}
            disabled={revealed}
            onSelect={setSelected}
          />
        ))}
      </fieldset>

      {/* Feedback */}
      {revealed && (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "rounded-xl border p-4 space-y-2",
            isCorrect ? "border-emerald-700/40 bg-emerald-900/20" : "border-amber-700/40 bg-amber-900/15",
          )}
        >
          <div className="flex items-center gap-2">
            {isCorrect
              ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
              : <XCircle size={18} className="text-amber-400 shrink-0" aria-hidden="true" />}
            <p className={cn("font-semibold text-sm", isCorrect ? "text-emerald-300" : "text-amber-300")}>
              {isCorrect
                ? phase === 1 ? "Great — you know this topic!" : "Well done! Let's start learning from here."
                : phase === 1 ? "Let's find where to start your learning path." : "Found your starting point!"}
            </p>
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex justify-end">
        {!revealed ? (
          <button
            type="button"
            id="diag-submit-btn"
            disabled={selected === null}
            onClick={handleSubmit}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
              "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              selected !== null
                ? "bg-stone-100 text-stone-900 hover:bg-white shadow-md"
                : "bg-stone-800 text-stone-600 cursor-not-allowed",
            )}
          >
            Submit Answer
          </button>
        ) : (
          <button
            type="button"
            id="diag-continue-btn"
            onClick={onContinue}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {isCorrect ? (phase === 1 ? "Start Learning" : "Continue") : (phase === 1 ? "Find My Starting Point" : "Begin Lesson")}
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion panel
// ---------------------------------------------------------------------------

function CompletionPanel({
  rootGapLabel,
  onStart,
}: {
  rootGapLabel: string;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6 text-center py-4">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">
          Diagnostic Complete
        </p>
        <p className="text-2xl font-bold text-stone-100">Your starting point:</p>
        <p className="text-3xl font-bold text-amber-400">{rootGapLabel}</p>
        <p className="text-sm text-stone-500 max-w-sm mx-auto">
          Learnly will build from here, progressively unlocking concepts as you master each one.
        </p>
      </div>
      <button
        type="button"
        id="diag-start-btn"
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        Start Learning
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type DiagPhase = "phase1" | "waiting-root-gap" | "phase2" | "done";

export default function SubjectDiagnosticQuiz({
  subject,
  pKnownMap,
  onAnswer,
  onHighlightConcept,
  className,
}: SubjectDiagnosticQuizProps) {
  const [diagPhase, setDiagPhase] = useState<DiagPhase>("phase1");
  const [rootGap, setRootGap] = useState<string | null>(null);
  const [processingRootGap, setProcessingRootGap] = useState(false);
  const [p1WasCorrect, setP1WasCorrect] = useState(false);

  const targetQuestion = subject.diagnosticQuestions[subject.targetConceptId];
  const targetLabel = subject.concepts.find((c) => c.id === subject.targetConceptId)?.label ?? subject.targetConceptId;

  // Root gap concept details
  const rootGapLabel = rootGap
    ? (subject.concepts.find((c) => c.id === rootGap)?.label ?? rootGap)
    : targetLabel;
  const rootGapQuestion = rootGap ? subject.diagnosticQuestions[rootGap] : null;

  // ---------------------------------------------------------------------------
  // Phase 1 submit handler
  // ---------------------------------------------------------------------------
  const handlePhase1Submit = useCallback(
    (_selected: number, correct: boolean) => {
      setP1WasCorrect(correct);
      if (correct) {
        // Student knows the target → no gap found at this level
        onAnswer({ concept: subject.targetConceptId, correct: true, rootGap: null, phase: 1 });
      }
      // If incorrect, we wait for the "Find My Starting Point" button to compute root gap
    },
    [subject.targetConceptId, onAnswer],
  );

  // ---------------------------------------------------------------------------
  // Phase 1 continue handler
  // ---------------------------------------------------------------------------
  const handlePhase1Continue = useCallback(() => {
    if (p1WasCorrect) {
      // Transition directly — parent already received onAnswer
      setDiagPhase("done");
      return;
    }

    // Compute root gap using lib/subjects.ts traversal
    setProcessingRootGap(true);
    setDiagPhase("waiting-root-gap");

    // Use setTimeout to keep the UI responsive
    setTimeout(() => {
      const gap = findSubjectRootGap(subject, pKnownMap);
      const resolvedGap = gap ?? subject.targetConceptId;
      setRootGap(resolvedGap);
      onHighlightConcept?.(resolvedGap);
      setProcessingRootGap(false);
      setDiagPhase("phase2");
    }, 600);
  }, [p1WasCorrect, subject, pKnownMap, onHighlightConcept]);

  // ---------------------------------------------------------------------------
  // Phase 2 submit handler
  // ---------------------------------------------------------------------------
  const handlePhase2Submit = useCallback(
    (_selected: number, correct: boolean) => {
      const gap = rootGap ?? subject.targetConceptId;
      onAnswer({ concept: gap, correct, rootGap: gap, phase: 2 });
    },
    [rootGap, subject.targetConceptId, onAnswer],
  );

  // ---------------------------------------------------------------------------
  // Phase 2 continue handler
  // ---------------------------------------------------------------------------
  const handlePhase2Continue = useCallback(() => {
    setDiagPhase("done");
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!targetQuestion) {
    return (
      <div className="text-sm text-stone-500">
        No diagnostic question configured for {targetLabel}.
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {diagPhase === "phase1" && (
        <QuestionPanel
          phase={1}
          question={targetQuestion}
          conceptLabel={targetLabel}
          onSubmit={handlePhase1Submit}
          onContinue={handlePhase1Continue}
        />
      )}

      {(diagPhase === "waiting-root-gap" || processingRootGap) && (
        <div className="flex flex-col items-center py-10 gap-4">
          <Loader2 size={24} className="animate-spin text-amber-600" aria-hidden="true" />
          <p className="text-sm text-stone-500">Identifying your starting point…</p>
        </div>
      )}

      {diagPhase === "phase2" && rootGapQuestion && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-800/30 bg-amber-900/10 p-3">
            <p className="text-xs text-amber-500">
              Let&apos;s check a prerequisite concept to confirm where to start.
            </p>
          </div>
          <QuestionPanel
            phase={2}
            question={rootGapQuestion}
            conceptLabel={rootGapLabel}
            onSubmit={handlePhase2Submit}
            onContinue={handlePhase2Continue}
          />
        </div>
      )}

      {diagPhase === "done" && (
        <CompletionPanel
          rootGapLabel={p1WasCorrect ? targetLabel : rootGapLabel}
          onStart={() => {
            /* parent transitions via onAnswer callback already fired */
          }}
        />
      )}
    </div>
  );
}
