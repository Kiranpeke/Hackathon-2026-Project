/**
 * lib/bkt.ts
 *
 * Pure TypeScript Bayesian Knowledge Tracing (BKT) engine.
 *
 * BKT models student knowledge as a hidden binary state (known / not known)
 * and updates the probability of knowledge after each observation (correct or
 * incorrect answer) using Bayes' theorem.
 *
 * Parameters
 * ----------
 * pKnown  – prior probability that the student already knows the concept
 * pLearn  – probability of transitioning from not-known → known after a trial
 * pGuess  – probability of a correct response despite not knowing (lucky guess)
 * pSlip   – probability of an incorrect response despite knowing (careless slip)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Difficulty tier derived from the current p(Known) estimate. */
export type DifficultyTier = "Easy" | "Medium" | "Hard";

/** All four BKT parameters for a single concept / student pairing. */
export interface BKTParams {
  /** Prior probability of already knowing the skill. Default: 0.3 */
  pKnown: number;
  /** Probability of learning the skill on a single trial. Default: 0.2 */
  pLearn: number;
  /** Probability of a correct answer despite not knowing. Default: 0.25 */
  pGuess: number;
  /** Probability of an incorrect answer despite knowing. Default: 0.1 */
  pSlip: number;
}

/** A snapshot of the student's BKT state for a concept. */
export interface BKTState {
  /** Current posterior probability that the student knows the skill. */
  pKnown: number;
  /** Whether the student has reached the mastery threshold. */
  mastery: boolean;
  /** Difficulty tier derived from the current pKnown. */
  difficulty: DifficultyTier;
}

// ---------------------------------------------------------------------------
// Default parameters
// ---------------------------------------------------------------------------

/**
 * Sensible BKT defaults, grounded in published literature.
 * Override individual fields via the `params` argument to each function.
 */
export const DEFAULT_BKT_PARAMS: Readonly<BKTParams> = {
  pKnown: 0.3,
  pLearn: 0.2,
  pGuess: 0.25,
  pSlip: 0.1,
};

/**
 * Threshold above which a student is considered to have mastered a skill.
 * This matches the commonly cited 0.95 mastery criterion from the BKT
 * literature (Corbett & Anderson, 1994).
 */
export const MASTERY_THRESHOLD = 0.95;

// ---------------------------------------------------------------------------
// Core BKT update
// ---------------------------------------------------------------------------

/**
 * Updates p(Known) after a single observation (correct or incorrect).
 *
 * The update proceeds in two steps:
 * 1. Bayesian update conditioned on the observation.
 * 2. Forward prediction: account for the chance the student learns during
 *    the current opportunity (pLearn transition).
 *
 * @param pKnown  - Current p(Known) before the observation.
 * @param correct - Whether the student answered correctly.
 * @param params  - BKT parameters (defaults to DEFAULT_BKT_PARAMS).
 * @returns Updated p(Known) clamped to [0, 1].
 */
export function updatePKnown(
  pKnown: number,
  correct: boolean,
  params: Partial<BKTParams> = {},
): number {
  const { pLearn, pGuess, pSlip } = { ...DEFAULT_BKT_PARAMS, ...params };

  // Step 1 – Bayesian posterior: p(Known | observation)
  //
  // P(obs | Known)     = correct ? (1 - pSlip)  : pSlip
  // P(obs | NotKnown)  = correct ? pGuess        : (1 - pGuess)
  //
  // P(Known | obs) = P(obs | Known) * P(Known)
  //                  ─────────────────────────────────────────────────────
  //                  P(obs | Known)*P(Known) + P(obs | NotKnown)*(1-P(Known))

  const pObsGivenKnown = correct ? 1 - pSlip : pSlip;
  const pObsGivenNotKnown = correct ? pGuess : 1 - pGuess;

  const numerator = pObsGivenKnown * pKnown;
  const denominator = numerator + pObsGivenNotKnown * (1 - pKnown);

  // Guard against division by zero (degenerate parameter combinations).
  const pKnownGivenObs = denominator === 0 ? pKnown : numerator / denominator;

  // Step 2 – Predict next: apply the learning transition.
  return pLearnedNext(pKnownGivenObs, pLearn);
}

// ---------------------------------------------------------------------------
// Forward prediction
// ---------------------------------------------------------------------------

/**
 * Predicts p(Known) at the *next* opportunity, accounting for the chance that
 * a currently-unknown student learns during the present opportunity.
 *
 * p(Known_next) = p(Known_now) + (1 - p(Known_now)) * pLearn
 *
 * @param pKnown  - Current p(Known).
 * @param pLearnOverride - Override for the pLearn parameter. Defaults to
 *                         `DEFAULT_BKT_PARAMS.pLearn` when omitted.
 * @returns Predicted p(Known) at the next opportunity, clamped to [0, 1].
 */
export function pLearnedNext(
  pKnown: number,
  pLearnOverride: number = DEFAULT_BKT_PARAMS.pLearn,
): number {
  const result = pKnown + (1 - pKnown) * pLearnOverride;
  return clamp(result, 0, 1);
}

// ---------------------------------------------------------------------------
// Mastery check
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the given p(Known) meets or exceeds the mastery threshold.
 *
 * @param pKnown    - Current p(Known).
 * @param threshold - Override the default mastery threshold (default: 0.95).
 */
export function isMastered(
  pKnown: number,
  threshold: number = MASTERY_THRESHOLD,
): boolean {
  return pKnown >= threshold;
}

// ---------------------------------------------------------------------------
// Difficulty tier
// ---------------------------------------------------------------------------

/**
 * Maps the current p(Known) to a difficulty tier.
 *
 * | p(Known)         | Tier   | Rationale                              |
 * |------------------|--------|----------------------------------------|
 * | < 0.4            | Hard   | Student is likely still acquiring skill|
 * | 0.4 – 0.7        | Medium | Developing fluency                     |
 * | > 0.7            | Easy   | Near or at mastery – skill is solid    |
 *
 * @param pKnown - Current p(Known).
 */
export function getDifficultyTier(pKnown: number): DifficultyTier {
  if (pKnown < 0.4) return "Hard";
  if (pKnown < 0.7) return "Medium";
  return "Easy";
}

// ---------------------------------------------------------------------------
// Convenience: full state snapshot
// ---------------------------------------------------------------------------

/**
 * Builds a complete {@link BKTState} snapshot for the given p(Known).
 *
 * @param pKnown    - Current p(Known).
 * @param threshold - Mastery threshold override (default: 0.95).
 */
export function getBKTState(
  pKnown: number,
  threshold: number = MASTERY_THRESHOLD,
): BKTState {
  return {
    pKnown: clamp(pKnown, 0, 1),
    mastery: isMastered(pKnown, threshold),
    difficulty: getDifficultyTier(pKnown),
  };
}

/**
 * Applies a correct observation and returns the new full {@link BKTState}.
 *
 * @param pKnown - Current p(Known) before the observation.
 * @param params - BKT parameters.
 */
export function observeCorrect(
  pKnown: number,
  params: Partial<BKTParams> = {},
): BKTState {
  return getBKTState(updatePKnown(pKnown, true, params));
}

/**
 * Applies an incorrect observation and returns the new full {@link BKTState}.
 *
 * @param pKnown - Current p(Known) before the observation.
 * @param params - BKT parameters.
 */
export function observeIncorrect(
  pKnown: number,
  params: Partial<BKTParams> = {},
): BKTState {
  return getBKTState(updatePKnown(pKnown, false, params));
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Clamps `value` to the closed interval [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
