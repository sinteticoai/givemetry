// T161: Brief generation service
import { generateBriefContent, type BriefContent } from "@/lib/ai/claude";
import { validateCitations, type ValidationResult } from "./citation-validator";

export interface ConstituentData {
  id: string;
  organizationId: string;
  externalId: string;
  firstName?: string | null;
  lastName?: string | null;
  prefix?: string | null;
  email?: string | null;
  phone?: string | null;
  constituentType?: string | null;
  classYear?: number | null;
  schoolCollege?: string | null;
  estimatedCapacity?: number | { toNumber(): number } | null;
  portfolioTier?: string | null;
  [key: string]: unknown;
}

export interface GiftData {
  id: string;
  amount: number | { toNumber(): number };
  giftDate: Date;
  fundName?: string | null;
  giftType?: string | null;
  campaign?: string | null;
  appeal?: string | null;
  [key: string]: unknown;
}

export interface ContactData {
  id: string;
  contactType: string;
  contactDate: Date;
  subject?: string | null;
  notes?: string | null;
  outcome?: string | null;
  nextAction?: string | null;
  [key: string]: unknown;
}

export interface PredictionData {
  id: string;
  predictionType: string;
  score: number | { toNumber(): number };
  confidence?: number | { toNumber(): number } | null;
  factors?: unknown;
  [key: string]: unknown;
}

export interface GenerateBriefInput {
  apiKey: string;
  constituent: ConstituentData;
  gifts: GiftData[];
  contacts: ContactData[];
  predictions?: PredictionData[];
  options?: {
    validateCitations?: boolean;
    includeRecommendedAsk?: boolean;
  };
}

export interface GenerateBriefOutput {
  content: BriefContent;
  citations: unknown[];
  promptTokens: number;
  completionTokens: number;
  modelUsed: string;
  validation?: ValidationResult;
}

export async function generateBrief(input: GenerateBriefInput): Promise<GenerateBriefOutput> {
  const {
    apiKey,
    constituent,
    gifts,
    contacts,
    predictions = [],
    options = {},
  } = input;

  const { validateCitations: shouldValidate = true } = options;

  // Convert Decimal types to numbers
  const normalizedConstituent = {
    ...constituent,
    estimatedCapacity: normalizeDecimal(constituent.estimatedCapacity),
  };

  const normalizedGifts = gifts.map((g) => ({
    ...g,
    amount: normalizeDecimal(g.amount),
  }));

  const normalizedPredictions = predictions.map((p) => ({
    ...p,
    score: normalizeDecimal(p.score),
    confidence: normalizeDecimal(p.confidence),
  }));

  // Generate brief content using Claude
  const result = await generateBriefContent({
    apiKey,
    constituent: normalizedConstituent,
    gifts: normalizedGifts as Array<{
      id: string;
      amount: number;
      giftDate: Date;
      fundName?: string | null;
    }>,
    contacts,
    predictions: normalizedPredictions as Array<{
      id: string;
      predictionType: string;
      score: number;
    }>,
  });

  // Validate citations if requested
  let validation: ValidationResult | undefined;
  if (shouldValidate) {
    const sourceData = {
      constituent: normalizedConstituent,
      gifts: normalizedGifts.map((g) => ({
        ...g,
        amount: g.amount || 0,
      })),
      contacts: contacts.map((c) => ({
        id: c.id,
        contactType: c.contactType,
        contactDate: c.contactDate,
      })),
      predictions: normalizedPredictions.map((p) => ({
        id: p.id,
        predictionType: p.predictionType,
        score: p.score || 0,
      })),
    };
    validation = validateCitations(result.brief, sourceData);
  }

  // Extract all citations for storage
  const allCitations = extractAllCitations(result.brief);

  return {
    content: result.brief,
    citations: allCitations,
    promptTokens: result.usage.inputTokens,
    completionTokens: result.usage.outputTokens,
    modelUsed: result.modelUsed,
    validation,
  };
}

function normalizeDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof (value as { toNumber(): number }).toNumber === "function") {
    return (value as { toNumber(): number }).toNumber();
  }
  return null;
}

function extractAllCitations(brief: BriefContent): unknown[] {
  const citations: unknown[] = [];

  if (brief.summary?.citations) {
    citations.push(...brief.summary.citations);
  }
  if (brief.givingHistory?.citations) {
    citations.push(...brief.givingHistory.citations);
  }
  if (brief.relationshipHighlights?.citations) {
    citations.push(...brief.relationshipHighlights.citations);
  }
  if (brief.conversationStarters?.citations) {
    citations.push(...brief.conversationStarters.citations);
  }
  if (brief.recommendedAsk?.citations) {
    citations.push(...brief.recommendedAsk.citations);
  }

  return citations;
}

export function calculateLifetimeGiving(gifts: GiftData[]): number {
  return gifts.reduce((sum, g) => {
    const amount = normalizeDecimal(g.amount);
    return sum + (amount || 0);
  }, 0);
}

export function getTopFunds(gifts: GiftData[], topN = 3): string[] {
  const fundAmounts = new Map<string, number>();

  for (const gift of gifts) {
    const fundName = gift.fundName || "General Fund";
    const amount = normalizeDecimal(gift.amount) || 0;
    fundAmounts.set(fundName, (fundAmounts.get(fundName) || 0) + amount);
  }

  return Array.from(fundAmounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([fund]) => fund);
}

export function getLastGiftDate(gifts: GiftData[]): Date | null {
  if (gifts.length === 0) return null;

  const sorted = [...gifts].sort(
    (a, b) => b.giftDate.getTime() - a.giftDate.getTime()
  );

  return sorted[0]?.giftDate || null;
}

export function getLastContactDate(contacts: ContactData[]): Date | null {
  if (contacts.length === 0) return null;

  const sorted = [...contacts].sort(
    (a, b) => b.contactDate.getTime() - a.contactDate.getTime()
  );

  return sorted[0]?.contactDate || null;
}
