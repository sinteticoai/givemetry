// T119: Lapse risk calculation engine
/**
 * Lapse Risk Prediction Service
 *
 * Calculates lapse risk scores for constituents based on:
 * - Recency: Time since last gift
 * - Frequency: Gift frequency trend over time
 * - Monetary: Gift amount trends
 * - Contact: Time since last contact and contact frequency
 */

import { calculateRecencyScore, type RecencyResult } from "./lapse-factors/recency";
import { calculateFrequencyScore, type FrequencyResult } from "./lapse-factors/frequency";
import { calculateMonetaryScore, type MonetaryResult } from "./lapse-factors/monetary";
import { calculateContactScore, type ContactResult } from "./lapse-factors/contact";

// Default weights for lapse risk factors (from research.md)
export const DEFAULT_LAPSE_WEIGHTS = {
  recency: 0.30,
  frequency: 0.25,
  monetary: 0.20,
  contact: 0.15,
  pattern: 0.10, // Reserved for future pattern matching
};

// Risk level thresholds (from research.md)
export const RISK_THRESHOLDS = {
  high: 0.7,
  medium: 0.4,
};

export interface GiftRecord {
  amount: number;
  date: Date;
}

export interface ContactRecord {
  date: Date;
  type: string;
  outcome?: string;
}

export interface LapseRiskInput {
  gifts: GiftRecord[];
  contacts: ContactRecord[];
  referenceDate?: Date;
  weights?: Partial<typeof DEFAULT_LAPSE_WEIGHTS>;
}

export interface LapseRiskFactor {
  name: string;
  value: string;
  impact: "high" | "medium" | "low";
  weight: number;
  rawScore: number;
}

export interface LapseRiskResult {
  score: number;
  riskLevel: "high" | "medium" | "low";
  confidence: number;
  factors: LapseRiskFactor[];
  predictedLapseWindow: string;
  details: {
    recency: RecencyResult;
    frequency: FrequencyResult;
    monetary: MonetaryResult;
    contact: ContactResult;
  };
}

/**
 * Calculate lapse risk score for a constituent
 */
export function calculateLapseRiskScore(input: LapseRiskInput): LapseRiskResult {
  const referenceDate = input.referenceDate || new Date();
  const weights = { ...DEFAULT_LAPSE_WEIGHTS, ...input.weights };

  // Calculate individual factor scores
  const recencyResult = calculateRecencyScore({
    gifts: input.gifts,
    referenceDate,
  });

  const frequencyResult = calculateFrequencyScore({
    gifts: input.gifts,
    referenceDate,
  });

  const monetaryResult = calculateMonetaryScore({
    gifts: input.gifts,
    referenceDate,
  });

  const contactResult = calculateContactScore({
    contacts: input.contacts,
    referenceDate,
  });

  // Calculate weighted composite score
  const weightedScore =
    recencyResult.score * weights.recency +
    frequencyResult.score * weights.frequency +
    monetaryResult.score * weights.monetary +
    contactResult.score * weights.contact;

  // Pattern score is placeholder for now (future ML enhancement)
  const patternScore = 0.5; // Neutral score
  const totalWeightUsed = weights.recency + weights.frequency + weights.monetary + weights.contact;

  // Normalize to account for pattern weight being neutral
  const score = Math.min(1, Math.max(0,
    (weightedScore + patternScore * weights.pattern) / (totalWeightUsed + weights.pattern)
  ));

  // Determine risk level
  const riskLevel = getRiskLevel(score);

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(input.gifts, input.contacts, referenceDate);

  // Build explainable factors
  const factors = buildFactors({
    recency: recencyResult,
    frequency: frequencyResult,
    monetary: monetaryResult,
    contact: contactResult,
    weights,
  });

  // Predict lapse window
  const predictedLapseWindow = predictLapseWindow(score, recencyResult);

  return {
    score,
    riskLevel,
    confidence,
    factors,
    predictedLapseWindow,
    details: {
      recency: recencyResult,
      frequency: frequencyResult,
      monetary: monetaryResult,
      contact: contactResult,
    },
  };
}

/**
 * Get risk level from score
 */
