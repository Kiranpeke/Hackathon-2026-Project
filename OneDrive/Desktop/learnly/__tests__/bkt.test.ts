/**
 * __tests__/bkt.test.ts
 *
 * Unit tests for lib/bkt.ts.
 *
 * All expected values are derived analytically from the BKT formulae
 * documented in lib/bkt.ts. No mocks, no randomness, no UI dependencies.
 *
 * ─── BKT update formula (defaults) ──────────────────────────────────────────
 *
 * Defaults: pLearn=0.2  pGuess=0.25  pSlip=0.1
 *
 * Step 1 – Bayesian posterior:
 *   P(Known|correct)  = (1-pSlip)·pKnown / [(1-pSlip)·pKnown + pGuess·(1-pKnown)]
 *   P(Known|incorrect)= pSlip·pKnown     / [pSlip·pKnown + (1-pGuess)·(1-pKnown)]
 *
 * Step 2 – Learning transition:
 *   pNext = posterior + (1 - posterior) · pLearn
 *
 * ─── getDifficultyTier mapping ───────────────────────────────────────────────
 *   pKnown < 0.4          → "Hard"    (student still acquiring)
 *   0.4 ≤ pKnown < 0.7   → "Medium"  (developing fluency)
 *   pKnown ≥ 0.7          → "Easy"    (near/at mastery – questions feel easy)
 *
 * Note: "Easy" indicates HIGH knowledge. The tier names reflect the
 * recommended question difficulty for the student, not their proficiency level.
 *
 * ─── Difficulty "progression" ────────────────────────────────────────────────
 * There is NO streak-based counter in lib/bkt.ts. Difficulty evolves
 * solely through changes in pKnown. Tests reflect the actual implementation.
 */

import { describe, it, expect } from "vitest";
import {
  updatePKnown,
  pLearnedNext,
  isMastered,
  getDifficultyTier,
  getBKTState,
  observeCorrect,
  observeIncorrect,
  DEFAULT_BKT_PARAMS,
  MASTERY_THRESHOLD,
} from "../lib/bkt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Round a float to `places` decimal places for readable assertions.
 * All BKT values are in [0,1]; 6 places is more than sufficient.
 */
const round = (n: number, places = 6) =>
  Math.round(n * 10 ** places) / 10 ** places;

// Pre-computed analytic expectations for pKnown = 0.5, defaults
// Correct:
//   posterior = (0.9 × 0.5) / (0.9 × 0.5 + 0.25 × 0.5)
//             = 0.45 / 0.575 ≈ 0.782608…
//   pNext     = 0.782608 + (1 - 0.782608) × 0.2
//             = 0.782608 + 0.043478 ≈ 0.826086…
const CORRECT_FROM_0_5 = 0.9 * 0.5 / (0.9 * 0.5 + 0.25 * 0.5);
const CORRECT_FROM_0_5_NEXT = CORRECT_FROM_0_5 + (1 - CORRECT_FROM_0_5) * 0.2;

// Incorrect:
//   posterior = (0.1 × 0.5) / (0.1 × 0.5 + 0.75 × 0.5)
//             = 0.05 / 0.4 = 0.125
//   pNext     = 0.125 + (1 - 0.125) × 0.2
//             = 0.125 + 0.175 = 0.3
const INCORRECT_FROM_0_5 = 0.1 * 0.5 / (0.1 * 0.5 + 0.75 * 0.5);
const INCORRECT_FROM_0_5_NEXT = INCORRECT_FROM_0_5 + (1 - INCORRECT_FROM_0_5) * 0.2;

// ---------------------------------------------------------------------------
// 1. Exported constants
// ---------------------------------------------------------------------------

