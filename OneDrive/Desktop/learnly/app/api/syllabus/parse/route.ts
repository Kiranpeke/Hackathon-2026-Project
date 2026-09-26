/**
 * app/api/syllabus/parse/route.ts
 *
 * POST /api/syllabus/parse
 *
 * Accepts multipart/form-data with a "file" field (.txt or .md).
 * Extracts raw text, sends to Gemini (primary) or Groq (fallback),
 * returns a ParsedSyllabus JSON with concepts + prerequisites.
 *
 * Uses the SAME AI SDK + model configuration as /api/generate so
 * we know it works: gemini-3.8-flash via @google/genai, qwen/qwen3.8-27b via groq-sdk.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import type { ParsedSyllabus } from "@/lib/syllabus";

// ---------------------------------------------------------------------------
// Config — matches /api/generate proven models
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-3.8-flash";
const GROQ_MODEL = "qwen/qwen3.8-27b";
const MAX_TEXT_CHARS = 10_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 25_000;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSyllabusPrompt(text: string, compact = false): string {
  const conceptCount = compact ? "6-10" : "8-15";
  return `You are an educational AI. Analyze this syllabus and extract a structured learning graph.

Return ONLY a valid JSON object — no markdown fences, no preamble, no explanation.

Schema:
{
  "subjectName": "<full subject name>",
  "subjectCode": "<2-5 char abbreviation>",
  "concepts": [
    { "id": "<camelCase id>", "label": "<2-5 word label>", "description": "<one sentence>" }
  ],
  "prerequisites": [
    { "from": "<concept id learned first>", "to": "<concept id that depends on it>" }
  ]
}

Rules:
- Extract ${conceptCount} of the most important concepts.
- Each concept id must be unique camelCase matching what appears in prerequisites.
- Prerequisites must only reference ids that exist in concepts.
- Order from foundational to advanced.
- Do NOT invent topics absent from the syllabus.

Syllabus:
---
${text.slice(0, MAX_TEXT_CHARS)}
---`;
}

// ---------------------------------------------------------------------------
// JSON extraction
// ---------------------------------------------------------------------------

function extractParsedSyllabus(raw: string): ParsedSyllabus {
  // Strip markdown fences if present
  let cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();

  // Also strip Qwen <think>...</think> reasoning tokens
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try extracting the first JSON object from surrounding prose
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); }
      catch { throw new Error("AI returned malformed JSON. Try again."); }
    } else {
      throw new Error("AI returned no JSON. Try again.");
    }
  }

  const p = parsed as Record<string, unknown>;
  if (
    typeof p.subjectName !== "string" || !p.subjectName ||
    typeof p.subjectCode !== "string" || !p.subjectCode ||
    !Array.isArray(p.concepts) || p.concepts.length === 0 ||
    !Array.isArray(p.prerequisites)
  ) {
    throw new Error("AI response missing required fields.");
  }

  return parsed as ParsedSyllabus;
}

// ---------------------------------------------------------------------------
// Gemini call (same approach as /api/generate)
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<ParsedSyllabus> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 3000 },
    });

    clearTimeout(timeout);
    if (controller.signal.aborted) throw new Error("Gemini timeout");

    const text = response.text;
    if (!text) throw new Error("Gemini returned empty content");
    return extractParsedSyllabus(text);
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Groq call (same approach as /api/generate)
// ---------------------------------------------------------------------------

async function callGroq(prompt: string): Promise<ParsedSyllabus> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: "You are an educational AI that extracts structured learning graphs from syllabi. " +
          "Always return only valid JSON. /no_think",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 900,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty content");
  return extractParsedSyllabus(text);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Could not parse upload. Please try again." },
        { status: 400 },
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided. Upload a .txt or .md syllabus file." },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md")) {
      return NextResponse.json(
        { success: false, error: "Unsupported format. Upload a .txt or .md file. (Save your syllabus in Notepad as .txt)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File too large — maximum 10 MB." },
        { status: 400 },
      );
    }

    const text = await file.text();
    if (text.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "File is too short to analyse. Add your course topics." },
        { status: 422 },
      );
    }

    const prompt = buildSyllabusPrompt(text);

    let parsed: ParsedSyllabus;
    let provider: "gemini" | "groq" = "gemini";

    try {
      parsed = await callGemini(prompt);
      console.log(`[syllabus/parse] Gemini OK: ${parsed.concepts.length} concepts from "${parsed.subjectName}"`);
    } catch (geminiErr) {
      console.warn("[syllabus/parse] Gemini failed, trying Groq:", String(geminiErr).slice(0, 100));
      try {
        // Use compact prompt for Groq to stay under its 900-token output limit
        const compactPrompt = buildSyllabusPrompt(text, true);
        parsed = await callGroq(compactPrompt);
        provider = "groq";
        console.log(`[syllabus/parse] Groq OK: ${parsed.concepts.length} concepts from "${parsed.subjectName}"`);
      } catch (groqErr) {
        console.error("[syllabus/parse] Both failed:", String(groqErr).slice(0, 100));
        return NextResponse.json(
          { success: false, error: "AI analysis failed. The quota may be temporarily exhausted — please try again in a minute." },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({ success: true, provider, data: parsed });
  } catch (err) {
    console.error("[syllabus/parse] unexpected:", err);
    return NextResponse.json(
      { success: false, error: "Unexpected server error. Please try again." },
      { status: 500 },
    );
  }
}
