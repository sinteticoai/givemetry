// T195: Next-best-action recommendation engine
/**
 * Recommendation Engine Service
 *
 * Generates contextual next-best-action recommendations for donors based on:
 * - Priority score and factors
 * - Lapse risk score and factors
 * - Engagement history (gifts, contacts)
 * - Timing (fiscal year, campaigns)
 * - Capacity indicators
 *
 * The engine uses rule-based logic for explainable recommendations
 * per Constitution Principle I (Explainability).
 */

import {
  ACTION_TYPES,
  ACTION_SELECTION_WEIGHTS,
  generateActionReasoning,
  type ActionType,
  type ActionContext,
} from "./action-types";

// Re-export ACTION_TYPES for test compatibility
export { ACTION_TYPES };

export interface ConstituentContext {
  id: string;
  name: string;
  constituentType: string;
  priorityScore: number;
  lapseRiskScore: number | null;
  lapseRiskLevel: "high" | "medium" | "low";
  capacity: {
    score: number;
    label: string;
    estimatedCapacity: number | null;
  };
  engagement: {
    lastGiftDate: Date | null;
    lastContactDate: Date | null;
    giftCount: number;
    contactCount: number;
    totalGiving: number;
    averageGift: number;
    largestGift: number;
    recentActivitySummary: string;
  };
  timing: {
    fiscalYearEnd: Date;
    daysUntilFYEnd: number;
    activeCampaigns: string[];
    indicator: string;
  };
  predictions: {
    likelihoodScore: number;
    confidenceLevel: number;
  };
  referenceDate: Date;
}

export interface Recommendation {
  actionType: string;
  actionLabel: string;
  actionDescription: string;
  reasoning: string;
  confidence: number;
  urgencyLevel: "high" | "medium" | "low";
  nextSteps: string[];
  alternatives: AlternativeAction[];
  context: {
    primaryFactor: string;
    supportingFactors: string[];
  };
}

export interface AlternativeAction {
  actionType: string;
  label: string;
  reason: string;
}

interface ConfidenceFactors {
  dataQuality: number;
  patternMatch: number;
  historicalSuccess: number;
  timingAlignment: number;
}

/**
 * Generate a next-best-action recommendation for a constituent
 */
export function generateRecommendation(context: ConstituentContext): Recommendation {
  // Analyze the context and select the best action
  const selectedAction = selectBestAction(context);
  const urgencyLevel = calculateUrgency(context);
  const confidence = calculateRecommendationConfidence(context, selectedAction);
  const alternatives = selectAlternativeActions(context, selectedAction.id);

  // Build action context for reasoning generation
  const actionContext = buildActionContext(context);
  const reasoning = generateActionReasoning(selectedAction.id, actionContext);

  // Determine primary and supporting factors
  const { primaryFactor, supportingFactors } = analyzeDecisionFactors(context, selectedAction);

  // Personalize next steps
  const nextSteps = personalizeNextSteps(selectedAction, context);

  return {
    actionType: selectedAction.id,
    actionLabel: selectedAction.label,
    actionDescription: selectedAction.description,
    reasoning,
    confidence,
    urgencyLevel,
    nextSteps,
    alternatives,
    context: {
      primaryFactor,
      supportingFactors,
    },
  };
}

/**
 * Select the best action based on constituent context
 */
