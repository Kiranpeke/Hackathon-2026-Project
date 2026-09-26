/**
 * lib/api.ts
 *
 * Client-side helpers for POST /api/generate.
 *
 * All AI calls flow through this module — never call Gemini/Groq directly
 * from browser code.
 *
 * Both functions throw on failure so callers can catch and show error UI.
 * The thrown message is safe to log but should NOT be displayed raw to learners.
 */

import type { DifficultyTier } from "./bkt";

// ---------------------------------------------------------------------------
// Response payload types (mirrors server Zod schemas in app/api/generate/route.ts)
// ---------------------------------------------------------------------------

export interface MicroLesson {
  concept: string;
  bullets: [string, string, string];
  worked_example: string;
}

/** Structured solution — teaches the student WHY, not just WHAT. */
export interface QuestionSolution {
  summary: string;   // one-sentence reason the correct answer is right
  steps: string[];   // 2–4 reasoning steps
}

export interface AdaptiveQuestion {
  question: string;
  options: [string, string, string, string];
  correct_index: number;
  solution: QuestionSolution;
}

export type AIProvider = "gemini" | "groq";

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------

interface GenerateSuccess<T> {
  success: true;
  provider: AIProvider;
  data: T;
  duplicate?: boolean;
}

interface GenerateFailure {
  success: false;
  error: string;
}

type GenerateResponse<T> = GenerateSuccess<T> | GenerateFailure;

interface GenerateParams {
  type: "micro_lesson" | "adaptive_question";
  subject: string;
  concept: string;
  difficulty: DifficultyTier;
  studentId?: string;
}

async function callGenerate<T>(params: GenerateParams): Promise<{ data: T; provider: AIProvider }> {
  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: params.type,
        subject: params.subject,
        concept: params.concept,
        difficulty: params.difficulty,
        studentId: params.studentId ?? "demo-student",
      }),
    });
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  let json: GenerateResponse<T>;
  try {
    json = (await res.json()) as GenerateResponse<T>;
  } catch {
    throw new Error(`Server returned non-JSON (HTTP ${res.status}).`);
  }

  if (!res.ok || !json.success) {
    const msg = (json as GenerateFailure).error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return {
    data: (json as GenerateSuccess<T>).data,
    provider: (json as GenerateSuccess<T>).provider,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates an AI micro-lesson for the given subject, concept, and difficulty.
 * @throws if the network fails, the server returns an error, or the response
 *         cannot be parsed.
 */
export async function generateMicroLesson(
  subject: string,
  concept: string,
  difficulty: DifficultyTier,
  studentId = "demo-student",
): Promise<MicroLesson> {
  const { data } = await callGenerate<MicroLesson>({
    type: "micro_lesson",
    subject,
    concept,
    difficulty,
    studentId,
  });
  return data;
}

/**
 * Generates a unique AI adaptive question for the given subject, concept, and difficulty.
 * The server enforces question non-repetition per student (in-memory hash store).
 * @throws same as generateMicroLesson.
 */
export async function generateAdaptiveQuestion(
  subject: string,
  concept: string,
  difficulty: DifficultyTier,
  studentId = "demo-student",
): Promise<AdaptiveQuestion> {
  const { data } = await callGenerate<AdaptiveQuestion>({
    type: "adaptive_question",
    subject,
    concept,
    difficulty,
    studentId,
  });
  return data;
}
