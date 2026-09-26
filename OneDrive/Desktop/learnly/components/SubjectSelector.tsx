/**
 * components/SubjectSelector.tsx
 *
 * Multi-subject selector for Learnly Step 9+.
 *
 * Available: ADSA, AT, DBMS
 * Coming Soon: AMT, Java, SQL
 *
 * State is NOT owned here — the parent passes selectedSubjectId and
 * receives changes via onSubjectSelect (passing the full SubjectDefinition).
 */

"use client";

import { cn } from "@/lib/utils";
import {
  Brain,
  Cpu,
  Database,
  Calculator,
  Coffee,
  Code2,
  Lock,
} from "lucide-react";
import type { SubjectDefinition } from "@/lib/subjects";
import { ALL_SUBJECTS } from "@/lib/subjects";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Icon registry for subject tiles
// ---------------------------------------------------------------------------

const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  Brain, Cpu, Database, Calculator, Coffee, Code2,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubjectSelectorProps {
  /** Currently active subject ID (controlled by parent). */
  selectedSubjectId: string;
  /** Called when the user clicks an available subject tile. */
  onSubjectSelect: (subject: SubjectDefinition) => void;
  /** Extra class names forwarded to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Single subject tile
// ---------------------------------------------------------------------------

function SubjectTile({
  subject,
  isSelected,
  onSelect,
}: {
  subject: SubjectDefinition;
  isSelected: boolean;
  onSelect: (s: SubjectDefinition) => void;
}) {
  const disabled = subject.status === "coming-soon";
  const Icon: LucideIcon = SUBJECT_ICON_MAP[subject.icon] ?? Brain;

  return (
    <button
      type="button"
      id={`subject-tile-${subject.id}`}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={
        disabled ? `${subject.shortName} — Coming Soon` : `Select ${subject.name}`
      }
      onClick={() => !disabled && onSelect(subject)}
      className={cn(
        // Base layout
        "relative flex flex-col items-start gap-2.5 rounded-2xl p-4 text-left",
        "border transition-all duration-200",
        "w-full sm:w-auto sm:min-w-[140px]",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60",

        // ── Available + selected ──────────────────────────────────────────
        !disabled && isSelected && [
          "border-amber-700/60",
          "bg-amber-950/40",
          "shadow-lg shadow-amber-900/20",
        ],

        // ── Available + unselected ────────────────────────────────────────
        !disabled && !isSelected && [
          "border-stone-700/50",
          "bg-stone-900/30",
          "hover:border-stone-600 hover:bg-stone-800/40",
          "cursor-pointer",
        ],

        // ── Coming soon ───────────────────────────────────────────────────
        disabled && [
          "border-stone-800/40",
          "bg-stone-900/10",
          "opacity-40 cursor-not-allowed",
        ],
      )}
    >
      {/* Coming Soon badge */}
      {disabled && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-stone-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-600"
        >
          <Lock size={7} />
          Soon
        </span>
      )}

      {/* Active indicator */}
      {isSelected && !disabled && (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_2px_rgba(245,158,11,0.4)]"
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          "border transition-colors duration-200",
          isSelected && !disabled
            ? "border-amber-700/50 bg-amber-900/40 text-amber-400"
            : "border-stone-700/40 bg-stone-800/50 text-stone-500",
          disabled && "text-stone-700 border-stone-800",
        )}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>

      {/* Text */}
      <div>
        <p
          className={cn(
            "text-sm font-bold leading-tight tracking-tight",
            isSelected && !disabled ? "text-amber-300" : "text-stone-300",
            disabled && "text-stone-700",
          )}
        >
          {subject.shortName}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[10px] leading-snug",
            isSelected && !disabled ? "text-amber-600/80" : "text-stone-600",
            disabled && "text-stone-800",
          )}
        >
          {subject.status === "coming-soon" ? "Coming soon" : subject.description.split(" ").slice(0, 3).join(" ") + "…"}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SubjectSelector({
  selectedSubjectId,
  onSubjectSelect,
  className,
}: SubjectSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-stone-500">
          Subject
        </h2>
      </div>

      <div
        className="flex flex-wrap gap-2 sm:flex-nowrap"
        role="radiogroup"
        aria-label="Available subjects"
      >
        {ALL_SUBJECTS.map((subject) => (
          <SubjectTile
            key={subject.id}
            subject={subject}
            isSelected={selectedSubjectId === subject.id}
            onSelect={onSubjectSelect}
          />
        ))}
      </div>
    </div>
  );
}