function selectBestAction(context: ConstituentContext): ActionType {
  const scores: Array<{ action: ActionType; score: number }> = [];

  // Score each action type based on context fit
  for (const action of Object.values(ACTION_TYPES)) {
    const score = scoreActionFit(action, context);
    scores.push({ action, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Return the highest scoring action (fallback to schedule_meeting)
  const topAction = scores[0]?.action;
  const fallback = ACTION_TYPES["schedule_meeting"];
  if (!topAction) {
    // This should never happen since ACTION_TYPES is non-empty, but TypeScript needs reassurance
    if (!fallback) {
      throw new Error("No actions available");
    }
    return fallback;
  }
  return topAction;
}

/**
 * Score how well an action fits the current context
 */
function scoreActionFit(action: ActionType, context: ConstituentContext): number {
  let score = 0;
  const w = ACTION_SELECTION_WEIGHTS;

  // Calculate days since last contact and gift
  const daysSinceContact = context.engagement.lastContactDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastContactDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const daysSinceGift = context.engagement.lastGiftDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastGiftDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Check for recent gift that needs acknowledgment
  const hasRecentGift = daysSinceGift !== null && daysSinceGift <= 30;
  const needsStewardship = hasRecentGift && (daysSinceContact === null || daysSinceContact > daysSinceGift);

  // Check for stale engagement
  const isStale = daysSinceContact !== null ? daysSinceContact > 180 : context.engagement.contactCount === 0;

  // Check if high lapse risk
  const isHighLapseRisk = context.lapseRiskLevel === "high" || (context.lapseRiskScore !== null && context.lapseRiskScore >= 0.7);

  // Check if high priority
  const isHighPriority = context.priorityScore >= 0.7;

  // Check if high capacity
  const isHighCapacity = context.capacity.score >= 0.7;

  // Check for active campaigns
  const hasCampaign = context.timing.activeCampaigns.length > 0;

  // Check for fiscal year end approaching
  const fyEndApproaching = context.timing.daysUntilFYEnd <= 60;

  // Score based on action category and context
  switch (action.category) {
    case "stewardship":
      if (needsStewardship) {
        score += 0.8 * w.recencyWeight;
        if (action.id === "thank_you_visit" && isHighCapacity) {
          score += 0.3;
        }
        if (action.id === "stewardship_call") {
          score += 0.2;
        }
      }
      if (action.id === "send_impact_report" && !isStale && !needsStewardship) {
        score += 0.4 * w.recencyWeight;
      }
      break;

    case "re-engagement":
      if (isStale || isHighLapseRisk) {
        score += 0.7 * w.lapseRiskWeight;
        if (isHighCapacity) {
          score += 0.3 * w.capacityWeight;
        }
      }
      break;

    case "solicitation":
      if (hasCampaign && !isHighLapseRisk && !needsStewardship) {
        score += 0.6 * w.timingWeight;
        if (isHighCapacity) {
          score += 0.3 * w.capacityWeight;
        }
        if (fyEndApproaching) {
          score += 0.2 * w.timingWeight;
        }
      }
      if (action.id === "pledge_reminder") {
        score -= 0.2; // Lower priority unless explicitly needed
      }
      break;

    case "cultivation":
      if (isHighPriority && !needsStewardship && !isHighLapseRisk) {
        score += 0.6 * w.priorityScoreWeight;
        if (action.id === "schedule_meeting") {
          score += 0.2;
        }
      }
      if (context.engagement.contactCount === 0 && action.id === "initial_outreach") {
        score += 0.7;
      }
      if (action.id === "event_invitation" && hasCampaign) {
        score += 0.3 * w.timingWeight;
      }
      break;
  }

  // Boost high-urgency actions when timing is critical
  if (action.defaultUrgency === "high") {
    if (fyEndApproaching || isHighLapseRisk) {
      score += 0.15;
    }
  }

  // Capacity-based adjustments
  if (isHighCapacity && ["thank_you_visit", "schedule_meeting", "campus_visit"].includes(action.id)) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate urgency level for the recommendation
 */
function calculateUrgency(context: ConstituentContext): "high" | "medium" | "low" {
  let urgencyScore = 0;

  // High lapse risk increases urgency
  if (context.lapseRiskLevel === "high") {
    urgencyScore += 0.35;
  } else if (context.lapseRiskLevel === "medium") {
    urgencyScore += 0.15;
  }

  // Fiscal year end approaching
  if (context.timing.daysUntilFYEnd <= 30) {
    urgencyScore += 0.3;
  } else if (context.timing.daysUntilFYEnd <= 60) {
    urgencyScore += 0.15;
  }

  // High priority score
  if (context.priorityScore >= 0.8) {
    urgencyScore += 0.2;
  } else if (context.priorityScore >= 0.6) {
    urgencyScore += 0.1;
  }

  // Recent gift needing acknowledgment
  const daysSinceGift = context.engagement.lastGiftDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastGiftDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  if (daysSinceGift !== null && daysSinceGift <= 7) {
    urgencyScore += 0.25;
  } else if (daysSinceGift !== null && daysSinceGift <= 30) {
    urgencyScore += 0.1;
  }

  // High capacity with no recent contact
  const daysSinceContact = context.engagement.lastContactDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastContactDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  if (context.capacity.score >= 0.7 && (daysSinceContact === null || daysSinceContact > 90)) {
    urgencyScore += 0.15;
  }

  // Map score to urgency level
  if (urgencyScore >= 0.5) return "high";
  if (urgencyScore >= 0.25) return "medium";
  return "low";
}

/**
 * Calculate confidence score for the recommendation
 */
export function calculateActionConfidence(factors: ConfidenceFactors): number {
  const { dataQuality, patternMatch, historicalSuccess, timingAlignment } = factors;

  // Weighted average of confidence factors
  const weights = {
    dataQuality: 0.35,
    patternMatch: 0.25,
    historicalSuccess: 0.25,
    timingAlignment: 0.15,
  };

  const confidence =
    Math.min(1, dataQuality) * weights.dataQuality +
    Math.min(1, patternMatch) * weights.patternMatch +
    Math.min(1, historicalSuccess) * weights.historicalSuccess +
    Math.min(1, timingAlignment) * weights.timingAlignment;

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate recommendation confidence based on context and selected action
 */
function calculateRecommendationConfidence(
  context: ConstituentContext,
  action: ActionType
): number {
  // Data quality score
  let dataQuality = 0;
  if (context.engagement.giftCount >= 5) dataQuality += 0.3;
  else if (context.engagement.giftCount >= 2) dataQuality += 0.2;
  else if (context.engagement.giftCount >= 1) dataQuality += 0.1;

  if (context.engagement.contactCount >= 3) dataQuality += 0.2;
  else if (context.engagement.contactCount >= 1) dataQuality += 0.1;

  if (context.capacity.estimatedCapacity !== null) dataQuality += 0.2;
  if (context.predictions.confidenceLevel > 0.7) dataQuality += 0.15;
  dataQuality += context.predictions.confidenceLevel * 0.15;

  // Pattern match - how well does the context match typical scenarios for this action
  let patternMatch = 0.5; // Base score
  const daysSinceGift = context.engagement.lastGiftDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastGiftDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  if (action.category === "stewardship" && daysSinceGift !== null && daysSinceGift <= 30) {
    patternMatch += 0.3;
  }
  if (action.category === "re-engagement" && context.lapseRiskLevel === "high") {
    patternMatch += 0.3;
  }
  if (action.category === "solicitation" && context.timing.activeCampaigns.length > 0) {
    patternMatch += 0.25;
  }
  if (action.category === "cultivation" && context.priorityScore >= 0.6) {
    patternMatch += 0.2;
  }

  // Historical success placeholder (would be learned from actual outcomes)
  const historicalSuccess = 0.65;

  // Timing alignment
  let timingAlignment = 0.5;
  if (action.category === "solicitation" && context.timing.daysUntilFYEnd <= 90) {
    timingAlignment += 0.3;
  }
  if (context.timing.activeCampaigns.length > 0) {
    timingAlignment += 0.2;
  }

  return calculateActionConfidence({
    dataQuality,
    patternMatch,
    historicalSuccess,
    timingAlignment,
  });
}

/**
 * Select alternative actions for the recommendation
 */
function selectAlternativeActions(
  context: ConstituentContext,
  selectedActionId: string
): AlternativeAction[] {
  const alternatives: AlternativeAction[] = [];
  const scores: Array<{ action: ActionType; score: number }> = [];

  for (const action of Object.values(ACTION_TYPES)) {
    if (action.id === selectedActionId) continue;
    const score = scoreActionFit(action, context);
    scores.push({ action, score });
  }

  // Sort and take top 2-3 alternatives
  scores.sort((a, b) => b.score - a.score);
  const topAlternatives = scores.slice(0, 3);

  for (const { action, score } of topAlternatives) {
    if (score > 0.2) {
      alternatives.push({
        actionType: action.id,
        label: action.label,
        reason: getAlternativeReason(action, context),
      });
    }
  }

  return alternatives;
}

/**
 * Generate reason for why this is a good alternative action
 */
function getAlternativeReason(action: ActionType, context: ConstituentContext): string {
  switch (action.category) {
    case "stewardship":
      return `Good option for maintaining the relationship with ${context.name}`;
    case "re-engagement":
      return "Could help reconnect if the primary approach doesn't work";
    case "solicitation":
      return context.timing.activeCampaigns.length > 0
        ? `Aligned with ${context.timing.activeCampaigns[0]}`
        : "Consider when timing is right for an ask";
    case "cultivation":
      return "Builds relationship foundation for future engagement";
    default:
      return "Alternative approach based on donor profile";
  }
}

/**
 * Build action context for reasoning generation
 */
function buildActionContext(context: ConstituentContext): ActionContext {
  const daysSinceContact = context.engagement.lastContactDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastContactDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Determine engagement level
  let engagementLevel: "high" | "medium" | "low" = "low";
  if (context.engagement.giftCount >= 5 && context.engagement.contactCount >= 3) {
    engagementLevel = "high";
  } else if (context.engagement.giftCount >= 2 || context.engagement.contactCount >= 1) {
    engagementLevel = "medium";
  }

  // Recent gift info
  let recentGiftInfo: string | undefined;
  if (context.engagement.lastGiftDate) {
    const daysSinceGift = Math.floor(
      (context.referenceDate.getTime() - context.engagement.lastGiftDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceGift <= 90) {
      recentGiftInfo = `a gift ${daysSinceGift} days ago`;
    }
  }

  return {
    name: context.name,
    constituentType: context.constituentType,
    capacityLabel: context.capacity.label,
    engagementLevel,
    giftCount: context.engagement.giftCount,
    totalGiving: context.engagement.totalGiving,
    averageGift: context.engagement.averageGift,
    recentGiftInfo,
    daysSinceLastContact: daysSinceContact,
    lapseRiskLevel: context.lapseRiskLevel,
    campaign: context.timing.activeCampaigns[0],
    suggestedAsk: context.engagement.averageGift > 0
      ? Math.round(context.engagement.averageGift * 1.2)
      : undefined,
  };
}

/**
 * Analyze which factors drove the action selection
 */
function analyzeDecisionFactors(
  context: ConstituentContext,
  action: ActionType
): { primaryFactor: string; supportingFactors: string[] } {
  const factors: string[] = [];
  let primaryFactor = "Overall donor profile";

  const daysSinceGift = context.engagement.lastGiftDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastGiftDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const daysSinceContact = context.engagement.lastContactDate
    ? Math.floor(
        (context.referenceDate.getTime() - context.engagement.lastContactDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Determine primary factor based on action category
  switch (action.category) {
    case "stewardship":
      if (daysSinceGift !== null && daysSinceGift <= 30) {
        primaryFactor = "Recent gift requiring acknowledgment";
        factors.push(`Gift received ${daysSinceGift} days ago`);
      } else {
        primaryFactor = "Relationship maintenance";
      }
      break;

    case "re-engagement":
      if (context.lapseRiskLevel === "high") {
        primaryFactor = "High lapse risk";
        factors.push(`Lapse risk score: ${Math.round((context.lapseRiskScore || 0) * 100)}%`);
      } else if (daysSinceContact !== null && daysSinceContact > 180) {
        primaryFactor = "Stale engagement";
        factors.push(`${daysSinceContact} days since last contact`);
      }
      break;

    case "solicitation":
      if (context.timing.activeCampaigns.length > 0) {
        primaryFactor = "Active campaign opportunity";
        factors.push(`Campaign: ${context.timing.activeCampaigns[0]}`);
      }
      if (context.timing.daysUntilFYEnd <= 60) {
        factors.push(`${context.timing.daysUntilFYEnd} days until fiscal year end`);
      }
      break;

    case "cultivation":
      if (context.priorityScore >= 0.7) {
        primaryFactor = "High priority prospect";
        factors.push(`Priority score: ${Math.round(context.priorityScore * 100)}%`);
      }
      if (context.capacity.score >= 0.7) {
        factors.push(`${context.capacity.label} capacity`);
      }
      break;
  }

  // Add supporting factors
  if (context.capacity.score >= 0.6) {
    factors.push(`Capacity: ${context.capacity.label}`);
  }
  if (context.engagement.totalGiving > 0) {
    factors.push(`Lifetime giving: $${context.engagement.totalGiving.toLocaleString()}`);
  }
  if (context.engagement.giftCount > 0) {
    factors.push(`${context.engagement.giftCount} previous gifts`);
  }

  return {
    primaryFactor,
    supportingFactors: factors.slice(0, 4), // Limit to 4 supporting factors
  };
}

/**
 * Personalize next steps based on context
 */
function personalizeNextSteps(action: ActionType, context: ConstituentContext): string[] {
  const steps = [...action.suggestedNextSteps];

  // Add context-specific steps
  if (context.timing.activeCampaigns.length > 0 && action.category !== "stewardship") {
    steps.push(`Prepare talking points about ${context.timing.activeCampaigns[0]}`);
  }

  if (context.capacity.score >= 0.7) {
    steps.push("Consider involving leadership for this high-capacity donor");
  }

  if (context.lapseRiskLevel === "high" && action.category === "re-engagement") {
    steps.push("Review any changes in donor circumstances or giving patterns");
  }

  // Limit to 5 most relevant steps
  return steps.slice(0, 5);
}

/**
 * Build constituent context from database records
 */
export function buildConstituentContext(data: {
  constituent: {
    id: string;
    firstName: string | null;
    lastName: string;
    constituentType: string | null;
    priorityScore: number | null;
    lapseRiskScore: number | null;
    estimatedCapacity: number | null;
  };
  gifts: Array<{
    amount: number;
    giftDate: Date;
  }>;
  contacts: Array<{
    contactDate: Date;
    contactType: string;
  }>;
  predictions: Array<{
    predictionType: string;
    score: number;
    confidence: number | null;
  }>;
  fiscalYearEnd: Date;
  activeCampaigns?: string[];
  referenceDate?: Date;
}): ConstituentContext {
  const refDate = data.referenceDate || new Date();

  // Calculate engagement metrics
  const sortedGifts = [...data.gifts].sort(
    (a, b) => b.giftDate.getTime() - a.giftDate.getTime()
  );
  const sortedContacts = [...data.contacts].sort(
    (a, b) => b.contactDate.getTime() - a.contactDate.getTime()
  );

  const totalGiving = data.gifts.reduce((sum, g) => sum + g.amount, 0);
  const averageGift = data.gifts.length > 0 ? totalGiving / data.gifts.length : 0;
  const largestGift = data.gifts.length > 0 ? Math.max(...data.gifts.map((g) => g.amount)) : 0;

  // Calculate days until FY end
  const daysUntilFYEnd = Math.max(
    0,
    Math.floor((data.fiscalYearEnd.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Determine capacity label
  const capacity = data.constituent.estimatedCapacity || 0;
  let capacityLabel: string;
  let capacityScore: number;

  if (capacity >= 1000000) {
    capacityLabel = "$1M+";
    capacityScore = 1.0;
  } else if (capacity >= 500000) {
    capacityLabel = "$500K-$1M";
    capacityScore = 0.9;
  } else if (capacity >= 250000) {
    capacityLabel = "$250K-$500K";
    capacityScore = 0.8;
  } else if (capacity >= 100000) {
    capacityLabel = "$100K-$250K";
    capacityScore = 0.7;
  } else if (capacity >= 50000) {
    capacityLabel = "$50K-$100K";
    capacityScore = 0.6;
  } else if (capacity >= 25000) {
    capacityLabel = "$25K-$50K";
    capacityScore = 0.5;
  } else if (capacity >= 10000) {
    capacityLabel = "$10K-$25K";
    capacityScore = 0.4;
  } else {
    capacityLabel = "< $10K";
    capacityScore = 0.3;
  }

  // Get lapse risk level
  const lapseRiskScore = data.constituent.lapseRiskScore;
  let lapseRiskLevel: "high" | "medium" | "low" = "low";
  if (lapseRiskScore !== null) {
    if (lapseRiskScore >= 0.7) lapseRiskLevel = "high";
    else if (lapseRiskScore >= 0.4) lapseRiskLevel = "medium";
  }

  // Get prediction confidence
  const priorityPrediction = data.predictions.find((p) => p.predictionType === "priority");
  const lapsePrediction = data.predictions.find((p) => p.predictionType === "lapse_risk");

  // Build recent activity summary
  const recentActivitySummary =
    data.gifts.length > 0
      ? `${data.gifts.length} gift${data.gifts.length !== 1 ? "s" : ""} totaling $${totalGiving.toLocaleString()}`
      : "No gifts on record";

  // Calculate timing indicator
  let timingIndicator = "";
  if (daysUntilFYEnd <= 30) {
    timingIndicator = "Fiscal year end imminent";
  } else if (daysUntilFYEnd <= 90) {
    timingIndicator = "Q4 - fiscal year end approaching";
  } else {
    timingIndicator = `${daysUntilFYEnd} days until fiscal year end`;
  }

  if (data.activeCampaigns && data.activeCampaigns.length > 0) {
    timingIndicator += ` - ${data.activeCampaigns[0]} active`;
  }

  return {
    id: data.constituent.id,
    name: [data.constituent.firstName, data.constituent.lastName].filter(Boolean).join(" "),
    constituentType: data.constituent.constituentType || "donor",
    priorityScore: data.constituent.priorityScore || 0,
    lapseRiskScore,
    lapseRiskLevel,
    capacity: {
      score: capacityScore,
      label: capacityLabel,
      estimatedCapacity: data.constituent.estimatedCapacity,
    },
    engagement: {
      lastGiftDate: sortedGifts[0]?.giftDate || null,
      lastContactDate: sortedContacts[0]?.contactDate || null,
      giftCount: data.gifts.length,
      contactCount: data.contacts.length,
      totalGiving,
      averageGift,
      largestGift,
      recentActivitySummary,
    },
    timing: {
      fiscalYearEnd: data.fiscalYearEnd,
      daysUntilFYEnd,
      activeCampaigns: data.activeCampaigns || [],
      indicator: timingIndicator,
    },
    predictions: {
      likelihoodScore: lapsePrediction ? 1 - lapsePrediction.score : 0.5,
      confidenceLevel: priorityPrediction?.confidence || lapsePrediction?.confidence || 0.5,
    },
    referenceDate: refDate,
  };
}
