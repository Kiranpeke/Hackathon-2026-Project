/**
 * components/SubjectConceptDAG.tsx
 *
 * Generic subject-aware knowledge map.
 * Replaces the Mathematics-specific ConceptDAG for Step 9+ subjects.
 *
 * Renders the selected subject's concepts as a compact scrollable grid,
 * colour-coded by mastery status. Prerequisite structure is reflected in the
 * display order; the active/selected concept is highlighted prominently.
 *
 * No BKT logic here. No AI calls here. Pure display.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { SubjectDefinition, MasteryStatus } from "@/lib/subjects";
import {
  BookOpen, Clock, LayoutGrid, Link, Layers, Repeat, ArrowUpDown,
  GitBranch, Search, Network, Navigation, Brain, Cpu, Calculator,
  Code, ArrowRight, Tags, Server, Database, Share2, Filter,
  CheckSquare, RefreshCw, ShieldCheck, Key, Table, Merge,
  Workflow, Braces, Coffee, Code2, Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Icon registry (resolves string icon names from SubjectConcept)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Clock, LayoutGrid, Link, Layers, Repeat, ArrowUpDown,
  GitBranch, Search, Network, Navigation, Brain, Cpu, Calculator,
  Code, ArrowRight, Tags, Server, Database, Share2, Filter,
  CheckSquare, RefreshCw, ShieldCheck, Key, Table, Merge,
  Workflow, Braces, Coffee, Code2, Link2,
  // Puzzle alias (lucide exports it as Puzzle in newer versions)
  Puzzle: Brain, // fallback
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? BookOpen;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectConceptMasteryData {
  mastery: number; // pKnown ∈ [0, 1]
  status: MasteryStatus;
}

export interface SubjectConceptDAGProps {
  subject: SubjectDefinition;
  masteryData: Record<string, SubjectConceptMasteryData>;
  selectedConcept: string | null;
  onConceptClick?: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Status → colour tokens
// ---------------------------------------------------------------------------

function statusColors(status: MasteryStatus, selected: boolean) {
  const base = {
    gap:       { border: "border-red-600/40",     bg: "bg-red-900/20",     dot: "bg-red-500",     text: "text-red-400"     },
    practicing:{ border: "border-amber-600/40",   bg: "bg-amber-900/20",   dot: "bg-amber-500",   text: "text-amber-400"   },
    mastered:  { border: "border-emerald-600/40", bg: "bg-emerald-900/20", dot: "bg-emerald-500", text: "text-emerald-400" },
  }[status];

  return {
    ...base,
    ring: selected ? "ring-2 ring-amber-500/70 ring-offset-1 ring-offset-stone-950" : "",
  };
}

// ---------------------------------------------------------------------------
// Single concept card
// ---------------------------------------------------------------------------

function ConceptCard({
  concept,
  mastery,
  status,
  selected,
  onClick,
}: {
  concept: SubjectDefinition["concepts"][number];
  mastery: number;
  status: MasteryStatus;
  selected: boolean;
  onClick?: () => void;
}) {
  const colors = statusColors(status, selected);
  const pct = Math.round(mastery * 100);
  // Resolve icon name → component and render via createElement (avoids
  // 'component created during render' lint rule triggered by `const Icon = …`)
  const IconComponent = resolveIcon(concept.icon);

  return (
    <button
      type="button"
      id={`concept-card-${concept.id}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${concept.label} — ${status}, ${pct}% mastery`}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-xl border p-3 text-left",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        "cursor-pointer hover:brightness-110 active:scale-[0.98]",
        colors.border,
        colors.bg,
        colors.ring,
      )}
    >
      {/* Status dot */}
      <span
        className={cn(
          "absolute right-2.5 top-2.5 h-2 w-2 rounded-full",
          colors.dot,
        )}
        aria-hidden="true"
      />

      {/* Icon + label */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
            "bg-stone-800 text-stone-400",
          )}
          aria-hidden="true"
        >
          {React.createElement(IconComponent, { size: 12 })}
        </div>
        <p
          className={cn(
            "line-clamp-1 text-xs font-semibold leading-tight",
            selected ? "text-amber-300" : "text-stone-300",
          )}
        >
          {concept.label}
        </p>
      </div>

      {/* Mastery bar */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-stone-800">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colors.dot)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Mastery % */}
      <p className={cn("text-[10px] tabular-nums", colors.text)}>
        {pct}% {status}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SubjectConceptDAG({
  subject,
  masteryData,
  selectedConcept,
  onConceptClick,
  className,
}: SubjectConceptDAGProps) {
  const orderedConcepts = subject.displayOrder
    .map((id) => subject.concepts.find((c) => c.id === id))
    .filter(Boolean) as SubjectDefinition["concepts"];

  // Count by status for the legend
  const counts = { gap: 0, practicing: 0, mastered: 0 };
  for (const c of orderedConcepts) {
    counts[masteryData[c.id]?.status ?? "gap"]++;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
          Gap ({counts.gap})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Practicing ({counts.practicing})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Mastered ({counts.mastered})
        </span>
      </div>

      {/* Concept grid */}
      <div
        className="grid grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-0.5"
        role="list"
        aria-label={`${subject.name} knowledge map`}
      >
        {orderedConcepts.map((concept) => {
          const data = masteryData[concept.id] ?? { mastery: 0.3, status: "gap" as MasteryStatus };
          return (
            <div key={concept.id} role="listitem">
              <ConceptCard
                concept={concept}
                mastery={data.mastery}
                status={data.status}
                selected={selectedConcept === concept.id}
                onClick={() => onConceptClick?.(concept.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
