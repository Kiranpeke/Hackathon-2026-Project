/**
 * components/CustomDashboard.tsx
 *
 * Client component for /learn/custom.
 *
 * Reads the ParsedSyllabus from sessionStorage on mount, converts it to a
 * SubjectDefinition, then renders the existing SubjectDashboard.
 *
 * If no syllabus exists in session (e.g. direct URL navigation without uploading),
 * redirects to /upload immediately.
 */

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SubjectDashboard from "@/components/SubjectDashboard";
import type { SubjectDefinition } from "@/lib/subjects";
import {
  loadSyllabusFromSession,
  parsedSyllabusToSubjectDef,
} from "@/lib/syllabus";
import { Upload } from "lucide-react";

// ---------------------------------------------------------------------------
// Lazy initialiser — runs once on the client, never during SSR
// ---------------------------------------------------------------------------

function getSubjectDefFromSession(): SubjectDefinition | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = loadSyllabusFromSession();
    if (!parsed) return null;
    return parsedSyllabusToSubjectDef(parsed);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomDashboard() {
  const router = useRouter();
  // Read sessionStorage synchronously on first render (client-only).
  // This avoids the setState-in-effect pattern.
  const subjectDef = getSubjectDefFromSession();

  if (!subjectDef) {
    // Trigger redirect as a side-effect — safe because it runs after render
    // and does not call setState.
    if (typeof window !== "undefined") {
      router.replace("/upload");
    }

    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-sm text-stone-500">No syllabus found — redirecting to upload…</p>
          <Link
            href="/upload"
            className="mt-2 inline-flex items-center gap-2 text-xs text-stone-600 hover:text-stone-400 transition-colors"
          >
            <Upload size={11} />
            Upload a syllabus
          </Link>
        </div>
      </div>
    );
  }

  return <SubjectDashboard initialSubject={subjectDef} />;
}
