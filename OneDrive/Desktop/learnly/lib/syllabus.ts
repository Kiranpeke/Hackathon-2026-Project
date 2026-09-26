/**
 * lib/syllabus.ts
 *
 * Types and utilities for Step 10 — Syllabus Upload & Parsing.
 *
 * The AI extracts a structured learning graph from raw syllabus text.
 * That graph is then converted into a SubjectDefinition that the existing
 * adaptive engine (SubjectDashboard) can consume directly.
 *
 * Storage strategy for Step 10:
 *   sessionStorage — persists within the browser tab.
 *   Supabase persistence will be added in a later step.
 */

import type { SubjectDefinition, SubjectConcept, SubjectEdge } from "@/lib/subjects";

// ---------------------------------------------------------------------------
// AI output shape
// ---------------------------------------------------------------------------

export interface ParsedConcept {
  id: string;          // camelCase identifier, e.g. "binarySearch"
  label: string;       // 2–4 word human label, e.g. "Binary Search"
  description: string; // 1-sentence description
}

export interface ParsedEdge {
  from: string; // prerequisite concept id
  to: string;   // dependent concept id
}

/** What the AI returns from a syllabus parse */
export interface ParsedSyllabus {
  subjectName: string; // e.g. "Operating Systems"
  subjectCode: string; // 2–5 char abbreviation, e.g. "OS"
  concepts: ParsedConcept[];
  prerequisites: ParsedEdge[];
}

// ---------------------------------------------------------------------------
// sessionStorage key
// ---------------------------------------------------------------------------

export const SYLLABUS_STORAGE_KEY = "learnly_custom_syllabus";

// ---------------------------------------------------------------------------
// Convert ParsedSyllabus → SubjectDefinition
// ---------------------------------------------------------------------------

/**
 * Converts the AI-parsed syllabus into a SubjectDefinition compatible
 * with the existing SubjectDashboard adaptive engine.
 *
 * Rules:
 *  - id         = "custom-" + slugified subjectCode
 *  - concepts   = all parsed concepts (icon defaults to "BookOpen")
 *  - edges      = parsed prerequisites
 *  - displayOrder = topological sort (leaf concepts first)
 *  - targetConceptId = last concept in display order (most advanced)
 *  - diagnosticQuestions = empty (AI generates them dynamically)
 */
export function parsedSyllabusToSubjectDef(parsed: ParsedSyllabus): SubjectDefinition {
  const id = `custom-${parsed.subjectCode.toLowerCase().replace(/\s+/g, "-")}`;

  const concepts: SubjectConcept[] = parsed.concepts.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    icon: "BookOpen",
  }));

  const edges: SubjectEdge[] = parsed.prerequisites.map((e) => ({
    from: e.from,
    to: e.to,
  }));

  const displayOrder = topologicalSort(
    parsed.concepts.map((c) => c.id),
    edges,
  );

  const targetConceptId = displayOrder[displayOrder.length - 1] ?? parsed.concepts[0]?.id ?? "concept0";

  return {
    id,
    name: parsed.subjectName,
    shortName: parsed.subjectCode,
    description: `Custom subject parsed from your uploaded syllabus.`,
    icon: "FileText",
    status: "available",
    targetConceptId,
    displayOrder,
    concepts,
    edges,
    diagnosticQuestions: {},
  };
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// ---------------------------------------------------------------------------

function topologicalSort(nodeIds: string[], edges: SubjectEdge[]): string[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }
  for (const { from, to } of edges) {
    if (adj[from] !== undefined && inDegree[to] !== undefined) {
      adj[from].push(to);
      inDegree[to]++;
    }
  }

  const queue = nodeIds.filter((id) => inDegree[id] === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of adj[node] ?? []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  // Append any remaining nodes (handles cycles gracefully)
  for (const id of nodeIds) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

// ---------------------------------------------------------------------------
// sessionStorage helpers (client-side only)
// ---------------------------------------------------------------------------

export function saveSyllabusToSession(parsed: ParsedSyllabus): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(parsed));
}

export function loadSyllabusFromSession(): ParsedSyllabus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SYLLABUS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ParsedSyllabus;
  } catch {
    return null;
  }
}

export function clearSyllabusSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SYLLABUS_STORAGE_KEY);
}
