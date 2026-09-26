/**
 * components/DiagnosticQuiz.tsx
 *
 * Two-phase diagnostic assessment component.
 *
 * ─── Phase 1: High-level checkpoint ─────────────────────────────────────────
 * Presents one multiple-choice question for the target concept (default:
 * Quadratics). If the student answers correctly the session ends with a
 * mastery signal. If incorrect, `findRootGapNode` (lib/dag.ts) walks
 * backward through prerequisites and identifies the deepest foundational
 * concept below the mastery threshold.
 *
 * ─── Phase 2: Prerequisite diagnostic ───────────────────────────────────────
 * Presents a mock question for the identified root gap concept, collects the
 * student's answer, and reports the result through the `onAnswer` callback.
 *
 * IMPORTANT: No mastery values are hardcoded here.
 * All mastery data flows in through the `masteryData` prop.
 * No AI/Supabase calls are made.
 */

"use client";

import { useState, useCallback } from "react";
import {
  findRootGapNode,
  CONCEPTS,
  type ConceptId,
  type MasteryMap,
} from "@/lib/dag";
import { MASTERY_THRESHOLD } from "@/lib/bkt";
import { type ConceptMasteryMap } from "@/components/ConceptDAG";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Brain,
  Target,
  Lightbulb,
  RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiagnosticPhase = 1 | 2;
type AnswerState = "idle" | "correct" | "incorrect";

export interface DiagnosticResult {
  /** Which concept was assessed in this phase. */
  concept: ConceptId;
  /** Whether the student answered correctly. */
  correct: boolean;
  /** The deepest foundational gap found (null if Phase 1 was correct). */
  rootGap: ConceptId | null;
  /** Which diagnostic phase produced this result. */
  phase: DiagnosticPhase;
}

export interface DiagnosticQuizProps {
  /**
   * Current mastery data — drives `findRootGapNode`.
   * Must come from the parent; never hardcoded here.
   */
  masteryData: ConceptMasteryMap;
  /** Concept to assess in Phase 1. Defaults to "Quadratics". */
  targetConcept?: ConceptId;
  /** Called whenever a phase completes (correct or incorrect). */
  onAnswer?: (result: DiagnosticResult) => void;
  /**
   * Called when the quiz wants to highlight a concept in the parent's
   * ConceptDAG. Pass `null` to clear the highlight.
   */
  onHighlightConcept?: (id: ConceptId | null) => void;
  /** Extra class names forwarded to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Mock question bank
// ---------------------------------------------------------------------------

interface QuizQuestion {
  text: string;
  options: string[];
  /** Zero-based index of the correct option. */
  correctIndex: number;
}

