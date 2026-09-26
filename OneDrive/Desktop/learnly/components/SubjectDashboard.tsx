/**
 * components/SubjectDashboard.tsx
 *
 * Step 9 adaptive learning dashboard — fully preserved, moved from
 * app/page.tsx to support the /learn/[subject] route structure.
 *
 * Architecture rules enforced:
 *  - BKT calculations use ONLY lib/bkt.ts
 *  - AI calls flow through lib/api.ts → POST /api/generate
 *  - Subject config from lib/subjects.ts
 *  - No BKT math inline; no AI calls inline; no subject data inline
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import SubjectConceptDAG from "@/components/SubjectConceptDAG";
import SubjectDiagnosticQuiz from "@/components/SubjectDiagnosticQuiz";
import MicroLessonPanel from "@/components/MicroLessonPanel";
import AdaptiveQuestionPanel from "@/components/AdaptiveQuestionPanel";
import LearnlyNav from "@/components/LearnlyNav";
import type { SubjectDefinition } from "@/lib/subjects";
import { initialPKnownForSubject, pKnownToStatus } from "@/lib/subjects";
import type { SubjectDiagnosticResult } from "@/components/SubjectDiagnosticQuiz";
import type { MicroLesson, AdaptiveQuestion } from "@/lib/api";
import { generateMicroLesson, generateAdaptiveQuestion } from "@/lib/api";
import type { BKTState } from "@/lib/bkt";
import {
  DEFAULT_BKT_PARAMS,
  MASTERY_THRESHOLD,
  getDifficultyTier,
  observeCorrect,
  observeIncorrect,
} from "@/lib/bkt";
import {
  RefreshCcw,
  Loader2,
  AlertCircle,
  MapPin,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppPhase = "diagnostic" | "learning";
type LearningStep = "lesson" | "question";
type PKnownMap = Record<string, number>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SubjectDashboardProps {
  initialSubject: SubjectDefinition;
  /** Authenticated user email — passed to LearnlyNav for UserMenu. */
  userEmail?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMasteryData(pKnownMap: PKnownMap) {
  return Object.fromEntries(
    Object.entries(pKnownMap).map(([id, pKnown]) => [
      id,
      { mastery: pKnown, status: pKnownToStatus(pKnown) },
    ]),
  );
}

