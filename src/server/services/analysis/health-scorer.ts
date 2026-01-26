// T102: Data health scoring engine
// Aggregates completeness, freshness, consistency, and coverage into overall health score

export interface HealthScoreInput {
  completeness: number;
  freshness: number;
  consistency: number;
  coverage: number;
}

export interface HealthScoreResult {
  overall: number;
  completeness: number;
  freshness: number;
  consistency: number;
  coverage: number;
}

// Default weights for health score calculation
const DEFAULT_WEIGHTS: HealthScoreInput = {
  completeness: 0.30, // 30% - field population
  freshness: 0.25, // 25% - data recency
  consistency: 0.25, // 25% - format validation
  coverage: 0.20, // 20% - portfolio/contact coverage
};

/**
 * Clamp a value between 0 and 1
 */
function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate overall health score from category scores
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const completeness = clamp(input.completeness);
  const freshness = clamp(input.freshness);
  const consistency = clamp(input.consistency);
  const coverage = clamp(input.coverage);

  const overall =
    completeness * DEFAULT_WEIGHTS.completeness +
    freshness * DEFAULT_WEIGHTS.freshness +
    consistency * DEFAULT_WEIGHTS.consistency +
    coverage * DEFAULT_WEIGHTS.coverage;

  return {
    overall: clamp(overall),
    completeness,
    freshness,
    consistency,
    coverage,
  };
}

/**
 * Calculate overall score with custom weights
 */
export function getOverallScore(
  scores: HealthScoreInput,
  weights: HealthScoreInput
): number {
  // Normalize weights to sum to 1
  const totalWeight =
    weights.completeness + weights.freshness + weights.consistency + weights.coverage;

  if (totalWeight === 0) return 0;

  const normalizedWeights: HealthScoreInput = {
    completeness: weights.completeness / totalWeight,
    freshness: weights.freshness / totalWeight,
    consistency: weights.consistency / totalWeight,
    coverage: weights.coverage / totalWeight,
  };

  return (
    clamp(scores.completeness) * normalizedWeights.completeness +
    clamp(scores.freshness) * normalizedWeights.freshness +
    clamp(scores.consistency) * normalizedWeights.consistency +
    clamp(scores.coverage) * normalizedWeights.coverage
  );
}

/**
 * Aggregate multiple health scores into a single result
 */
export function aggregateHealthScores(scores: HealthScoreResult[]): HealthScoreResult {
  if (scores.length === 0) {
    return {
      overall: 0,
      completeness: 0,
      freshness: 0,
      consistency: 0,
      coverage: 0,
    };
  }

  const totals = scores.reduce(
    (acc, score) => ({
      overall: acc.overall + score.overall,
      completeness: acc.completeness + score.completeness,
      freshness: acc.freshness + score.freshness,
      consistency: acc.consistency + score.consistency,
      coverage: acc.coverage + score.coverage,
    }),
    { overall: 0, completeness: 0, freshness: 0, consistency: 0, coverage: 0 }
  );

  const n = scores.length;

  // Calculate new overall from averaged category scores
  const avgInput: HealthScoreInput = {
    completeness: totals.completeness / n,
    freshness: totals.freshness / n,
    consistency: totals.consistency / n,
    coverage: totals.coverage / n,
  };

  return {
    ...avgInput,
    overall: getOverallScore(avgInput, DEFAULT_WEIGHTS),
  };
}

/**
 * Get letter grade from health score
 */
export function getHealthGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

/**
 * Get health score description
 */
export function getHealthDescription(score: number): string {
  if (score >= 0.9) return "Excellent data quality";
  if (score >= 0.8) return "Good data quality with minor issues";
  if (score >= 0.7) return "Fair data quality with some gaps";
  if (score >= 0.6) return "Data quality needs improvement";
  return "Poor data quality - significant issues";
}

/**
 * Get category-specific description
 */
export function getCategoryDescription(category: keyof HealthScoreInput, score: number): string {
  const descriptions: Record<keyof HealthScoreInput, Record<"high" | "medium" | "low", string>> = {
    completeness: {
      high: "Most fields are populated",
      medium: "Some important fields are missing",
      low: "Many fields are incomplete",
    },
    freshness: {
      high: "Data is up-to-date",
      medium: "Some data is getting stale",
      low: "Data is outdated",
    },
    consistency: {
      high: "Data formats are consistent",
      medium: "Some format inconsistencies",
      low: "Many format issues detected",
    },
    coverage: {
      high: "Good portfolio coverage",
      medium: "Some constituents lack coverage",
      low: "Many constituents unassigned or without contacts",
    },
  };

  let level: "high" | "medium" | "low";
  if (score >= 0.8) level = "high";
  else if (score >= 0.6) level = "medium";
  else level = "low";

  return descriptions[category][level];
}

/**
 * Calculate trend from historical scores
 */
export function calculateTrend(
  currentScore: number,
  historicalScores: Array<{ score: number; date: Date }>
): {
  direction: "up" | "down" | "stable";
  change: number;
  percentChange: number;
} {
  if (historicalScores.length === 0) {
    return {
      direction: "stable",
      change: 0,
      percentChange: 0,
    };
  }

  // Sort by date descending and get most recent
  const sorted = [...historicalScores].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const firstSorted = sorted[0];
  if (!firstSorted) {
    return { direction: "stable" as const, change: 0, percentChange: 0 };
  }
  const previousScore = firstSorted.score;

  const change = currentScore - previousScore;
  const percentChange =
    previousScore !== 0 ? (change / previousScore) * 100 : change * 100;

  let direction: "up" | "down" | "stable";
  if (Math.abs(change) < 0.02) {
    direction = "stable";
  } else if (change > 0) {
    direction = "up";
  } else {
    direction = "down";
  }

  return {
    direction,
    change,
    percentChange,
  };
}

/**
 * Compare health scores between two periods
 */
export function compareScores(
  current: HealthScoreResult,
  previous: HealthScoreResult
): {
  overallChange: number;
  categoryChanges: Record<keyof HealthScoreInput, number>;
  improved: string[];
  declined: string[];
} {
  const categoryChanges: Record<keyof HealthScoreInput, number> = {
    completeness: current.completeness - previous.completeness,
    freshness: current.freshness - previous.freshness,
    consistency: current.consistency - previous.consistency,
    coverage: current.coverage - previous.coverage,
  };

  const improved: string[] = [];
  const declined: string[] = [];

  for (const [category, change] of Object.entries(categoryChanges) as Array<[keyof HealthScoreInput, number]>) {
    if (change > 0.02) {
      improved.push(category);
    } else if (change < -0.02) {
      declined.push(category);
    }
  }

  return {
    overallChange: current.overall - previous.overall,
    categoryChanges,
    improved,
    declined,
  };
}
