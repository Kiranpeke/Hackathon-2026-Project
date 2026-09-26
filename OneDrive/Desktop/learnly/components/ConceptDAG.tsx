/**
 * components/ConceptDAG.tsx
 *
 * Interactive prerequisite concept graph.
 *
 * Renders the linear chain:
 *   Algebra → Polynomials → Factoring → Quadratics → Derivatives
 *
 * Mastery data is supplied entirely through props — nothing is hardcoded.
 * The parent controls which concept is highlighted via `selectedConcept`.
 */

"use client";

import { cn } from "@/lib/utils";
import { CONCEPTS, PREREQUISITE_EDGES, type ConceptId } from "@/lib/dag";
import {
  BookOpen,
  Sigma,
  Layers,
  SquareDivide,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MasteryStatus = "mastered" | "practicing" | "gap";

export interface ConceptMasteryData {
  /** p(Known) in [0, 1] */
  mastery: number;
  /** Derived mastery bucket */
  status: MasteryStatus;
}

export type ConceptMasteryMap = Partial<Record<ConceptId, ConceptMasteryData>>;

export interface ConceptDAGProps {
  /** Mastery data keyed by ConceptId. Missing concepts render as gap (0 %). */
  masteryData: ConceptMasteryMap;
  /** Optional concept to visually highlight (e.g. root gap found by diagnostic). */
  selectedConcept?: ConceptId | null;
  /** Callback fired when the user clicks a concept node. */
  onConceptClick?: (id: ConceptId) => void;
  /** Extra class names forwarded to the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ordered chain of concepts (left → right). */
const ORDERED_CONCEPTS: ConceptId[] = [
  "Algebra",
  "Polynomials",
  "Factoring",
  "Quadratics",
  "Derivatives",
];

/** Lucide icon for each concept. */
const CONCEPT_ICONS: Record<ConceptId, React.ElementType> = {
  Algebra: Sigma,
  Polynomials: BookOpen,
  Factoring: Layers,
  Quadratics: SquareDivide,
  Derivatives: TrendingUp,
};

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

/** Tailwind color tokens per mastery status. */
const STATUS_STYLES: Record<
  MasteryStatus,
  {
    ring: string;
    bg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    label: string;
  }
> = {
  mastered: {
    ring: "ring-emerald-500/70",
    bg: "bg-emerald-950/40",
    iconColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    glow: "shadow-emerald-500/20",
    label: "Mastered",
  },
  practicing: {
    ring: "ring-amber-400/70",
    bg: "bg-amber-950/30",
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-400/20",
    badgeText: "text-amber-300",
    glow: "shadow-amber-400/20",
    label: "Practicing",
  },
  gap: {
    ring: "ring-rose-500/70",
    bg: "bg-rose-950/30",
    iconColor: "text-rose-400",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    glow: "shadow-rose-500/20",
    label: "Gap",
  },
};

const STATUS_ICONS: Record<MasteryStatus, React.ElementType> = {
  mastered: CheckCircle2,
  practicing: Clock3,
  gap: AlertCircle,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ConceptNodeProps {
  id: ConceptId;
  data: ConceptMasteryData;
  isSelected: boolean;
  onClick?: (id: ConceptId) => void;
}

function ConceptNode({ id, data, isSelected, onClick }: ConceptNodeProps) {
  const concept = CONCEPTS[id];
  const styles = STATUS_STYLES[data.status];
  const Icon = CONCEPT_ICONS[id];
  const StatusIcon = STATUS_ICONS[data.status];
  const pct = Math.round(data.mastery * 100);

  return (
    <button
      type="button"
      aria-label={`${concept.label}: ${styles.label} at ${pct}% mastery`}
      aria-pressed={isSelected}
      onClick={() => onClick?.(id)}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl p-5",
        "border ring-2 transition-all duration-300 cursor-pointer",
        "min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px]",
        "border-white/10 bg-zinc-900/80 backdrop-blur-sm",
        styles.ring,
        styles.bg,
        "shadow-lg",
        styles.glow,
        isSelected &&
          "ring-4 scale-105 border-white/30 shadow-2xl",
        "hover:scale-105 hover:border-white/20 focus-visible:outline-none focus-visible:ring-white/50",
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white animate-pulse"
        />
      )}

      {/* Concept icon */}
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          "bg-white/5 ring-1 ring-white/10",
          styles.iconColor,
        )}
      >
        <Icon size={22} aria-hidden="true" />
      </div>

      {/* Name */}
      <span className="text-sm font-semibold text-zinc-100 text-center leading-tight">
        {concept.label}
      </span>

      {/* Mastery percentage bar */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Mastery</span>
          <span className={cn("font-bold tabular-nums", styles.iconColor)}>
            {pct}%
          </span>
        </div>
        <div
          className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${concept.label} mastery progress`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              data.status === "mastered" && "bg-emerald-400",
              data.status === "practicing" && "bg-amber-400",
              data.status === "gap" && "bg-rose-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          styles.badgeBg,
          styles.badgeText,
        )}
      >
        <StatusIcon size={11} aria-hidden="true" />
        <span>{styles.label}</span>
      </div>
    </button>
  );
}

/** Directional arrow between two concept nodes. */
function Arrow({ fromId, toId }: { fromId: ConceptId; toId: ConceptId }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 px-1"
      aria-label={`${fromId} is a prerequisite of ${toId}`}
      role="img"
    >
      <ChevronRight
        size={24}
        className="text-zinc-500 transition-colors"
        aria-hidden="true"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400"
      aria-label="Mastery status legend"
    >
      {(["mastered", "practicing", "gap"] as MasteryStatus[]).map((s) => {
        const st = STATUS_STYLES[s];
        const Icon = STATUS_ICONS[s];
        return (
          <div key={s} className="flex items-center gap-1.5">
            <Icon size={13} className={st.iconColor} aria-hidden="true" />
            <span className={st.badgeText}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const FALLBACK_DATA: ConceptMasteryData = { mastery: 0, status: "gap" };

export default function ConceptDAG({
  masteryData,
  selectedConcept,
  onConceptClick,
  className,
}: ConceptDAGProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-6 sm:p-8",
        "shadow-2xl shadow-black/40",
        className,
      )}
      aria-label="Prerequisite concept graph"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight text-zinc-100">
          Learning Path
        </h2>
        <p className="text-sm text-zinc-500">
          Prerequisite concepts — master each to unlock the next.
        </p>
      </div>

      {/* Graph: horizontal scroll on narrow screens */}
      <div
        className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2"
        role="list"
        aria-label="Concept prerequisite chain"
      >
        <div className="flex items-center gap-0">
          {ORDERED_CONCEPTS.map((id, idx) => {
            const data = masteryData[id] ?? FALLBACK_DATA;
            const isSelected = selectedConcept === id;

            // Find the edge that points to this node (to get the prerequisite)
            const edge = PREREQUISITE_EDGES.find((e) => e.dependent === id);

            return (
              <div
                key={id}
                className="flex items-center"
                role="listitem"
              >
                {/* Arrow from the previous node */}
                {idx > 0 && edge && (
                  <Arrow fromId={edge.prerequisite} toId={id} />
                )}

                <ConceptNode
                  id={id}
                  data={data}
                  isSelected={isSelected}
                  onClick={onConceptClick}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 border-t border-white/5 pt-5">
        <Legend />
      </div>
    </section>
  );
}
