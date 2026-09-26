/**
 * lib/subjects.ts
 *
 * Subject configuration for Learnly's multi-subject adaptive system.
 *
 * Defines the concept graph, prerequisite edges, and diagnostic questions
 * for each available subject. This is the single source of truth for
 * subject content — nothing is hard-coded in React components.
 *
 * Subjects:
 *   Available  : ADSA, AT, DBMS
 *   Coming Soon: AMT, Java, SQL
 *
 * IMPORTANT:
 *  - BKT calculations stay in lib/bkt.ts
 *  - AI calls stay in lib/api.ts → POST /api/generate
 *  - findSubjectRootGap is the generic equivalent of findRootGapNode (lib/dag.ts)
 */

import { DEFAULT_BKT_PARAMS, MASTERY_THRESHOLD } from "@/lib/bkt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MasteryStatus = "gap" | "practicing" | "mastered";

export interface SubjectConcept {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name (resolved in component)
}

export interface SubjectEdge {
  /** The prerequisite concept (must be understood first). */
  from: string;
  /** The dependent concept that requires `from` as prerequisite. */
  to: string;
}

export interface SubjectDiagnosticQuestion {
  conceptId: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export type SubjectStatus = "available" | "coming-soon";

export interface SubjectDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string; // lucide icon name
  status: SubjectStatus;
  /** The most advanced concept tested in Phase 1 of the diagnostic. */
  targetConceptId: string;
  /** Concepts in topological display order (shallow → deep). */
  displayOrder: string[];
  concepts: SubjectConcept[];
  edges: SubjectEdge[];
  /** One diagnostic question per concept ID. */
  diagnosticQuestions: Record<string, SubjectDiagnosticQuestion>;
}

export interface SubjectMasteryData {
  mastery: number; // pKnown ∈ [0, 1]
  status: MasteryStatus;
}

// ---------------------------------------------------------------------------
// Root-gap traversal (generic, mirrors lib/dag.ts findRootGapNode)
// ---------------------------------------------------------------------------

const GAP_THRESHOLD = 0.4;

/**
 * Given a subject and the student's current pKnown values, finds the
 * earliest (root) prerequisite concept the student has not yet mastered.
 *
 * Uses the same DFS algorithm as lib/dag.ts findRootGapNode but works with
 * generic string concept IDs so it supports all subjects.
 *
 * @returns The concept ID of the root gap, or null if no gap exists.
 */
export function findSubjectRootGap(
  subject: SubjectDefinition,
  pKnownMap: Record<string, number>,
  masteryThreshold = MASTERY_THRESHOLD,
): string | null {
  const pKnown = (id: string) => pKnownMap[id] ?? DEFAULT_BKT_PARAMS.pKnown;
  const isGap = (id: string) => pKnown(id) < GAP_THRESHOLD;

  // Build: conceptId → list of prerequisite ids
  const prereqMap: Record<string, string[]> = {};
  for (const edge of subject.edges) {
    if (!prereqMap[edge.to]) prereqMap[edge.to] = [];
    prereqMap[edge.to].push(edge.from);
  }

  // DFS: walk backwards from `conceptId` through prerequisites,
  // returning the deepest gap we can find.
  function dfs(conceptId: string, visited = new Set<string>()): string | null {
    if (visited.has(conceptId)) return null;
    visited.add(conceptId);

    for (const prereqId of prereqMap[conceptId] ?? []) {
      if (pKnown(prereqId) >= masteryThreshold) continue; // mastered — skip
      const deeper = dfs(prereqId, visited);
      if (deeper !== null) return deeper; // found an even deeper gap
      if (isGap(prereqId)) return prereqId; // this prereq is the root gap
    }
    return null;
  }

  // If the target itself is mastered there is no gap
  if (pKnown(subject.targetConceptId) >= masteryThreshold) return null;

  // Walk backwards from the target to find the root gap
  const rootGap = dfs(subject.targetConceptId, new Set());
  // If no prerequisite gap found, the target itself is the gap
  return rootGap ?? (isGap(subject.targetConceptId) ? subject.targetConceptId : null);
}

// ---------------------------------------------------------------------------
// Helper: build initial pKnown map for a subject (all at BKT prior)
// ---------------------------------------------------------------------------

export function initialPKnownForSubject(
  subject: SubjectDefinition,
): Record<string, number> {
  return Object.fromEntries(
    subject.concepts.map((c) => [c.id, DEFAULT_BKT_PARAMS.pKnown]),
  );
}

// ---------------------------------------------------------------------------
// Helper: convert pKnown → MasteryStatus
// ---------------------------------------------------------------------------

