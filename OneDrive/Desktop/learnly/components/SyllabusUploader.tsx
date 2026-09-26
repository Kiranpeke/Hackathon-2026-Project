/**
 * components/SyllabusUploader.tsx
 *
 * Step 10 — Syllabus upload and AI parse flow.
 *
 * Phases:
 *  1. idle     — drag-and-drop / click-to-browse area
 *  2. selected — file chosen, ready to upload
 *  3. parsing  — API call in progress
 *  4. done     — show parsed concept map, "Start Learning" CTA
 *  5. error    — show message + retry
 *
 * Visual identity: warm stone, amber accent, Dogstudio editorial layout.
 * Upload area: Lusion-inspired interactive depth (subtle scale on drag).
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedSyllabus, ParsedConcept } from "@/lib/syllabus";
import { saveSyllabusToSession } from "@/lib/syllabus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "idle" | "selected" | "parsing" | "done" | "error";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConceptPill({ concept, index }: { concept: ParsedConcept; index: number }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-stone-800/60 bg-stone-900/40 px-4 py-3 animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <BookOpen size={13} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-300 truncate">{concept.label}</p>
        <p className="text-[10px] text-stone-600 leading-relaxed mt-0.5 line-clamp-2">
          {concept.description}
        </p>
      </div>
    </div>
  );
}

function PrereqBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-800 px-3 py-1 text-[10px] text-stone-500">
      {count} prerequisite {count === 1 ? "link" : "links"} mapped
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SyllabusUploader() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File validation ────────────────────────────────────────────────────────
  function validateFile(f: File): string | null {
    const name = f.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md")) {
      return "Please upload a .txt or .md file. (Copy your syllabus into Notepad and save as .txt)";
    }
    if (f.size > 10 * 1024 * 1024) {
      return "File too large — maximum 10 MB.";
    }
    return null;
  }

  function selectFile(f: File) {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setPhase("error");
      return;
    }
    setFile(f);
    setError(null);
    setPhase("selected");
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Parse ──────────────────────────────────────────────────────────────────
  async function handleParse() {
    if (!file) return;
    setPhase("parsing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/syllabus/parse", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Analysis failed. Please try again.");
      }

      setParsed(json.data as ParsedSyllabus);
      setProvider(json.provider ?? "");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  // ── Start learning ─────────────────────────────────────────────────────────
  function handleStartLearning() {
    if (!parsed) return;
    saveSyllabusToSession(parsed);
    router.push("/learn/custom");
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    setPhase("idle");
    setFile(null);
    setParsed(null);
    setError(null);
    setProvider("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // =========================================================================
  // Render — Idle / Selected / Error states
  // =========================================================================

  if (phase !== "done") {
    return (
      <div className="space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => phase !== "parsing" && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload syllabus file — click or drag and drop"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4",
            "rounded-2xl border-2 border-dashed px-8 py-14 text-center",
            "cursor-pointer select-none transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            dragOver
              ? "border-amber-500/50 bg-amber-950/20 scale-[1.01]"
              : phase === "selected"
              ? "border-stone-700 bg-stone-900/30"
              : "border-stone-800 bg-stone-900/20 hover:border-stone-700 hover:bg-stone-900/30",
            phase === "parsing" && "pointer-events-none opacity-70",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            id="syllabus-file-input"
            accept=".txt,.md"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) selectFile(f);
            }}
            aria-label="Choose a syllabus file"
          />

          {phase === "parsing" ? (
            <>
              <div className="relative">
                <Loader2 size={32} className="animate-spin text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-200">Analyzing your syllabus…</p>
                <p className="text-xs text-stone-600 mt-1">
                  Gemini is extracting concepts and prerequisites
                </p>
              </div>
            </>
          ) : phase === "selected" && file ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/15 border border-amber-600/20">
                <FileText size={22} className="text-amber-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-200 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-stone-600 mt-1">
                  {(file.size / 1024).toFixed(0)} KB — click to change
                </p>
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
                  "bg-stone-800/60 border border-stone-700/60",
                  dragOver && "bg-amber-900/30 border-amber-600/40",
                )}
              >
                <Upload size={22} className={cn("text-stone-500", dragOver && "text-amber-500")} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-300">
                  Drop your syllabus here
                </p>
                <p className="text-xs text-stone-600 mt-1">
                  or click to browse &mdash; .txt or .md &middot; max 10 MB
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {(phase === "error" || error) && error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-800/40 bg-red-900/15 px-4 py-3"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 text-stone-600 hover:text-stone-400"
              aria-label="Dismiss error"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="syllabus-analyse-btn"
            onClick={handleParse}
            disabled={!file || phase === "parsing"}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3.5",
              "text-sm font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              !file || phase === "parsing"
                ? "bg-stone-800 text-stone-600 cursor-not-allowed"
                : "bg-stone-100 text-stone-900 hover:bg-white hover:-translate-y-0.5 shadow-xl shadow-stone-950/60",
            )}
          >
            {phase === "parsing" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {phase === "parsing" ? "Analyzing…" : "Analyse Syllabus"}
            {phase !== "parsing" && <ArrowRight size={14} aria-hidden="true" />}
          </button>

          {file && phase !== "parsing" && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl px-4 py-3.5 text-xs text-stone-600 hover:text-stone-400 border border-stone-800 hover:border-stone-700 transition-colors"
              aria-label="Remove file and start over"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render — Done: show parsed concept map
  // =========================================================================

  if (!parsed) return null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Success header */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-800/40 bg-emerald-900/10 px-4 py-3">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-emerald-300">
            Syllabus analyzed successfully
          </p>
          <p className="text-[10px] text-stone-600 mt-0.5">
            via {provider} · {parsed.concepts.length} concepts extracted
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 text-stone-600 hover:text-stone-400"
          aria-label="Upload a different syllabus"
        >
          <X size={13} />
        </button>
      </div>

      {/* Subject name */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-1">Subject</p>
        <p className="text-xl font-bold text-stone-100">{parsed.subjectName}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-bold tracking-wider text-amber-600">
            {parsed.subjectCode}
          </span>
          <PrereqBadge count={parsed.prerequisites.length} />
        </div>
      </div>

      {/* Concept list */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3">
          Learning Path — {parsed.concepts.length} concepts
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {parsed.concepts.map((c, i) => (
            <ConceptPill key={c.id} concept={c} index={i} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        id="syllabus-start-learning-btn"
        onClick={handleStartLearning}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl px-6 py-4",
          "text-sm font-semibold bg-amber-600 text-white",
          "hover:bg-amber-500 hover:-translate-y-0.5",
          "transition-all duration-200 shadow-xl shadow-amber-900/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        )}
      >
        Start Learning
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <p className="text-center text-[10px] text-stone-700">
        Your personalized adaptive path begins now. Progress is tracked in your session.
      </p>
    </div>
  );
}