function overallMasteryPct(pKnownMap: PKnownMap): number {
  const vals = Object.values(pKnownMap);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100);
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16" role="status" aria-live="polite">
      <Loader2 size={26} className="animate-spin text-amber-600" aria-hidden="true" />
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-800/40 bg-red-900/15 p-6 space-y-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-red-300">Couldn&apos;t load content</p>
          <p className="text-sm text-stone-500">
            {message || "Your tutor couldn\u2019t be reached. Your progress is safe."}
          </p>
        </div>
      </div>
      <button
        type="button"
        id="error-retry-btn"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <RefreshCcw size={14} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function MasteryBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-stone-600">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-stone-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SubjectDashboard({ initialSubject, userEmail }: SubjectDashboardProps) {
  const subject = initialSubject; // fixed per route — no switching here

  // ── Phase state ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AppPhase>("diagnostic");
  const [learningStep, setLearningStep] = useState<LearningStep>("lesson");

  // ── Concept + mastery state ───────────────────────────────────────────────
  const [pKnownMap, setPKnownMap] = useState<PKnownMap>(() =>
    initialPKnownForSubject(subject),
  );
  const [currentConceptId, setCurrentConceptId] = useState<string | null>(null);
  const [highlightedConceptId, setHighlightedConceptId] = useState<string | null>(null);

  // ── AI content state ──────────────────────────────────────────────────────
  const [currentLesson, setCurrentLesson] = useState<MicroLesson | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [postAnswerBKT, setPostAnswerBKT] = useState<BKTState | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  // ── Loading / error ───────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const masteryData = buildMasteryData(pKnownMap);
  const conceptPKnown = currentConceptId
    ? (pKnownMap[currentConceptId] ?? DEFAULT_BKT_PARAMS.pKnown)
    : DEFAULT_BKT_PARAMS.pKnown;
  const currentDifficulty = getDifficultyTier(conceptPKnown);
  const overallPct = overallMasteryPct(pKnownMap);
  const currentConceptLabel = currentConceptId
    ? (subject.concepts.find((c) => c.id === currentConceptId)?.label ?? currentConceptId)
    : null;

  // ── Diagnostic completion ─────────────────────────────────────────────────
  const handleDiagnosticAnswer = useCallback(
    async (result: SubjectDiagnosticResult) => {
      const conceptId =
        result.phase === 1 && result.correct
          ? subject.targetConceptId
          : (result.rootGap ?? subject.targetConceptId);

      setCurrentConceptId(conceptId);
      setHighlightedConceptId(conceptId);

      const pKnown = pKnownMap[conceptId] ?? DEFAULT_BKT_PARAMS.pKnown;
      const difficulty = getDifficultyTier(pKnown);

      setPhase("learning");
      setLearningStep("lesson");
      setIsLoading(true);
      setLoadingMsg("Preparing your lesson\u2026");
      setError(null);

      try {
        const lesson = await generateMicroLesson(subject.shortName, conceptId, difficulty);
        setCurrentLesson(lesson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate lesson");
      } finally {
        setIsLoading(false);
        setLoadingMsg("");
      }
    },
    [subject, pKnownMap],
  );

  // ── Ready to practice ─────────────────────────────────────────────────────
  const handleReadyToPractice = useCallback(async () => {
    if (!currentConceptId) return;
    const pKnown = pKnownMap[currentConceptId] ?? DEFAULT_BKT_PARAMS.pKnown;
    const difficulty = getDifficultyTier(pKnown);

    setLearningStep("question");
    setPostAnswerBKT(null);
    setCurrentQuestion(null);
    setIsLoading(true);
    setLoadingMsg("Generating your first question\u2026");
    setError(null);

    try {
      const question = await generateAdaptiveQuestion(subject.shortName, currentConceptId, difficulty);
      setCurrentQuestion(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate question");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }, [currentConceptId, pKnownMap, subject]);

  // ── Answer submission ─────────────────────────────────────────────────────
  const handleAnswerSubmit = useCallback(
    (_selectedIndex: number, correct: boolean) => {
      if (!currentConceptId) return;
      const pKnownBefore = pKnownMap[currentConceptId] ?? DEFAULT_BKT_PARAMS.pKnown;
      const updatedState: BKTState = correct
        ? observeCorrect(pKnownBefore)
        : observeIncorrect(pKnownBefore);

      setPKnownMap((prev) => ({ ...prev, [currentConceptId]: updatedState.pKnown }));
      setPostAnswerBKT(updatedState);
      setQuestionsAnswered((q) => q + 1);
    },
    [currentConceptId, pKnownMap],
  );

  // ── Next question ─────────────────────────────────────────────────────────
  const handleNextQuestion = useCallback(async () => {
    if (!currentConceptId) return;
    const pKnown = pKnownMap[currentConceptId] ?? DEFAULT_BKT_PARAMS.pKnown;
    const difficulty = getDifficultyTier(pKnown);

    setLoadingNext(true);
    setCurrentQuestion(null);
    setPostAnswerBKT(null);
    setError(null);

    try {
      const question = await generateAdaptiveQuestion(subject.shortName, currentConceptId, difficulty);
      setCurrentQuestion(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate question");
    } finally {
      setLoadingNext(false);
    }
  }, [currentConceptId, pKnownMap, subject]);

  // ── Retry ────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    if (!currentConceptId) return;
    setError(null);
    if (learningStep === "lesson") {
      const pKnown = pKnownMap[currentConceptId] ?? DEFAULT_BKT_PARAMS.pKnown;
      const difficulty = getDifficultyTier(pKnown);
      setIsLoading(true);
      setLoadingMsg("Retrying\u2026");
      try {
        const lesson = await generateMicroLesson(subject.shortName, currentConceptId, difficulty);
        setCurrentLesson(lesson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate lesson");
      } finally {
        setIsLoading(false);
        setLoadingMsg("");
      }
    } else {
      await handleNextQuestion();
    }
  }, [currentConceptId, pKnownMap, subject, learningStep, handleNextQuestion]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase("diagnostic");
    setLearningStep("lesson");
    setCurrentConceptId(null);
    setHighlightedConceptId(null);
    setCurrentLesson(null);
    setCurrentQuestion(null);
    setPostAnswerBKT(null);
    setError(null);
    setIsLoading(false);
    setLoadingNext(false);
  }, []);

  const handleConceptClick = useCallback((id: string) => {
    setHighlightedConceptId(id);
  }, []);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* ── Navigation ── */}
      <LearnlyNav variant="subject" subjectName={subject.shortName} userEmail={userEmail} />

      {/* ── Main ── */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">

          {/* ── LEFT: Learning area ── */}
          <main aria-label="Adaptive learning area">
            {/* Subject heading */}
            <header className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
                  {subject.shortName}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
                  {subject.name}
                </h1>
                <p className="mt-1 text-sm text-stone-600">{subject.description}</p>
              </div>

              {/* Progress indicator (learning phase only) */}
              {phase === "learning" && (
                <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs text-stone-600 pt-1">
                  <BarChart3 size={12} aria-hidden="true" />
                  <span>{overallPct}% overall</span>
                </div>
              )}
            </header>

            {/* ── Diagnostic ── */}
            {phase === "diagnostic" && (
              <section
                aria-labelledby="diag-heading"
                className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6 space-y-6 animate-scale-in"
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
                    Diagnostic
                  </p>
                  <h2 id="diag-heading" className="text-xl font-bold text-stone-100">
                    Let&apos;s find your starting point
                  </h2>
                  <p className="text-sm text-stone-600">
                    A short assessment to personalise your{" "}
                    <strong className="text-stone-400">{subject.shortName}</strong> learning path.
                  </p>
                </div>

                <SubjectDiagnosticQuiz
                  subject={subject}
                  pKnownMap={pKnownMap}
                  onAnswer={handleDiagnosticAnswer}
                  onHighlightConcept={setHighlightedConceptId}
                />
              </section>
            )}

            {/* ── Learning ── */}
            {phase === "learning" && (
              <div className="space-y-6">
                {/* Current concept banner */}
                {currentConceptLabel && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-900/40 bg-amber-950/30 px-4 py-3 animate-fade-in">
                    <MapPin size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-amber-700">
                        Current concept
                      </p>
                      <p className="font-bold text-amber-300 truncate">{currentConceptLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-600 shrink-0">
                      <span>
                        Mastery{" "}
                        <strong className="text-stone-400 tabular-nums">
                          {Math.round(conceptPKnown * 100)}%
                        </strong>
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          currentDifficulty === "Hard" && "bg-red-900/40 text-red-400",
                          currentDifficulty === "Medium" && "bg-amber-900/40 text-amber-400",
                          currentDifficulty === "Easy" && "bg-emerald-900/40 text-emerald-400",
                        )}
                        aria-label={`Difficulty: ${currentDifficulty}`}
                      >
                        {currentDifficulty}
                      </span>
                    </div>
                    <button
                      type="button"
                      id="restart-diagnostic-btn"
                      onClick={handleReset}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-600 hover:text-stone-400 hover:bg-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      aria-label="Restart diagnostic"
                    >
                      <RefreshCcw size={11} aria-hidden="true" />
                      <span className="hidden sm:inline">Restart</span>
                    </button>
                  </div>
                )}

                {/* Loading */}
                {isLoading && <LoadingOverlay message={loadingMsg} />}

                {/* Error */}
                {!isLoading && error && (
                  <ErrorPanel
                    message="Your learning content couldn\u2019t be generated. Your progress is safe."
                    onRetry={handleRetry}
                  />
                )}

                {/* Micro-lesson */}
                {!isLoading && !error && learningStep === "lesson" && currentLesson && (
                  <section
                    aria-labelledby="lesson-heading"
                    className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6 space-y-6 animate-scale-in"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
                        Micro-Lesson
                      </p>
                      <h2 id="lesson-heading" className="mt-1 text-2xl font-bold text-stone-100">
                        {currentLesson.concept}
                      </h2>
                    </div>

                    <MicroLessonPanel lesson={currentLesson} />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        id="ready-practice-btn"
                        onClick={handleReadyToPractice}
                        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-amber-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        Ready to Practice
                        <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                )}

                {/* Adaptive question */}
                {!isLoading && !error && learningStep === "question" && (
                  <section
                    aria-labelledby="aq-section-heading"
                    className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6 animate-scale-in"
                  >
                    <h2 id="aq-section-heading" className="sr-only">
                      Adaptive Practice Questions
                    </h2>

                    {(!currentQuestion || loadingNext) && (
                      <LoadingOverlay
                        message={loadingNext ? "Generating next question\u2026" : "Generating your question\u2026"}
                      />
                    )}

                    {currentQuestion && !loadingNext && (
                      <AdaptiveQuestionPanel
                        question={currentQuestion}
                        postAnswerBKT={postAnswerBKT}
                        onSubmit={handleAnswerSubmit}
                        onNextQuestion={handleNextQuestion}
                        loadingNext={loadingNext}
                        questionsAnswered={questionsAnswered}
                      />
                    )}
                  </section>
                )}
              </div>
            )}
          </main>

          {/* ── RIGHT: Sidebar ── */}
          <aside aria-label="Knowledge map and progress">
            <div className="sticky top-20 space-y-5">
              {/* Knowledge map */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-600">
                      Knowledge Map
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-300">
                      {subject.shortName}
                    </p>
                  </div>
                  <Link
                    href="/learn"
                    className="text-[10px] text-stone-700 hover:text-stone-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
                  >
                    ← Subjects
                  </Link>
                </div>

                <SubjectConceptDAG
                  subject={subject}
                  masteryData={masteryData}
                  selectedConcept={highlightedConceptId}
                  onConceptClick={handleConceptClick}
                />
              </div>

              {/* Progress stats — learning phase only */}
              {phase === "learning" && (
                <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-600">
                    Progress
                  </p>

                  <MasteryBar
                    label="Overall mastery"
                    pct={overallPct}
                    color="bg-amber-500"
                  />

                  {currentConceptId && (
                    <MasteryBar
                      label={currentConceptLabel ?? "Current concept"}
                      pct={Math.round(conceptPKnown * 100)}
                      color={
                        pKnownToStatus(conceptPKnown) === "mastered"
                          ? "bg-emerald-500"
                          : pKnownToStatus(conceptPKnown) === "practicing"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }
                    />
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-600">Questions</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-stone-200">
                        {questionsAnswered}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-600">Difficulty</p>
                      <p
                        className={cn(
                          "mt-0.5 text-xl font-bold",
                          currentDifficulty === "Hard" && "text-red-400",
                          currentDifficulty === "Medium" && "text-amber-400",
                          currentDifficulty === "Easy" && "text-emerald-400",
                        )}
                      >
                        {currentDifficulty}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-600">Mastered</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-stone-200">
                        {subject.concepts.filter(
                          (c) => (pKnownMap[c.id] ?? 0) >= MASTERY_THRESHOLD,
                        ).length}
                        <span className="text-sm font-normal text-stone-600">
                          {" "}/ {subject.concepts.length}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-600">Subject</p>
                      <p className="mt-0.5 text-xl font-bold text-amber-400">
                        {subject.shortName}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