export function pKnownToStatus(pKnown: number): MasteryStatus {
  if (pKnown >= MASTERY_THRESHOLD) return "mastered";
  if (pKnown >= GAP_THRESHOLD) return "practicing";
  return "gap";
}

// ---------------------------------------------------------------------------
// ADSA — Advanced Data Structures & Algorithms
// ---------------------------------------------------------------------------

export const ADSA_SUBJECT: SubjectDefinition = {
  id: "adsa",
  name: "Advanced Data Structures & Algorithms",
  shortName: "ADSA",
  description: "Data structures, algorithm design, and complexity analysis",
  icon: "Brain",
  status: "available",
  targetConceptId: "dynamic-programming",
  displayOrder: [
    "algorithm-fundamentals",
    "complexity-analysis",
    "arrays",
    "linked-lists",
    "stacks-queues",
    "recursion",
    "sorting",
    "trees",
    "binary-search-trees",
    "graphs",
    "graph-traversal",
    "dynamic-programming",
  ],
  concepts: [
    { id: "algorithm-fundamentals", label: "Algorithm Fundamentals", description: "What algorithms are and why they matter", icon: "BookOpen" },
    { id: "complexity-analysis", label: "Complexity Analysis", description: "Big-O notation and asymptotic analysis", icon: "Clock" },
    { id: "arrays", label: "Arrays", description: "Indexed, contiguous memory structures", icon: "LayoutGrid" },
    { id: "linked-lists", label: "Linked Lists", description: "Node-based dynamic structures", icon: "Link" },
    { id: "stacks-queues", label: "Stacks & Queues", description: "LIFO and FIFO abstract data types", icon: "Layers" },
    { id: "recursion", label: "Recursion", description: "Self-referential problem solving", icon: "Repeat" },
    { id: "sorting", label: "Sorting", description: "Ordering algorithms and their trade-offs", icon: "ArrowUpDown" },
    { id: "trees", label: "Trees", description: "Hierarchical non-linear structures", icon: "GitBranch" },
    { id: "binary-search-trees", label: "Binary Search Trees", description: "Ordered binary tree structures", icon: "Search" },
    { id: "graphs", label: "Graphs", description: "Vertices and edges — general relationships", icon: "Network" },
    { id: "graph-traversal", label: "Graph Traversal", description: "DFS and BFS graph exploration", icon: "Navigation" },
    { id: "dynamic-programming", label: "Dynamic Programming", description: "Optimal substructure and memoization", icon: "Puzzle" },
  ],
  edges: [
    { from: "algorithm-fundamentals", to: "complexity-analysis" },
    { from: "complexity-analysis", to: "arrays" },
    { from: "arrays", to: "linked-lists" },
    { from: "linked-lists", to: "stacks-queues" },
    { from: "arrays", to: "recursion" },
    { from: "arrays", to: "sorting" },
    { from: "recursion", to: "trees" },
    { from: "trees", to: "binary-search-trees" },
    { from: "complexity-analysis", to: "graphs" },
    { from: "graphs", to: "graph-traversal" },
    { from: "binary-search-trees", to: "dynamic-programming" },
    { from: "graph-traversal", to: "dynamic-programming" },
  ],
  diagnosticQuestions: {
    "dynamic-programming": {
      conceptId: "dynamic-programming",
      text: "What are the two essential properties that make a problem solvable by dynamic programming?",
      options: [
        "Recursion and backtracking",
        "Optimal substructure and overlapping subproblems",
        "Greedy choice and feasibility",
        "Divide and conquer with no overlap",
      ],
      correctIndex: 1,
    },
    "graph-traversal": {
      conceptId: "graph-traversal",
      text: "Which algorithm uses a queue and visits all neighbours of a node before moving deeper?",
      options: ["Depth-First Search", "Breadth-First Search", "Dijkstra's", "Prim's"],
      correctIndex: 1,
    },
    "graphs": {
      conceptId: "graphs",
      text: "Which data structure most efficiently represents a sparse graph?",
      options: ["Adjacency matrix", "Adjacency list", "Hash table", "Stack"],
      correctIndex: 1,
    },
    "binary-search-trees": {
      conceptId: "binary-search-trees",
      text: "What is the time complexity of searching in a balanced Binary Search Tree?",
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
      correctIndex: 2,
    },
    "trees": {
      conceptId: "trees",
      text: "In a tree with n nodes, how many edges does it have?",
      options: ["n", "n − 1", "n + 1", "2n − 1"],
      correctIndex: 1,
    },
    "sorting": {
      conceptId: "sorting",
      text: "What is the average-case time complexity of Merge Sort?",
      options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"],
      correctIndex: 1,
    },
    "recursion": {
      conceptId: "recursion",
      text: "What is required to ensure a recursive function terminates?",
      options: ["A loop condition", "A base case", "A return type", "Multiple parameters"],
      correctIndex: 1,
    },
    "stacks-queues": {
      conceptId: "stacks-queues",
      text: "Which data structure follows LIFO (Last In, First Out) order?",
      options: ["Queue", "Heap", "Stack", "Array"],
      correctIndex: 2,
    },
    "linked-lists": {
      conceptId: "linked-lists",
      text: "What is the time complexity of inserting a node at the head of a singly linked list?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
      correctIndex: 2,
    },
    "arrays": {
      conceptId: "arrays",
      text: "What is the time complexity of accessing an element by index in an array?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
      correctIndex: 2,
    },
    "complexity-analysis": {
      conceptId: "complexity-analysis",
      text: "An algorithm with O(n²) complexity has a runtime that grows:",
      options: ["Linearly with input", "Quadratically with input", "Logarithmically with input", "Independently of input"],
      correctIndex: 1,
    },
    "algorithm-fundamentals": {
      conceptId: "algorithm-fundamentals",
      text: "Which of the following best describes an algorithm?",
      options: [
        "A programming language construct",
        "A finite, step-by-step procedure that solves a well-defined problem",
        "A random sequence of instructions",
        "A hardware-specific instruction set",
      ],
      correctIndex: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// AT — Automata Theory
// ---------------------------------------------------------------------------

export const AT_SUBJECT: SubjectDefinition = {
  id: "automata-theory",
  name: "Automata Theory",
  shortName: "AT",
  description: "Formal languages, automata, grammars, and computability",
  icon: "Cpu",
  status: "available",
  targetConceptId: "turing-machines",
  displayOrder: [
    "math-prelim",
    "formal-languages",
    "regular-expressions",
    "finite-automata",
    "dfa",
    "nfa",
    "regular-languages",
    "context-free-grammars",
    "pushdown-automata",
    "turing-machines",
  ],
  concepts: [
    { id: "math-prelim", label: "Math Preliminaries", description: "Sets, relations, and proof techniques", icon: "Calculator" },
    { id: "formal-languages", label: "Formal Languages", description: "Alphabets, strings, and language definitions", icon: "BookOpen" },
    { id: "regular-expressions", label: "Regular Expressions", description: "Pattern notation for regular languages", icon: "Code" },
    { id: "finite-automata", label: "Finite Automata", description: "Finite-state machines overview", icon: "Workflow" },
    { id: "dfa", label: "DFA", description: "Deterministic Finite Automaton", icon: "ArrowRight" },
    { id: "nfa", label: "NFA", description: "Non-deterministic Finite Automaton", icon: "GitBranch" },
    { id: "regular-languages", label: "Regular Languages", description: "Closure properties and characterisation", icon: "Tags" },
    { id: "context-free-grammars", label: "Context-Free Grammars", description: "Productions rules and derivations", icon: "Braces" },
    { id: "pushdown-automata", label: "Pushdown Automata", description: "Finite automaton with a stack", icon: "Layers" },
    { id: "turing-machines", label: "Turing Machines", description: "Universal model of computation", icon: "Server" },
  ],
  edges: [
    { from: "math-prelim", to: "formal-languages" },
    { from: "formal-languages", to: "regular-expressions" },
    { from: "formal-languages", to: "finite-automata" },
    { from: "regular-expressions", to: "dfa" },
    { from: "finite-automata", to: "dfa" },
    { from: "finite-automata", to: "nfa" },
    { from: "dfa", to: "regular-languages" },
    { from: "nfa", to: "regular-languages" },
    { from: "formal-languages", to: "context-free-grammars" },
    { from: "context-free-grammars", to: "pushdown-automata" },
    { from: "pushdown-automata", to: "turing-machines" },
  ],
  diagnosticQuestions: {
    "turing-machines": {
      conceptId: "turing-machines",
      text: "What key capability does a Turing Machine have that a Pushdown Automaton lacks?",
      options: [
        "An infinite read/write tape with random access",
        "A finite set of states",
        "The ability to accept regular languages",
        "Non-determinism",
      ],
      correctIndex: 0,
    },
    "pushdown-automata": {
      conceptId: "pushdown-automata",
      text: "What additional component does a Pushdown Automaton have compared to a Finite Automaton?",
      options: ["An infinite tape", "A stack", "A queue", "Multiple tapes"],
      correctIndex: 1,
    },
    "context-free-grammars": {
      conceptId: "context-free-grammars",
      text: "Context-Free Grammars generate which class of languages?",
      options: ["Regular languages", "Recursively enumerable languages", "Context-free languages", "Decidable languages"],
      correctIndex: 2,
    },
    "regular-languages": {
      conceptId: "regular-languages",
      text: "Which automaton recognises exactly the class of regular languages?",
      options: ["Pushdown Automaton", "Turing Machine", "Finite Automaton", "Linear Bounded Automaton"],
      correctIndex: 2,
    },
    "nfa": {
      conceptId: "nfa",
      text: "An NFA differs from a DFA because it can have:",
      options: [
        "Multiple initial states",
        "No accepting states",
        "Multiple or zero transitions for a single input symbol",
        "No transitions",
      ],
      correctIndex: 2,
    },
    "dfa": {
      conceptId: "dfa",
      text: "In a DFA, for each state and each input symbol, there is:",
      options: ["Zero or more transitions", "Exactly one transition", "At most two transitions", "At least two transitions"],
      correctIndex: 1,
    },
    "finite-automata": {
      conceptId: "finite-automata",
      text: "A Finite Automaton is characterised by:",
      options: [
        "An infinite memory tape",
        "A finite set of states, an alphabet, and a transition function",
        "A stack for memory",
        "Non-deterministic choice only",
      ],
      correctIndex: 1,
    },
    "regular-expressions": {
      conceptId: "regular-expressions",
      text: "In a regular expression, what does the Kleene star (*) operator represent?",
      options: ["One or more occurrences", "Zero or one occurrence", "Zero or more occurrences", "Exactly two occurrences"],
      correctIndex: 2,
    },
    "formal-languages": {
      conceptId: "formal-languages",
      text: "A formal language is a set of strings defined over:",
      options: ["A set of grammar rules", "An alphabet (finite set of symbols)", "A stack of symbols", "A set of states"],
      correctIndex: 1,
    },
    "math-prelim": {
      conceptId: "math-prelim",
      text: "Which proof technique is commonly used to prove statements about all natural numbers?",
      options: ["Trial and error", "Mathematical induction", "Random sampling", "Approximation"],
      correctIndex: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// DBMS — Database Management Systems
// ---------------------------------------------------------------------------

export const DBMS_SUBJECT: SubjectDefinition = {
  id: "dbms",
  name: "Database Management Systems",
  shortName: "DBMS",
  description: "Relational theory, SQL, normalisation, and transactions",
  icon: "Database",
  status: "available",
  targetConceptId: "normal-forms",
  displayOrder: [
    "db-fundamentals",
    "er-model",
    "relational-model",
    "keys",
    "functional-dependencies",
    "normalization",
    "normal-forms",
    "sql-fundamentals",
    "joins",
    "transactions",
    "acid-properties",
  ],
  concepts: [
    { id: "db-fundamentals", label: "DB Fundamentals", description: "Database concepts and terminology", icon: "Database" },
    { id: "er-model", label: "ER Model", description: "Entity-relationship data modelling", icon: "Share2" },
    { id: "relational-model", label: "Relational Model", description: "Relations, tuples, and attributes", icon: "Table" },
    { id: "keys", label: "Keys", description: "Primary, foreign, and candidate keys", icon: "Key" },
    { id: "functional-dependencies", label: "Functional Dependencies", description: "FD rules and inference axioms", icon: "Link2" },
    { id: "normalization", label: "Normalization", description: "Reducing redundancy in schema design", icon: "Filter" },
    { id: "normal-forms", label: "Normal Forms", description: "1NF, 2NF, 3NF, BCNF", icon: "CheckSquare" },
    { id: "sql-fundamentals", label: "SQL Fundamentals", description: "SELECT, INSERT, UPDATE, DELETE", icon: "Code" },
    { id: "joins", label: "Joins", description: "INNER, LEFT, RIGHT, FULL joins", icon: "Merge" },
    { id: "transactions", label: "Transactions", description: "BEGIN, COMMIT, ROLLBACK semantics", icon: "RefreshCw" },
    { id: "acid-properties", label: "ACID Properties", description: "Atomicity, Consistency, Isolation, Durability", icon: "ShieldCheck" },
  ],
  edges: [
    { from: "db-fundamentals", to: "er-model" },
    { from: "er-model", to: "relational-model" },
    { from: "relational-model", to: "keys" },
    { from: "keys", to: "functional-dependencies" },
    { from: "functional-dependencies", to: "normalization" },
    { from: "normalization", to: "normal-forms" },
    { from: "relational-model", to: "sql-fundamentals" },
    { from: "sql-fundamentals", to: "joins" },
    { from: "db-fundamentals", to: "transactions" },
    { from: "transactions", to: "acid-properties" },
  ],
  diagnosticQuestions: {
    "normal-forms": {
      conceptId: "normal-forms",
      text: "Which normal form eliminates transitive functional dependencies?",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      correctIndex: 2,
    },
    "normalization": {
      conceptId: "normalization",
      text: "The primary goal of database normalization is to:",
      options: [
        "Speed up all queries",
        "Reduce data redundancy and update anomalies",
        "Increase storage capacity",
        "Add more tables to the schema",
      ],
      correctIndex: 1,
    },
    "functional-dependencies": {
      conceptId: "functional-dependencies",
      text: "If A → B, this means:",
      options: [
        "B uniquely determines A",
        "A and B are independent",
        "A uniquely determines B",
        "A and B are equal",
      ],
      correctIndex: 2,
    },
    "keys": {
      conceptId: "keys",
      text: "Which key uniquely identifies each record in a relational table?",
      options: ["Foreign key", "Candidate key", "Primary key", "Composite key"],
      correctIndex: 2,
    },
    "relational-model": {
      conceptId: "relational-model",
      text: "In the relational model, data is organised into:",
      options: ["Trees", "Graphs", "Tables (relations)", "Linked lists"],
      correctIndex: 2,
    },
    "er-model": {
      conceptId: "er-model",
      text: "In an ER diagram, which shape represents an entity?",
      options: ["Diamond", "Ellipse", "Rectangle", "Triangle"],
      correctIndex: 2,
    },
    "sql-fundamentals": {
      conceptId: "sql-fundamentals",
      text: "Which SQL command retrieves data from a table?",
      options: ["INSERT", "UPDATE", "SELECT", "DELETE"],
      correctIndex: 2,
    },
    "joins": {
      conceptId: "joins",
      text: "Which type of JOIN returns rows only when there is a match in both tables?",
      options: ["LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "INNER JOIN"],
      correctIndex: 3,
    },
    "transactions": {
      conceptId: "transactions",
      text: "Which SQL command permanently saves all changes made in a transaction?",
      options: ["ROLLBACK", "SAVEPOINT", "COMMIT", "BEGIN"],
      correctIndex: 2,
    },
    "acid-properties": {
      conceptId: "acid-properties",
      text: "The 'Atomicity' property of a transaction means:",
      options: [
        "Data remains accurate at all times",
        "The transaction either completes fully or has no effect",
        "Multiple users can access data simultaneously",
        "Data persists after a system failure",
      ],
      correctIndex: 1,
    },
    "db-fundamentals": {
      conceptId: "db-fundamentals",
      text: "A database is best described as:",
      options: [
        "A programming language",
        "An organised, structured collection of data managed by software",
        "A type of computer network",
        "A hardware storage component",
      ],
      correctIndex: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// Coming Soon subjects (stubs)
// ---------------------------------------------------------------------------

const COMING_SOON_BASE: Omit<SubjectDefinition, "id" | "name" | "shortName" | "description" | "icon"> = {
  status: "coming-soon",
  targetConceptId: "",
  displayOrder: [],
  concepts: [],
  edges: [],
  diagnosticQuestions: {},
};

export const AMT_SUBJECT: SubjectDefinition = {
  ...COMING_SOON_BASE,
  id: "amt",
  name: "AMT",
  shortName: "AMT",
  description: "Advanced Mathematics Topics",
  icon: "Calculator",
};

export const JAVA_SUBJECT: SubjectDefinition = {
  ...COMING_SOON_BASE,
  id: "java",
  name: "Java",
  shortName: "Java",
  description: "Object-oriented programming with Java",
  icon: "Coffee",
};

export const SQL_SUBJECT: SubjectDefinition = {
  ...COMING_SOON_BASE,
  id: "sql",
  name: "SQL",
  shortName: "SQL",
  description: "Structured Query Language deep dive",
  icon: "Code2",
};

// ---------------------------------------------------------------------------
// Subject registry
// ---------------------------------------------------------------------------

export const ALL_SUBJECTS: SubjectDefinition[] = [
  ADSA_SUBJECT,
  AT_SUBJECT,
  DBMS_SUBJECT,
  AMT_SUBJECT,
  JAVA_SUBJECT,
  SQL_SUBJECT,
];

export const AVAILABLE_SUBJECTS = ALL_SUBJECTS.filter(
  (s) => s.status === "available",
);

export function getSubjectById(id: string): SubjectDefinition | undefined {
  return ALL_SUBJECTS.find((s) => s.id === id);
}