export function getRiskLevel(score: number): "high" | "medium" | "low" {
  if (score >= RISK_THRESHOLDS.high) return "high";
  if (score >= RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(
  gifts: GiftRecord[],
  contacts: ContactRecord[],
  referenceDate: Date
): number {
  let confidence = 0;

  // More gifts = higher confidence
  if (gifts.length >= 10) confidence += 0.3;
  else if (gifts.length >= 5) confidence += 0.2;
  else if (gifts.length >= 2) confidence += 0.1;
  else if (gifts.length === 1) confidence += 0.05;

  // More contacts = higher confidence
  if (contacts.length >= 10) confidence += 0.2;
  else if (contacts.length >= 5) confidence += 0.15;
  else if (contacts.length >= 2) confidence += 0.1;
  else if (contacts.length === 1) confidence += 0.05;

  // Recent data = higher confidence
  const daysSinceLastGift = gifts.length > 0
    ? Math.floor((referenceDate.getTime() - Math.max(...gifts.map(g => g.date.getTime()))) / (1000 * 60 * 60 * 24))
    : 9999;

  if (daysSinceLastGift <= 365) confidence += 0.25;
  else if (daysSinceLastGift <= 730) confidence += 0.15;
  else if (daysSinceLastGift <= 1095) confidence += 0.1;

  // Data span = higher confidence
  if (gifts.length > 1) {
    const firstGift = Math.min(...gifts.map(g => g.date.getTime()));
    const lastGift = Math.max(...gifts.map(g => g.date.getTime()));
    const dataSpanYears = (lastGift - firstGift) / (1000 * 60 * 60 * 24 * 365);

    if (dataSpanYears >= 3) confidence += 0.25;
    else if (dataSpanYears >= 2) confidence += 0.15;
    else if (dataSpanYears >= 1) confidence += 0.1;
  }

  return Math.min(1, confidence);
}

/**
 * Build explainable factors array
 */
function buildFactors(input: {
  recency: RecencyResult;
  frequency: FrequencyResult;
  monetary: MonetaryResult;
  contact: ContactResult;
  weights: typeof DEFAULT_LAPSE_WEIGHTS;
}): LapseRiskFactor[] {
  const factors: LapseRiskFactor[] = [];

  // Recency factor
  factors.push({
    name: "recency",
    value: input.recency.description,
    impact: getImpactLevel(input.recency.score),
    weight: input.weights.recency,
    rawScore: input.recency.score,
  });

  // Frequency factor
  factors.push({
    name: "frequency",
    value: input.frequency.description,
    impact: getImpactLevel(input.frequency.score),
    weight: input.weights.frequency,
    rawScore: input.frequency.score,
  });

  // Monetary factor
  factors.push({
    name: "monetary",
    value: input.monetary.description,
    impact: getImpactLevel(input.monetary.score),
    weight: input.weights.monetary,
    rawScore: input.monetary.score,
  });

  // Contact factor
  factors.push({
    name: "contact",
    value: input.contact.description,
    impact: getImpactLevel(input.contact.score),
    weight: input.weights.contact,
    rawScore: input.contact.score,
  });

  // Sort by impact (high first) then by weight
  factors.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return b.weight - a.weight;
  });

  return factors;
}

/**
 * Get impact level from score (higher score = higher risk = higher impact)
 */
function getImpactLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

/**
 * Predict when lapse is likely to occur
 */
function predictLapseWindow(
  score: number,
  _recencyResult: RecencyResult
): string {
  if (score >= 0.85) return "1-3 months";
  if (score >= 0.7) return "3-6 months";
  if (score >= 0.5) return "6-12 months";
  if (score >= 0.4) return "12-18 months";
  return "18+ months";
}

/**
 * Calculate lapse risk for multiple constituents (batch processing)
 */
export function calculateBatchLapseRisk(
  constituents: Array<{
    id: string;
    gifts: GiftRecord[];
    contacts: ContactRecord[];
  }>,
  referenceDate?: Date
): Array<{ id: string; result: LapseRiskResult }> {
  return constituents.map(c => ({
    id: c.id,
    result: calculateLapseRiskScore({
      gifts: c.gifts,
      contacts: c.contacts,
      referenceDate,
    }),
  }));
}

/**
 * Get summary statistics for lapse risk across a set of constituents
 */
export function getLapseRiskSummary(
  results: LapseRiskResult[]
): {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageScore: number;
  averageConfidence: number;
} {
  if (results.length === 0) {
    return {
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      averageScore: 0,
      averageConfidence: 0,
    };
  }

  const highRiskCount = results.filter(r => r.riskLevel === "high").length;
  const mediumRiskCount = results.filter(r => r.riskLevel === "medium").length;
  const lowRiskCount = results.filter(r => r.riskLevel === "low").length;
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return {
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    averageScore,
    averageConfidence,
  };
}