const MOCK_QUESTIONS: Record<ConceptId, QuizQuestion> = {
  Algebra: {
    text: "What is 3 + 5?",
    options: ["6", "7", "8", "9"],
    correctIndex: 2,
  },
  Polynomials: {
    text: "Which expression is a polynomial?",
    options: ["x² + 2x + 1", "1/x", "√x + 1", "2^x"],
    correctIndex: 0,
  },
  Factoring: {
    text: "Which is the factored form of x² + 5x + 6?",
    options: ["(x+1)(x+6)", "(x+2)(x+3)", "(x-2)(x-3)", "(x+5)(x+1)"],
    correctIndex: 1,
  },
  Quadratics: {
    text: "What is the solution to x² - 5x + 6 = 0?",
    options: [
      "x = 1 or x = 6",
      "x = 2 or x = 3",
      "x = -2 or x = -3",
      "x = 0 or x = 5",
    ],
    correctIndex: 1,
  },
  Derivatives: {
    text: "What is the derivative of x²?",
    options: ["x", "2x", "x²", "2"],
    correctIndex: 1,
  },
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Converts `ConceptMasteryMap` (rich UI type) into `MasteryMap` (plain number
 * map) required by `findRootGapNode`.
 */
function toMasteryMap(data: ConceptMasteryMap): MasteryMap {
  const result: MasteryMap = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key as ConceptId] = val.mastery;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Option button for a multiple-choice question. */
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
  const isCorrect = index === correctIndex;
  const revealed = answerState !== "idle";

  const baseClasses = cn(
    "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium",
    "border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
    "disabled:cursor-not-allowed",
  );

  let stateClasses = "";
  if (!revealed) {
    stateClasses = cn(
      "border-white/10 bg-white/5 text-zinc-200",
      "hover:border-indigo-400/60 hover:bg-indigo-500/10",
      selected && "border-indigo-400/80 bg-indigo-500/20 text-white ring-1 ring-indigo-400/40",
    );
  } else if (isCorrect) {
    stateClasses =
      "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
  } else if (selected && !isCorrect) {
    stateClasses =
      "border-rose-500/60 bg-rose-500/15 text-rose-300 line-through";
  } else {
    stateClasses = "border-white/5 bg-white/3 text-zinc-500";
  }

  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

  return (
    <button
      type="button"
      id={`quiz-option-${index}`}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Option ${optionLabel}: ${text}${revealed && isCorrect ? " — Correct answer" : ""}`}
      onClick={() => onSelect(index)}
      className={cn(baseClasses, stateClasses)}
    >
      {/* Option label */}
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          "border",
          !revealed && "border-white/20 text-zinc-400",
          !revealed && selected && "border-indigo-400 text-indigo-300",
          revealed && isCorrect && "border-emerald-400 text-emerald-300",
          revealed && selected && !isCorrect && "border-rose-400 text-rose-400",
          revealed && !isCorrect && !selected && "border-zinc-600 text-zinc-600",
        )}
        aria-hidden="true"
      >
        {optionLabel}
      </span>

      <span className="flex-1">{text}</span>

      {/* Result icon */}
      {revealed && isCorrect && (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />
      )}
      {revealed && selected && !isCorrect && (
        <XCircle size={16} className="shrink-0 text-rose-400" aria-hidden="true" />
      )}
    </button>
  );
}

/** Feedback banner shown after submission. */
function FeedbackBanner({
  answerState,
  correctAnswer,
  conceptName,
  rootGap,
}: {
  answerState: AnswerState;
  correctAnswer: string;
  conceptName: string;
  rootGap?: ConceptId | null;
}) {
  if (answerState === "idle") return null;

  const isCorrect = answerState === "correct";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm",
        isCorrect
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/30 bg-rose-500/10 text-rose-200",
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isCorrect ? (
          <CheckCircle2 size={18} className="text-emerald-400" aria-hidden="true" />
        ) : (
          <XCircle size={18} className="text-rose-400" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-1">
        {isCorrect ? (
          <>
            <p className="font-semibold text-emerald-300">
              Correct! Great work on {conceptName}.
            </p>
            <p className="text-emerald-400/80 text-xs">
              You&apos;ve demonstrated understanding of this concept.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-rose-300">
              Not quite — the correct answer was{" "}
              <span className="font-bold">{correctAnswer}</span>.
            </p>
            {rootGap ? (
              <p className="text-rose-400/80 text-xs">
                Checking your prerequisite knowledge — starting with{" "}
                <span className="font-semibold text-rose-300">
                  {CONCEPTS[rootGap].label}
                </span>
                .
              </p>
            ) : (
              <p className="text-rose-400/80 text-xs">
                Let&apos;s review the prerequisite concepts.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase header
// ---------------------------------------------------------------------------

function PhaseHeader({
  phase,
  conceptId,
}: {
  phase: DiagnosticPhase;
  conceptId: ConceptId;
}) {
  const concept = CONCEPTS[conceptId];
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          phase === 1
            ? "bg-indigo-500/20 text-indigo-400"
            : "bg-amber-500/20 text-amber-400",
        )}
        aria-hidden="true"
      >
        {phase === 1 ? <Target size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
              phase === 1
                ? "bg-indigo-500/20 text-indigo-400"
                : "bg-amber-500/20 text-amber-400",
            )}
          >
            Phase {phase}
          </span>
          <span className="text-xs text-zinc-500">
            {phase === 1 ? "Checkpoint" : "Prerequisite Diagnostic"}
          </span>
        </div>
        <h3 className="mt-1 text-base font-bold text-zinc-100">
          {concept.label}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">{concept.description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question panel
// ---------------------------------------------------------------------------

interface QuestionPanelProps {
  phase: DiagnosticPhase;
  conceptId: ConceptId;
  question: QuizQuestion;
  selectedIndex: number | null;
  answerState: AnswerState;
  rootGap: ConceptId | null;
  processing: boolean;
  onSelect: (i: number) => void;
  onSubmit: () => void;
  onContinue: () => void;
  onReset: () => void;
}

function QuestionPanel({
  phase,
  conceptId,
  question,
  selectedIndex,
  answerState,
  rootGap,
  processing,
  onSelect,
  onSubmit,
  onContinue,
  onReset,
}: QuestionPanelProps) {
  const submitted = answerState !== "idle";
  const concept = CONCEPTS[conceptId];

  return (
    <div className="space-y-5">
      {/* Phase header */}
      <PhaseHeader phase={phase} conceptId={conceptId} />

      <hr className="border-white/5" />

      {/* Question text */}
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          <Lightbulb size={12} aria-hidden="true" />
          <span>Question</span>
        </div>
        <p
          id="quiz-question-text"
          className="text-base font-medium text-zinc-100 leading-relaxed"
        >
          {question.text}
        </p>
      </div>

      {/* Options */}
      <fieldset
        aria-labelledby="quiz-question-text"
        disabled={submitted || processing}
        className="space-y-2.5"
      >
        <legend className="sr-only">
          Answer options for: {question.text}
        </legend>
        {question.options.map((opt, i) => (
          <OptionButton
            key={i}
            index={i}
            text={opt}
            selected={selectedIndex === i}
            answerState={answerState}
            correctIndex={question.correctIndex}
            disabled={submitted || processing}
            onSelect={onSelect}
          />
        ))}
      </fieldset>

      {/* Feedback */}
      {submitted && (
        <FeedbackBanner
          answerState={answerState}
          correctAnswer={question.options[question.correctIndex]}
          conceptName={concept.label}
          rootGap={rootGap}
        />
      )}

      {/* Action row */}
      <div className="flex items-center justify-between gap-3">
        {/* Reset (always available) */}
        <button
          type="button"
          id="quiz-reset-btn"
          onClick={onReset}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
            "border border-white/10 text-zinc-400 transition-colors",
            "hover:border-white/20 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
          )}
          aria-label="Reset diagnostic quiz"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>

        <div className="flex gap-2">
          {!submitted ? (
            /* Submit */
            <button
              type="button"
              id="quiz-submit-btn"
              disabled={selectedIndex === null || processing}
              onClick={onSubmit}
              aria-disabled={selectedIndex === null || processing}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                selectedIndex !== null && !processing
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
                  : "bg-white/5 text-zinc-500 cursor-not-allowed",
              )}
            >
              {processing ? (
                <>
                  <span
                    className="h-3.5 w-3.5 rounded-full border-2 border-zinc-500 border-t-white animate-spin"
                    aria-hidden="true"
                  />
                  Checking…
                </>
              ) : (
                <>Submit</>
              )}
            </button>
          ) : (
            /* Continue / Next */
            answerState === "incorrect" && phase === 1 ? (
              <button
                type="button"
                id="quiz-continue-btn"
                onClick={onContinue}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
                  "bg-amber-600 text-white hover:bg-amber-500",
                  "transition-all duration-200 shadow-lg shadow-amber-500/25",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                )}
                aria-label="Continue to prerequisite diagnostic"
              >
                Check Prerequisites
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              /* Phase 2 done or Phase 1 correct — show completion state */
              null
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion panel
// ---------------------------------------------------------------------------

function CompletionPanel({
  phase1Correct,
  phase2Correct,
  rootGap,
  onReset,
}: {
  phase1Correct: boolean | null;
  phase2Correct: boolean | null;
  rootGap: ConceptId | null;
  onReset: () => void;
}) {
  const fullMastery = phase1Correct === true;
  const prerequisitePassed = phase2Correct === true;

  return (
    <div className="space-y-5 text-center">
      <div
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
          fullMastery
            ? "bg-emerald-500/20"
            : prerequisitePassed
              ? "bg-amber-500/20"
              : "bg-rose-500/20",
        )}
        aria-hidden="true"
      >
        {fullMastery ? (
          <CheckCircle2 size={32} className="text-emerald-400" />
        ) : prerequisitePassed ? (
          <Brain size={32} className="text-amber-400" />
        ) : (
          <AlertTriangle size={32} className="text-rose-400" />
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-zinc-100">
          {fullMastery
            ? "Diagnostic Complete!"
            : prerequisitePassed
              ? "Prerequisite Confirmed"
              : "Gap Identified"}
        </h3>
        <p className="mt-1.5 text-sm text-zinc-400">
          {fullMastery
            ? "You demonstrated mastery of the target concept. No prerequisite gaps found."
            : prerequisitePassed
              ? `You know your ${CONCEPTS[rootGap!]?.label ?? "prerequisite"} fundamentals. Reviewing higher-level concepts will help.`
              : `A foundational gap was identified in ${CONCEPTS[rootGap!]?.label ?? "a prerequisite concept"}. Addressing this first will unlock faster progress.`}
        </p>
      </div>

      {rootGap && !fullMastery && (
        <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-zinc-300 border border-white/10">
          <AlertTriangle size={14} className="text-amber-400" aria-hidden="true" />
          Root gap:{" "}
          <span className="font-semibold text-amber-300">
            {CONCEPTS[rootGap].label}
          </span>
        </div>
      )}

      <button
        type="button"
        id="quiz-restart-btn"
        onClick={onReset}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
          "border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white",
          "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        )}
        aria-label="Restart diagnostic quiz"
      >
        <RotateCcw size={14} aria-hidden="true" />
        Restart Diagnostic
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DiagnosticQuiz({
  masteryData,
  targetConcept = "Quadratics",
  onAnswer,
  onHighlightConcept,
  className,
}: DiagnosticQuizProps) {
  // ── Phase tracking ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<DiagnosticPhase>(1);
  const [done, setDone] = useState(false);

  // ── Phase 1 state ─────────────────────────────────────────────────────────
  const [p1Selected, setP1Selected] = useState<number | null>(null);
  const [p1AnswerState, setP1AnswerState] = useState<AnswerState>("idle");
  const [p1Correct, setP1Correct] = useState<boolean | null>(null);
  const [rootGap, setRootGap] = useState<ConceptId | null>(null);

  // ── Phase 2 state ─────────────────────────────────────────────────────────
  const [p2Selected, setP2Selected] = useState<number | null>(null);
  const [p2AnswerState, setP2AnswerState] = useState<AnswerState>("idle");
  const [p2Correct, setP2Correct] = useState<boolean | null>(null);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [processing, setProcessing] = useState(false);

  // ── Phase 1 logic ─────────────────────────────────────────────────────────
  const handleP1Submit = useCallback(() => {
    if (p1Selected === null) return;
    setProcessing(true);

    const q = MOCK_QUESTIONS[targetConcept];
    const correct = p1Selected === q.correctIndex;
    setP1AnswerState(correct ? "correct" : "incorrect");
    setP1Correct(correct);

    if (correct) {
      // Phase 1 passed — no prerequisite traversal needed
      onHighlightConcept?.(null);
      onAnswer?.({ concept: targetConcept, correct: true, rootGap: null, phase: 1 });
    } else {
      // Walk the DAG backward to find the deepest gap
      const masteryMap = toMasteryMap(masteryData);
      const gap = findRootGapNode(targetConcept, masteryMap, MASTERY_THRESHOLD);
      setRootGap(gap);
      onHighlightConcept?.(gap);
      onAnswer?.({ concept: targetConcept, correct: false, rootGap: gap, phase: 1 });
    }

    setProcessing(false);
  }, [p1Selected, targetConcept, masteryData, onAnswer, onHighlightConcept]);

  // Transition from Phase 1 → Phase 2
  const handleContinueToP2 = useCallback(() => {
    if (rootGap === null) {
      // No gap found despite incorrect answer — session complete
      setDone(true);
      return;
    }
    setPhase(2);
  }, [rootGap]);

  // ── Phase 2 logic ─────────────────────────────────────────────────────────
  const handleP2Submit = useCallback(() => {
    if (p2Selected === null || rootGap === null) return;
    setProcessing(true);

    const q = MOCK_QUESTIONS[rootGap];
    const correct = p2Selected === q.correctIndex;
    setP2AnswerState(correct ? "correct" : "incorrect");
    setP2Correct(correct);

    onAnswer?.({ concept: rootGap, correct, rootGap, phase: 2 });
    setDone(true);
    setProcessing(false);
  }, [p2Selected, rootGap, onAnswer]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase(1);
    setDone(false);
    setP1Selected(null);
    setP1AnswerState("idle");
    setP1Correct(null);
    setRootGap(null);
    setP2Selected(null);
    setP2AnswerState("idle");
    setP2Correct(null);
    setProcessing(false);
    onHighlightConcept?.(null);
  }, [onHighlightConcept]);

  // ── Render ────────────────────────────────────────────────────────────────
  const p1Question = MOCK_QUESTIONS[targetConcept];
  const p2Question = rootGap ? MOCK_QUESTIONS[rootGap] : null;

  return (
    <section
      className={cn(
        "rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-6 sm:p-8",
        "shadow-2xl shadow-black/40",
        className,
      )}
      aria-label="Diagnostic quiz"
    >
      {/* Section header */}
      <div className="mb-6 flex items-center gap-2">
        <Brain size={18} className="text-indigo-400" aria-hidden="true" />
        <h2 className="text-lg font-bold tracking-tight text-zinc-100">
          Diagnostic Assessment
        </h2>
      </div>

      {/* Phase progress indicator */}
      {!done && (
        <div className="mb-6 flex items-center gap-2" aria-label="Diagnostic progress">
          {([1, 2] as DiagnosticPhase[]).map((p) => (
            <div key={p} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  "border transition-all duration-300",
                  phase === p && !done
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-300"
                    : p < phase
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-600",
                )}
                aria-label={`Phase ${p}${p < phase ? " — complete" : p === phase ? " — current" : " — upcoming"}`}
              >
                {p < phase ? <CheckCircle2 size={12} aria-hidden="true" /> : p}
              </div>
              {p < 2 && (
                <div
                  className={cn(
                    "h-px w-8 transition-colors duration-300",
                    phase > 1 ? "bg-emerald-500/50" : "bg-zinc-700",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-zinc-500">
            {phase === 1
              ? "Checkpoint"
              : rootGap
                ? `Checking ${CONCEPTS[rootGap].label}`
                : "Prerequisite Diagnostic"}
          </span>
        </div>
      )}

      {/* Content */}
      {done ? (
        <CompletionPanel
          phase1Correct={p1Correct}
          phase2Correct={p2Correct}
          rootGap={rootGap}
          onReset={handleReset}
        />
      ) : phase === 1 ? (
        <QuestionPanel
          phase={1}
          conceptId={targetConcept}
          question={p1Question}
          selectedIndex={p1Selected}
          answerState={p1AnswerState}
          rootGap={rootGap}
          processing={processing}
          onSelect={setP1Selected}
          onSubmit={handleP1Submit}
          onContinue={handleContinueToP2}
          onReset={handleReset}
        />
      ) : p2Question && rootGap ? (
        <QuestionPanel
          phase={2}
          conceptId={rootGap}
          question={p2Question}
          selectedIndex={p2Selected}
          answerState={p2AnswerState}
          rootGap={rootGap}
          processing={processing}
          onSelect={setP2Selected}
          onSubmit={handleP2Submit}
          onContinue={() => setDone(true)}
          onReset={handleReset}
        />
      ) : null}
    </section>
  );
}
