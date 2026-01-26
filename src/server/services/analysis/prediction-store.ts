// T124: Prediction storage service
/**
 * Prediction Store Service
 *
 * Handles storing and retrieving predictions in the database.
 * Manages prediction versioning and historical tracking.
 */

import type { PrismaClient } from "@prisma/client";
import type { LapseRiskResult } from "./lapse-risk";

export interface StorePredictionInput {
  constituentId: string;
  organizationId: string;
  predictionType: "lapse_risk" | "priority" | "upgrade_likelihood";
  score: number;
  confidence: number;
  factors: Array<{
    name: string;
    value: string;
    impact: "high" | "medium" | "low";
    weight?: number;
  }>;
  modelVersion?: string;
}

export interface PredictionRecord {
  id: string;
  constituentId: string;
  predictionType: string;
  score: number;
  confidence: number;
  factors: unknown;
  modelVersion: string | null;
  isCurrent: boolean;
  createdAt: Date;
}

/**
 * Store a new prediction and mark previous predictions as non-current
 */
export async function storePrediction(
  prisma: PrismaClient,
  input: StorePredictionInput
): Promise<PredictionRecord> {
  // Mark previous predictions as non-current
  await prisma.prediction.updateMany({
    where: {
      constituentId: input.constituentId,
      predictionType: input.predictionType,
      isCurrent: true,
    },
    data: {
      isCurrent: false,
    },
  });

  // Create new prediction
  const prediction = await prisma.prediction.create({
    data: {
      organizationId: input.organizationId,
      constituentId: input.constituentId,
      predictionType: input.predictionType,
      score: input.score,
      confidence: input.confidence,
      factors: input.factors,
      modelVersion: input.modelVersion || "rule-based-v1",
      isCurrent: true,
    },
  });

  return {
    ...prediction,
    score: Number(prediction.score),
    confidence: Number(prediction.confidence),
  } as PredictionRecord;
}

/**
 * Store multiple predictions in batch
 */
export async function storeBatchPredictions(
  prisma: PrismaClient,
  organizationId: string,
  predictions: Array<{
    constituentId: string;
    result: LapseRiskResult;
  }>,
  predictionType: "lapse_risk" | "priority" = "lapse_risk",
  modelVersion: string = "rule-based-v1"
): Promise<{ stored: number; errors: number }> {
  let stored = 0;
  let errors = 0;

  // Process in batches to avoid transaction limits
  const batchSize = 100;

  for (let i = 0; i < predictions.length; i += batchSize) {
    const batch = predictions.slice(i, i + batchSize);

    try {
      await prisma.$transaction(async (tx) => {
        // Mark old predictions as non-current for this batch
        const constituentIds = batch.map(p => p.constituentId);

        await tx.prediction.updateMany({
          where: {
            organizationId,
            constituentId: { in: constituentIds },
            predictionType,
            isCurrent: true,
          },
          data: {
            isCurrent: false,
          },
        });

        // Create new predictions
        await tx.prediction.createMany({
          data: batch.map(p => ({
            organizationId,
            constituentId: p.constituentId,
            predictionType,
            score: p.result.score,
            confidence: p.result.confidence,
            factors: JSON.parse(JSON.stringify(p.result.factors)),
            modelVersion,
            isCurrent: true,
          })),
        });

        // Also update the constituent denormalized fields
        for (const pred of batch) {
          await tx.constituent.update({
            where: { id: pred.constituentId },
            data: {
              lapseRiskScore: pred.result.score,
              lapseRiskFactors: JSON.parse(JSON.stringify(pred.result.factors)),
            },
          });
        }

        stored += batch.length;
      });
    } catch (error) {
      console.error(`Error storing batch ${i / batchSize}:`, error);
      errors += batch.length;
    }
  }

  return { stored, errors };
}

/**
 * Get current predictions for a constituent
 */
export async function getCurrentPredictions(
  prisma: PrismaClient,
  constituentId: string
): Promise<PredictionRecord[]> {
  const predictions = await prisma.prediction.findMany({
    where: {
      constituentId,
      isCurrent: true,
    },
  });

  return predictions.map(p => ({
    ...p,
    score: Number(p.score),
    confidence: Number(p.confidence),
  })) as PredictionRecord[];
}

/**
 * Get prediction history for a constituent
 */
export async function getPredictionHistory(
  prisma: PrismaClient,
  constituentId: string,
  predictionType?: string,
  limit: number = 10
): Promise<PredictionRecord[]> {
  const predictions = await prisma.prediction.findMany({
    where: {
      constituentId,
      ...(predictionType && { predictionType }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return predictions.map(p => ({
    ...p,
    score: Number(p.score),
    confidence: Number(p.confidence),
  })) as PredictionRecord[];
}

/**
 * Get prediction summary for an organization
 */
export async function getPredictionSummary(
  prisma: PrismaClient,
  organizationId: string,
  predictionType: string = "lapse_risk"
): Promise<{
  totalPredictions: number;
  avgScore: number;
  avgConfidence: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  lastUpdated: Date | null;
}> {
  const predictions = await prisma.prediction.findMany({
    where: {
      organizationId,
      predictionType,
      isCurrent: true,
    },
    select: {
      score: true,
      confidence: true,
      createdAt: true,
    },
  });

  if (predictions.length === 0) {
    return {
      totalPredictions: 0,
      avgScore: 0,
      avgConfidence: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      lastUpdated: null,
    };
  }

  const scores = predictions.map(p => Number(p.score));
  const confidences = predictions.map(p => Number(p.confidence));

  return {
    totalPredictions: predictions.length,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    avgConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
    highRiskCount: scores.filter(s => s >= 0.7).length,
    mediumRiskCount: scores.filter(s => s >= 0.4 && s < 0.7).length,
    lowRiskCount: scores.filter(s => s < 0.4).length,
    lastUpdated: predictions.reduce((latest, p) =>
      !latest || p.createdAt > latest ? p.createdAt : latest,
      null as Date | null
    ),
  };
}

/**
 * Delete old predictions beyond retention period
 */
export async function cleanupOldPredictions(
  prisma: PrismaClient,
  organizationId: string,
  retentionDays: number = 365
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.prediction.deleteMany({
    where: {
      organizationId,
      isCurrent: false,
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
