/**
 * lib/dag.ts
 *
 * Prerequisite DAG (Directed Acyclic Graph) for mathematical concepts.
 *
 * Graph (edges point from prerequisite → dependent):
 *
 *   Algebra → Polynomials → Factoring → Quadratics → Derivatives
 *
 * The exported `findRootGapNode` function performs a backward DFS from a
 * target concept and returns the deepest foundational prerequisite whose
 * mastery probability is below the configured threshold.
 */

import { MASTERY_THRESHOLD } from "./bkt";

// ---------------------------------------------------------------------------
// Concept registry
// ---------------------------------------------------------------------------

/**
 * All concept identifiers in the prerequisite graph.
 * Using a string-literal union keeps the type narrow while staying extensible.
 */
export type ConceptId =
  | "Algebra"
  | "Polynomials"
  | "Factoring"
  | "Quadratics"
  | "Derivatives";

/** Human-readable metadata for a concept. */
export interface Concept {
  /** Unique identifier for the concept (used as the DB key). */
  id: ConceptId;
  /** Display name shown to students and teachers. */
  label: string;
  /** Short description of what the concept covers. */
  description: string;
}

/** A directed edge representing "source is a prerequisite of target". */
export interface PrerequisiteEdge {
  /** The prerequisite concept that must be mastered first. */
  prerequisite: ConceptId;
  /** The concept that depends on the prerequisite. */
  dependent: ConceptId;
}

/** The full DAG structure: nodes + edges. */
export interface ConceptDAG {
  concepts: Concept[];
  edges: PrerequisiteEdge[];
}

// ---------------------------------------------------------------------------
// Graph data
// ---------------------------------------------------------------------------

/** Metadata for every concept node. */
export const CONCEPTS: Record<ConceptId, Concept> = {
  Algebra: {
    id: "Algebra",
    label: "Algebra",
    description:
      "Foundational symbolic arithmetic: variables, equations, and inequalities.",
  },
  Polynomials: {
    id: "Polynomials",
    label: "Polynomials",
    description:
      "Expressions made of variables and coefficients with addition and multiplication.",
  },
  Factoring: {
    id: "Factoring",
    label: "Factoring",
    description:
      "Decomposing polynomials into products of simpler expressions.",
  },
  Quadratics: {
    id: "Quadratics",
    label: "Quadratics",
    description:
      "Second-degree polynomial equations and their roots (completing the square, quadratic formula).",
  },
  Derivatives: {
    id: "Derivatives",
    label: "Derivatives",
    description:
      "Rate of change of a function; introduction to differential calculus.",
  },
};

/**
 * Prerequisite edges defining the linear chain:
 *   Algebra → Polynomials → Factoring → Quadratics → Derivatives
 */
export const PREREQUISITE_EDGES: PrerequisiteEdge[] = [
  { prerequisite: "Algebra", dependent: "Polynomials" },
  { prerequisite: "Polynomials", dependent: "Factoring" },
  { prerequisite: "Factoring", dependent: "Quadratics" },
  { prerequisite: "Quadratics", dependent: "Derivatives" },
];

/** The complete prerequisite DAG. */
export const CONCEPT_DAG: ConceptDAG = {
  concepts: Object.values(CONCEPTS),
  edges: PREREQUISITE_EDGES,
};

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

/**
 * Builds an adjacency map from dependent → list of prerequisites.
 * (i.e. the reverse direction of the edges, used for backward traversal.)
 */
function buildPrerequisiteMap(
  edges: PrerequisiteEdge[],
): Map<ConceptId, ConceptId[]> {
  const map = new Map<ConceptId, ConceptId[]>();
  for (const { prerequisite, dependent } of edges) {
    const existing = map.get(dependent) ?? [];
    existing.push(prerequisite);
    map.set(dependent, existing);
  }
  return map;
}

// Pre-built at module load time for efficiency.
const PREREQUISITE_MAP = buildPrerequisiteMap(PREREQUISITE_EDGES);

/**
 * Returns the direct prerequisites of a concept (empty array if none).
 *
 * @param conceptId - The concept whose prerequisites you want.
 */
export function getPrerequisites(conceptId: ConceptId): ConceptId[] {
  return PREREQUISITE_MAP.get(conceptId) ?? [];
}

// ---------------------------------------------------------------------------
// Mastery map type
// ---------------------------------------------------------------------------

/**
 * A map from ConceptId to the student's current p(Known) for that concept.
 * Missing concepts are treated as p(Known) = 0 (no prior knowledge).
 */
export type MasteryMap = Partial<Record<ConceptId, number>>;

// ---------------------------------------------------------------------------
// findRootGapNode
// ---------------------------------------------------------------------------

/**
 * Performs a backward DFS from `targetConcept` through the prerequisite graph
 * and returns the **deepest foundational prerequisite** whose p(Known) is
 * below `masteryThreshold`.
 *
 * "Deepest" means furthest from the target — the root gap node is the most
 * foundational skill that is blocking the student. Fixing that gap first
 * ensures the student can make sequential progress.
 *
 * Algorithm
 * ---------
 * Starting from `targetConcept`, we recurse into each prerequisite. If a
 * prerequisite is itself not mastered, we recurse into *its* prerequisites
 * before deciding whether the current node is the gap. This post-order
 * traversal ensures we always surface the deepest unmastered concept.
 *
 * @param targetConcept    - The concept the student is trying to learn.
 * @param masteryMap       - Map of concept → current p(Known) for the student.
 * @param masteryThreshold - p(Known) threshold for mastery (default: 0.95).
 * @returns The deepest unmastered prerequisite ConceptId, or `null` if all
 *          prerequisites (including the target) are mastered.
 *
 * @example
 * const gaps = findRootGapNode("Derivatives", {
 *   Algebra: 0.97,
 *   Polynomials: 0.3,   // not mastered
 *   Factoring: 0.1,     // not mastered
 *   Quadratics: 0.05,   // not mastered
 * });
 * // => "Polynomials"  (deepest unmastered prerequisite; Algebra is mastered)
 */
export function findRootGapNode(
  targetConcept: ConceptId,
  masteryMap: MasteryMap,
  masteryThreshold: number = MASTERY_THRESHOLD,
): ConceptId | null {
  /**
   * Inner recursive DFS.
   * Returns the deepest unmastered ancestor of `node`, or `null` if all
   * ancestors (and `node` itself) are mastered.
   */
  function dfs(node: ConceptId, visited: Set<ConceptId>): ConceptId | null {
    if (visited.has(node)) {
      // Cycle guard (should not occur in a well-formed DAG, but defensive).
      return null;
    }
    visited.add(node);

    const prerequisites = getPrerequisites(node);

    // Recurse into prerequisites first (post-order: deepest gap wins).
    for (const prereq of prerequisites) {
      const deeperGap = dfs(prereq, visited);
      if (deeperGap !== null) {
        return deeperGap;
      }
    }

    // After checking deeper nodes, check this node itself.
    const pKnown = masteryMap[node] ?? 0;
    if (pKnown < masteryThreshold) {
      return node;
    }

    return null;
  }

  return dfs(targetConcept, new Set<ConceptId>());
}
