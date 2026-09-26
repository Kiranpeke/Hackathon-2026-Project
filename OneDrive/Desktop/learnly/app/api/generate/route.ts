/**
 * app/api/generate/route.ts
 *
 * AI content generation endpoint.
 *
 * POST /api/generate
 *
 * ── Providers ────────────────────────────────────────────────────────────────
 * PRIMARY : Google Gemini  (gemini-3.8-flash)   — 3.5 s timeout
 * FALLBACK : Groq          (qwen/qwen3.8-27b)
 *
 * ── Output types ─────────────────────────────────────────────────────────────
 * micro_lesson      → { concept, bullets[3], worked_example }
 * adaptive_question → { question, options[4], correct_index 0-3, solution }
 *
 * ── Solution format ──────────────────────────────────────────────────────────
 * solution: { summary: string; steps: string[] }
 * Never returns raw "Option B is correct." text.
 *
 * ── Question non-repetition ───────────────────────────────────────────────────
 * Each adaptive_question is hashed (SHA-256 of normalised text).
 * In-memory history keyed by (studentId, subject, concept) ensures the
 * same student never receives the same question twice within a server session.
 * Up to 3 generation attempts before accepting a duplicate as last resort.
 *
 * ── Security ─────────────────────────────────────────────────────────────────
 * API keys are read from server-side env vars only (no NEXT_PUBLIC_ prefix).
 * Keys are never forwarded to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";
import { z } from "zod";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Environment — fail-fast so bad deploys surface immediately
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

// ---------------------------------------------------------------------------
// Zod schemas — request + response validation
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  type: z.enum(["micro_lesson", "adaptive_question"]),
  subject: z.string().min(1).max(100).default("ADSA"),
  concept: z.string().min(1).max(100),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  studentId: z.string().max(100).default("demo-student"),
});

const MicroLessonSchema = z.object({
  concept: z.string().min(1),
  bullets: z.array(z.string().min(1)).length(3),
  worked_example: z.string().min(1),
});

const SolutionSchema = z.object({
  summary: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(6),
});

const AdaptiveQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  solution: SolutionSchema,
});

type GenerateRequest = z.infer<typeof RequestSchema>;
type MicroLesson = z.infer<typeof MicroLessonSchema>;
type AdaptiveQuestion = z.infer<typeof AdaptiveQuestionSchema>;
type GeneratedContent = MicroLesson | AdaptiveQuestion;

// ---------------------------------------------------------------------------
// JSON schemas for Gemini structured output
// ---------------------------------------------------------------------------

const MICRO_LESSON_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    concept:        { type: Type.STRING },
    bullets:        { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 3, maxItems: 3 },
    worked_example: { type: Type.STRING },
  },
  required: ["concept", "bullets", "worked_example"],
};

const ADAPTIVE_QUESTION_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question:      { type: Type.STRING },
    options:       { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
    correct_index: { type: Type.INTEGER },
    solution: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        steps:   { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 1, maxItems: 6 },
      },
      required: ["summary", "steps"],
    },
  },
  required: ["question", "options", "correct_index", "solution"],
};

// ---------------------------------------------------------------------------
// Question non-repetition — in-memory hash store
//
// Keyed by "studentId:subject:concept" → Set of 16-char SHA-256 prefixes.
// In `next dev` the process persists across browser refreshes, so history
// survives page reloads. Production would use Supabase for persistence.
// ---------------------------------------------------------------------------

const questionHistory = new Map<string, Set<string>>();

function historyKey(studentId: string, subject: string, concept: string): string {
  return `${studentId}:${subject.toLowerCase()}:${concept.toLowerCase()}`;
}

function hashQuestion(text: string): string {
  const normalised = text.toLowerCase().trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalised).digest("hex").slice(0, 16);
}

function hasSeenQuestion(studentId: string, subject: string, concept: string, hash: string): boolean {
  return questionHistory.get(historyKey(studentId, subject, concept))?.has(hash) ?? false;
}

function recordQuestion(studentId: string, subject: string, concept: string, hash: string): void {
  const key = historyKey(studentId, subject, concept);
  if (!questionHistory.has(key)) questionHistory.set(key, new Set());
  questionHistory.get(key)!.add(hash);
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const BASE_INSTRUCTION =
  "You are an expert tutor generating adaptive learning content. " +
  "Generate content ONLY about the requested subject and concept. " +
  "Do not mix subjects. Verify all facts and calculations. " +
  "Respond with a single valid JSON object matching the exact schema.";

function buildSystemInstruction(subject: string): string {
  return `${BASE_INSTRUCTION} Subject: ${subject}.`;
}

function buildPrompt(req: GenerateRequest): string {
  const diffDesc: Record<string, string> = {
    Easy:   "foundational, suitable for a student just learning this concept",
    Medium: "intermediate, requiring some prior familiarity with the concept",
    Hard:   "challenging, suitable for a student who understands the basics",
  };

  if (req.type === "micro_lesson") {
    return (
      `Subject: ${req.subject}\n` +
      `Concept: ${req.concept}\n` +
      `Difficulty: ${req.difficulty} — ${diffDesc[req.difficulty]}\n\n` +
      `Generate a micro-lesson JSON with:\n` +
      `- "concept": the concept name (string)\n` +
      `- "bullets": EXACTLY 3 concise learning bullets (each one sentence)\n` +
      `- "worked_example": one step-by-step worked example string\n\n` +
      `Keep bullets focused. The worked example must show reasoning step by step.`
    );
  }

  return (
    `Subject: ${req.subject}\n` +
    `Concept: ${req.concept}\n` +
    `Difficulty: ${req.difficulty} — ${diffDesc[req.difficulty]}\n\n` +
    `Generate one multiple-choice question JSON with:\n` +
    `- "question": the question text\n` +
    `- "options": EXACTLY 4 answer choices (one correct, three plausible distractors)\n` +
    `- "correct_index": integer 0–3 (which option is correct)\n` +
    `- "solution": object with:\n` +
    `    - "summary": one-sentence explanation of why the correct answer is right\n` +
    `    - "steps": 2–4 reasoning steps that teach the student WHY\n\n` +
    `The question must be genuinely about ${req.subject} — ${req.concept}.\n` +
    `Make distractors plausible but clearly wrong upon reflection.\n` +
    `Do NOT say "Option X is correct" in the solution — explain the reasoning.`
  );
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

function validateOutput(type: GenerateRequest["type"], raw: unknown): GeneratedContent {
  if (type === "micro_lesson") return MicroLessonSchema.parse(raw);
  return AdaptiveQuestionSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------

async function generateWithGemini(
  req: GenerateRequest,
  signal: AbortSignal,
): Promise<GeneratedContent> {
  const apiKey = requireEnv("GOOGLE_AI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });

  const schema =
    req.type === "micro_lesson"
      ? MICRO_LESSON_GEMINI_SCHEMA
      : ADAPTIVE_QUESTION_GEMINI_SCHEMA;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: buildPrompt(req),
    config: {
      systemInstruction: buildSystemInstruction(req.subject),
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.5,
      maxOutputTokens: 1024,
    },
  });

  if (signal.aborted) throw new Error("Gemini request aborted");

  const finishReason = response.candidates?.[0]?.finishReason;
  const rawText: string | undefined =
    response.candidates?.[0]?.content?.parts?.[0]?.text ?? response.text;

  if (!rawText) {
    throw new Error(`Gemini returned empty content (finishReason: ${finishReason ?? "unknown"})`);
  }

  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was truncated (MAX_TOKENS)");
  }

  const stripped = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(`Gemini response is not valid JSON: ${stripped.slice(0, 200)}`);
  }

  return validateOutput(req.type, parsed);
}

// ---------------------------------------------------------------------------
// Groq fallback provider
// ---------------------------------------------------------------------------

async function generateWithGroq(req: GenerateRequest): Promise<GeneratedContent> {
  const apiKey = requireEnv("GROQ_API_KEY");
  const groq = new Groq({ apiKey });

  const systemMessage =
    buildSystemInstruction(req.subject) +
    " Respond ONLY with a single valid JSON object — no markdown, no code fences, no extra text." +
    " /no_think"; // suppress Qwen chain-of-thought reasoning tokens

  const completion = await groq.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user",   content: buildPrompt(req) },
    ],
    temperature: 0.5,
    max_tokens: 1024, // raised from 512 — adaptive_question with solution needs headroom
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Groq response is not valid JSON: ${text.slice(0, 200)}`);
  }

  return validateOutput(req.type, parsed);
}

// ---------------------------------------------------------------------------
// Orchestrator: Gemini with timeout → Groq fallback
// ---------------------------------------------------------------------------

const GEMINI_TIMEOUT_MS = 3500;

async function generateContent(req: GenerateRequest): Promise<{
  data: GeneratedContent;
  provider: "gemini" | "groq";
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const geminiResult = await Promise.race<GeneratedContent>([
      generateWithGemini(req, controller.signal),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS}ms`)),
          GEMINI_TIMEOUT_MS,
        )
      ),
    ]);
    clearTimeout(timer);
    return { data: geminiResult, provider: "gemini" };
  } catch (geminiError) {
    clearTimeout(timer);
    controller.abort();
    console.warn(
      "[generate] Gemini failed, falling back to Groq:",
      geminiError instanceof Error ? geminiError.message : String(geminiError),
    );
  }

  const groqResult = await generateWithGroq(req);
  return { data: groqResult, provider: "groq" };
}

// ---------------------------------------------------------------------------
// Question deduplication loop (adaptive_question only)
// ---------------------------------------------------------------------------

const MAX_DEDUP_ATTEMPTS = 3;

async function generateUniqueQuestion(req: GenerateRequest): Promise<{
  data: AdaptiveQuestion;
  provider: "gemini" | "groq";
  duplicate: boolean;
}> {
  // GeneratedContent union — safe because this function is only called for adaptive_question
  let lastResult: { data: GeneratedContent; provider: "gemini" | "groq" } | null = null;

  for (let attempt = 0; attempt < MAX_DEDUP_ATTEMPTS; attempt++) {
    const result = await generateContent(req);
    // result.data is AdaptiveQuestion at runtime (request type is adaptive_question)
    const question = result.data as AdaptiveQuestion;
    const hash = hashQuestion(question.question);

    if (!hasSeenQuestion(req.studentId, req.subject, req.concept, hash)) {
      recordQuestion(req.studentId, req.subject, req.concept, hash);
      return { data: question, provider: result.provider, duplicate: false };
    }

    lastResult = result; // now correctly typed as GeneratedContent
    console.warn(`[generate] Duplicate question on attempt ${attempt + 1}/${MAX_DEDUP_ATTEMPTS} — retrying`);
  }

  // All 3 were duplicates — accept the last one (very unlikely with generative AI)
  const question = lastResult!.data as AdaptiveQuestion;
  const hash = hashQuestion(question.question);
  recordQuestion(req.studentId, req.subject, req.concept, hash);
  return { data: question, provider: lastResult!.provider, duplicate: true };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const req = parsed.data;

  try {
    if (req.type === "adaptive_question") {
      const { data, provider, duplicate } = await generateUniqueQuestion(req);
      return NextResponse.json({ success: true, provider, data, duplicate });
    }

    const { data, provider } = await generateContent(req);
    return NextResponse.json({ success: true, provider, data });
  } catch (err) {
    console.error(
      "[generate] Both providers failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { success: false, error: "AI generation unavailable" },
      { status: 502 },
    );
  }
}