describe("Exported constants", () => {
  it("DEFAULT_BKT_PARAMS has expected values", () => {
    expect(DEFAULT_BKT_PARAMS.pKnown).toBe(0.3);
    expect(DEFAULT_BKT_PARAMS.pLearn).toBe(0.2);
    expect(DEFAULT_BKT_PARAMS.pGuess).toBe(0.25);
    expect(DEFAULT_BKT_PARAMS.pSlip).toBe(0.1);
  });

  it("MASTERY_THRESHOLD is 0.95", () => {
    expect(MASTERY_THRESHOLD).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// 2. updatePKnown — correct answer raises p(Known)
// ---------------------------------------------------------------------------

describe("updatePKnown — correct answer", () => {
  it("increases pKnown above the prior (pKnown=0.5)", () => {
    const updated = updatePKnown(0.5, true);
    expect(updated).toBeGreaterThan(0.5);
  });

  it("matches the analytic BKT result for pKnown=0.5 (defaults)", () => {
    const updated = updatePKnown(0.5, true);
    expect(round(updated)).toBeCloseTo(round(CORRECT_FROM_0_5_NEXT), 5);
  });

  it("increases pKnown for low prior (pKnown=0.1)", () => {
    const updated = updatePKnown(0.1, true);
    expect(updated).toBeGreaterThan(0.1);
  });

  it("increases pKnown for moderate prior (pKnown=0.7)", () => {
    const updated = updatePKnown(0.7, true);
    expect(updated).toBeGreaterThan(0.7);
  });

  it("result is clamped to ≤ 1 even near certainty (pKnown=0.99)", () => {
    const updated = updatePKnown(0.99, true);
    expect(updated).toBeLessThanOrEqual(1);
    expect(updated).toBeGreaterThan(0.99);
  });
});

// ---------------------------------------------------------------------------
// 3. updatePKnown — incorrect answer lowers p(Known)
// ---------------------------------------------------------------------------

describe("updatePKnown — incorrect answer", () => {
  it("decreases pKnown below the prior (pKnown=0.5)", () => {
    const updated = updatePKnown(0.5, false);
    expect(updated).toBeLessThan(0.5);
  });

  it("matches the analytic BKT result for pKnown=0.5 (defaults)", () => {
    const updated = updatePKnown(0.5, false);
    expect(round(updated)).toBeCloseTo(round(INCORRECT_FROM_0_5_NEXT), 5);
  });

  it("decreases pKnown for moderate prior (pKnown=0.7)", () => {
    const updated = updatePKnown(0.7, false);
    expect(updated).toBeLessThan(0.7);
  });

  it("result is clamped to ≥ 0 (pKnown=0)", () => {
    const updated = updatePKnown(0, false);
    expect(updated).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 4. updatePKnown — result always stays in [0, 1]
// ---------------------------------------------------------------------------

describe("updatePKnown — bounds [0, 1]", () => {
  const cases: Array<[number, boolean]> = [
    [0, true],
    [0, false],
    [0.5, true],
    [0.5, false],
    [1, true],
    [1, false],
  ];

  for (const [prior, correct] of cases) {
    it(`pKnown=${prior} correct=${correct} → result ∈ [0,1]`, () => {
      const updated = updatePKnown(prior, correct);
      expect(updated).toBeGreaterThanOrEqual(0);
      expect(updated).toBeLessThanOrEqual(1);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. pLearnedNext — forward prediction
// ---------------------------------------------------------------------------

describe("pLearnedNext", () => {
  it("applies default pLearn=0.2 when not overridden", () => {
    const result = pLearnedNext(0.5);
    // 0.5 + 0.5 × 0.2 = 0.6
    expect(result).toBeCloseTo(0.6, 10);
  });

  it("applies a custom pLearn override", () => {
    const result = pLearnedNext(0.5, 0.4);
    // 0.5 + 0.5 × 0.4 = 0.7
    expect(result).toBeCloseTo(0.7, 10);
  });

  it("clamps output to 1 when result would exceed 1", () => {
    expect(pLearnedNext(1, 0.2)).toBe(1); // 1 + 0 × 0.2 = 1
  });

  it("result ≥ pKnown (learning only goes up)", () => {
    expect(pLearnedNext(0.3)).toBeGreaterThanOrEqual(0.3);
    expect(pLearnedNext(0)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 6. isMastered — mastery threshold
// ---------------------------------------------------------------------------

describe("isMastered", () => {
  it("returns true at exactly the MASTERY_THRESHOLD (0.95)", () => {
    expect(isMastered(0.95)).toBe(true);
  });

  it("returns true above the threshold (0.99)", () => {
    expect(isMastered(0.99)).toBe(true);
  });

  it("returns false just below the threshold (0.9499)", () => {
    expect(isMastered(0.9499)).toBe(false);
  });

  it("returns false at 0.5", () => {
    expect(isMastered(0.5)).toBe(false);
  });

  it("returns false at 0", () => {
    expect(isMastered(0)).toBe(false);
  });

  it("respects a custom threshold override", () => {
    expect(isMastered(0.8, 0.8)).toBe(true);
    expect(isMastered(0.79, 0.8)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. getDifficultyTier — p(Known) → question difficulty mapping
// ---------------------------------------------------------------------------

describe("getDifficultyTier", () => {
  // "Hard" tier: pKnown < 0.4 (student still acquiring)
  it("returns 'Hard' for pKnown=0 (student just starting)", () => {
    expect(getDifficultyTier(0)).toBe("Hard");
  });

  it("returns 'Hard' for pKnown=0.2", () => {
    expect(getDifficultyTier(0.2)).toBe("Hard");
  });

  it("returns 'Hard' for pKnown=0.39 (just below Medium boundary)", () => {
    expect(getDifficultyTier(0.39)).toBe("Hard");
  });

  // "Medium" tier: 0.4 ≤ pKnown < 0.7
  it("returns 'Medium' for pKnown=0.4 (boundary)", () => {
    expect(getDifficultyTier(0.4)).toBe("Medium");
  });

  it("returns 'Medium' for pKnown=0.55", () => {
    expect(getDifficultyTier(0.55)).toBe("Medium");
  });

  it("returns 'Medium' for pKnown=0.69 (just below Easy boundary)", () => {
    expect(getDifficultyTier(0.69)).toBe("Medium");
  });

  // "Easy" tier: pKnown ≥ 0.7 (student near mastery — questions are easy for them)
  it("returns 'Easy' for pKnown=0.7 (boundary)", () => {
    expect(getDifficultyTier(0.7)).toBe("Easy");
  });

  it("returns 'Easy' for pKnown=0.85", () => {
    expect(getDifficultyTier(0.85)).toBe("Easy");
  });

  it("returns 'Easy' for pKnown=1.0 (fully known)", () => {
    expect(getDifficultyTier(1.0)).toBe("Easy");
  });
});

// ---------------------------------------------------------------------------
// 8. Difficulty progression via p(Known) changes
//    (The BKT implementation uses pKnown-based tiers, not a streak counter.)
// ---------------------------------------------------------------------------

describe("Difficulty progression through pKnown updates", () => {
  it("starts at 'Hard' for the default pKnown prior (0.3)", () => {
    const { difficulty } = getBKTState(DEFAULT_BKT_PARAMS.pKnown);
    expect(difficulty).toBe("Hard");
  });

  it("reaches 'Medium' tier once pKnown crosses 0.4", () => {
    // Apply repeated correct answers from the default prior until we cross 0.4
    let p = DEFAULT_BKT_PARAMS.pKnown; // 0.3
    for (let i = 0; i < 10; i++) {
      p = updatePKnown(p, true);
      if (p >= 0.4) break;
    }
    expect(p).toBeGreaterThanOrEqual(0.4);
    expect(getDifficultyTier(p)).toBe("Medium");
  });

  it("reaches 'Easy' tier once pKnown crosses 0.7 (enough correct answers)", () => {
    let p = 0.4;
    for (let i = 0; i < 20; i++) {
      p = updatePKnown(p, true);
      if (p >= 0.7) break;
    }
    expect(p).toBeGreaterThanOrEqual(0.7);
    expect(getDifficultyTier(p)).toBe("Easy");
  });

  it("drops back to a lower tier after incorrect answers reduce pKnown", () => {
    // Start comfortably in 'Easy'
    let p = 0.85;
    // Apply enough incorrect answers to push below 0.7
    for (let i = 0; i < 20; i++) {
      p = updatePKnown(p, false);
      if (p < 0.7) break;
    }
    // Should have dropped back into Medium or Hard
    expect(p).toBeLessThan(0.7);
    const tier = getDifficultyTier(p);
    expect(["Medium", "Hard"]).toContain(tier);
  });
});

// ---------------------------------------------------------------------------
// 9. getBKTState — full snapshot
// ---------------------------------------------------------------------------

describe("getBKTState", () => {
  it("returns pKnown, mastery, and difficulty for a given pKnown", () => {
    const state = getBKTState(0.5);
    expect(state).toHaveProperty("pKnown");
    expect(state).toHaveProperty("mastery");
    expect(state).toHaveProperty("difficulty");
  });

  it("pKnown is clamped: getBKTState(1.5).pKnown === 1", () => {
    expect(getBKTState(1.5).pKnown).toBe(1);
  });

  it("pKnown is clamped: getBKTState(-0.1).pKnown === 0", () => {
    expect(getBKTState(-0.1).pKnown).toBe(0);
  });

  it("mastery=false when pKnown < MASTERY_THRESHOLD", () => {
    expect(getBKTState(0.5).mastery).toBe(false);
    expect(getBKTState(0.94).mastery).toBe(false);
  });

  it("mastery=true when pKnown >= MASTERY_THRESHOLD", () => {
    expect(getBKTState(0.95).mastery).toBe(true);
    expect(getBKTState(1.0).mastery).toBe(true);
  });

  it("difficulty reflects the pKnown tier correctly", () => {
    expect(getBKTState(0.2).difficulty).toBe("Hard");
    expect(getBKTState(0.5).difficulty).toBe("Medium");
    expect(getBKTState(0.8).difficulty).toBe("Easy");
  });
});

// ---------------------------------------------------------------------------
// 10. observeCorrect / observeIncorrect convenience wrappers
// ---------------------------------------------------------------------------

describe("observeCorrect", () => {
  it("returns a BKTState with pKnown higher than the prior", () => {
    const prior = 0.5;
    const state = observeCorrect(prior);
    expect(state.pKnown).toBeGreaterThan(prior);
  });

  it("result pKnown matches updatePKnown(pKnown, true)", () => {
    const prior = 0.5;
    const expected = updatePKnown(prior, true);
    expect(observeCorrect(prior).pKnown).toBeCloseTo(expected, 10);
  });

  it("mastery becomes true once pKnown crosses 0.95", () => {
    // Drive pKnown above the threshold by starting high
    let state = getBKTState(0.9);
    for (let i = 0; i < 10; i++) {
      state = observeCorrect(state.pKnown);
      if (state.mastery) break;
    }
    expect(state.mastery).toBe(true);
  });
});

describe("observeIncorrect", () => {
  it("returns a BKTState with pKnown lower than the prior", () => {
    const prior = 0.5;
    const state = observeIncorrect(prior);
    expect(state.pKnown).toBeLessThan(prior);
  });

  it("result pKnown matches updatePKnown(pKnown, false)", () => {
    const prior = 0.5;
    const expected = updatePKnown(prior, false);
    expect(observeIncorrect(prior).pKnown).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// 11. Parameter overrides
// ---------------------------------------------------------------------------

describe("Parameter overrides in updatePKnown", () => {
  it("higher pLearn produces a larger posterior pKnown on correct answer", () => {
    const low  = updatePKnown(0.5, true, { pLearn: 0.1 });
    const high = updatePKnown(0.5, true, { pLearn: 0.5 });
    expect(high).toBeGreaterThan(low);
  });

  it("higher pSlip (more slipping) reduces the posterior on correct answer", () => {
    const low  = updatePKnown(0.5, true, { pSlip: 0.05 });
    const high = updatePKnown(0.5, true, { pSlip: 0.4 });
    // More slipping → lower confidence even after a correct answer
    expect(high).toBeLessThan(low);
  });

  it("higher pGuess (more guessing) reduces update from incorrect answer", () => {
    // High pGuess: an incorrect answer gives less evidence of not-knowing,
    // so the posterior on incorrect is higher than with low pGuess.
    const low  = updatePKnown(0.5, false, { pGuess: 0.1 });
    const high = updatePKnown(0.5, false, { pGuess: 0.4 });
    expect(high).toBeGreaterThan(low);
  });
});

// ---------------------------------------------------------------------------
// 12. Determinism
// ---------------------------------------------------------------------------

describe("Determinism", () => {
  it("same inputs always produce the same output", () => {
    const a = updatePKnown(0.5, true);
    const b = updatePKnown(0.5, true);
    expect(a).toBe(b);
  });

  it("sequence of 5 correct answers is reproducible", () => {
    const run = (start: number) => {
      let p = start;
      for (let i = 0; i < 5; i++) p = updatePKnown(p, true);
      return p;
    };
    expect(run(0.3)).toBe(run(0.3));
  });
});
