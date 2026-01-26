// T107: Recommendation generator service
// Generates actionable recommendations based on health issues

// Health issue types from analysis modules

export interface Recommendation {
  id: string;
  type: "completeness" | "freshness" | "consistency" | "coverage" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  impact: string;
  affectedCount?: number;
}

export interface HealthIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  field?: string;
  count?: number;
  percentage?: number;
}

// Recommendation templates
const RECOMMENDATION_TEMPLATES: Record<string, Omit<Recommendation, "id" | "affectedCount">> = {
  // Completeness recommendations
  missing_required: {
    type: "completeness",
    priority: "high",
    title: "Complete required fields",
    description: "Some constituents are missing required data fields",
    action: "Export affected records and update CRM with missing required fields",
    impact: "Improves data reliability and enables accurate analysis",
  },
  missing_contact: {
    type: "completeness",
    priority: "medium",
    title: "Add contact information",
    description: "Many constituents lack email or phone contact details",
    action: "Review and update contact information for constituents without email or phone",
    impact: "Enables outreach and communication tracking",
  },
  incomplete_address: {
    type: "completeness",
    priority: "low",
    title: "Complete address information",
    description: "Some addresses are partially filled",
    action: "Update incomplete addresses with city, state, and postal code",
    impact: "Improves mailing capabilities and geographic analysis",
  },

  // Freshness recommendations
  stale_gifts: {
    type: "freshness",
    priority: "high",
    title: "Upload recent gift data",
    description: "Gift data is significantly out of date",
    action: "Export and upload latest gift transactions from your CRM",
    impact: "Ensures accurate giving history for predictions and analysis",
  },
  stale_contacts: {
    type: "freshness",
    priority: "medium",
    title: "Update contact records",
    description: "Contact activity data is getting stale",
    action: "Export and upload recent contact/activity records",
    impact: "Improves engagement tracking and relationship insights",
  },
  outdated_upload: {
    type: "freshness",
    priority: "medium",
    title: "Refresh your data",
    description: "Data hasn't been updated recently",
    action: "Schedule regular data uploads (weekly or monthly)",
    impact: "Keeps insights current and predictions accurate",
  },
  no_gift_history: {
    type: "freshness",
    priority: "high",
    title: "Upload gift history",
    description: "No gift transaction data is available",
    action: "Export gift history from your CRM and upload to GiveMetry",
    impact: "Enables giving pattern analysis and lapse prediction",
  },
  no_contact_history: {
    type: "freshness",
    priority: "medium",
    title: "Upload contact history",
    description: "No contact/activity records are available",
    action: "Export contact reports from your CRM and upload",
    impact: "Enables engagement tracking and relationship insights",
  },

  // Consistency recommendations
  invalid_format: {
    type: "consistency",
    priority: "low",
    title: "Standardize data formats",
    description: "Some fields have inconsistent or invalid formats",
    action: "Review and correct email, phone, and address formats in your CRM",
    impact: "Improves data quality and matching accuracy",
  },
  inconsistent_pattern: {
    type: "consistency",
    priority: "low",
    title: "Normalize phone formats",
    description: "Phone numbers use various formats",
    action: "Standardize phone number formatting in your CRM",
    impact: "Improves consistency and deduplication",
  },
  suspicious_value: {
    type: "consistency",
    priority: "low",
    title: "Review suspicious values",
    description: "Some field values appear unusual or placeholder",
    action: "Review flagged records and correct invalid entries",
    impact: "Improves data accuracy",
  },

  // Coverage recommendations
  unassigned_constituents: {
    type: "coverage",
    priority: "high",
    title: "Assign constituents to gift officers",
    description: "Many constituents are not assigned to a portfolio",
    action: "Review unassigned constituents and add to gift officer portfolios",
    impact: "Ensures all prospects receive appropriate attention",
  },
  no_contacts: {
    type: "coverage",
    priority: "medium",
    title: "Log contact activity",
    description: "Many constituents have no recorded contacts",
    action: "Record touchpoints and interactions for all constituents",
    impact: "Improves relationship tracking and engagement insights",
  },
  no_gifts: {
    type: "coverage",
    priority: "low",
    title: "Verify non-donor records",
    description: "Many constituents have no gift history",
    action: "Verify these are prospects, not donors with missing gift data",
    impact: "Ensures complete giving picture",
  },
  unbalanced_portfolios: {
    type: "coverage",
    priority: "medium",
    title: "Balance portfolio assignments",
    description: "Portfolio sizes vary significantly across gift officers",
    action: "Consider rebalancing portfolios for more even distribution",
    impact: "Optimizes gift officer capacity and coverage",
  },
};

/**
 * Generate recommendations from health issues
 */
export function generateRecommendations(
  issues: HealthIssue[],
  stats: {
    totalConstituents: number;
    overallScore: number;
    completenessScore: number;
    freshnessScore: number;
    consistencyScore: number;
    coverageScore: number;
  }
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const seenTypes = new Set<string>();

  // Process issues to recommendations
  for (const issue of issues) {
    const template = RECOMMENDATION_TEMPLATES[issue.type as keyof typeof RECOMMENDATION_TEMPLATES];
    if (!template || seenTypes.has(issue.type)) continue;

    seenTypes.add(issue.type);

    recommendations.push({
      id: `rec-${issue.type}-${Date.now()}`,
      ...template,
      priority: issue.severity as "high" | "medium" | "low",
      affectedCount: issue.count,
    });
  }

  // Add general recommendations based on scores
  if (stats.totalConstituents === 0) {
    recommendations.unshift({
      id: "rec-no-data",
      type: "general",
      priority: "high",
      title: "Upload your data",
      description: "No constituent data has been uploaded yet",
      action: "Export constituent data from your CRM and upload to GiveMetry",
      impact: "Enables all analytics and insights features",
    });
  }

  // Add recommendation for overall low score
  if (stats.overallScore < 0.5 && stats.totalConstituents > 0) {
    recommendations.push({
      id: "rec-overall-quality",
      type: "general",
      priority: "high",
      title: "Improve overall data quality",
      description: "Data quality is below optimal levels",
      action: "Focus on the highest priority recommendations above",
      impact: "Better data leads to more accurate predictions and insights",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to top 10 recommendations
  return recommendations.slice(0, 10);
}

/**
 * Get quick wins (low-effort, high-impact recommendations)
 */
export function getQuickWins(recommendations: Recommendation[]): Recommendation[] {
  // Quick wins are typically completeness and consistency issues
  // that can be addressed with bulk data updates
  const quickWinTypes = [
    "missing_contact",
    "incomplete_address",
    "invalid_format",
    "inconsistent_pattern",
  ];

  return recommendations.filter(
    (rec) =>
      quickWinTypes.some((type) => rec.id.includes(type)) ||
      (rec.type === "completeness" && rec.priority !== "high")
  );
}

/**
 * Group recommendations by type
 */
export function groupRecommendationsByType(
  recommendations: Recommendation[]
): Record<string, Recommendation[]> {
  const groups: Record<string, Recommendation[]> = {
    completeness: [],
    freshness: [],
    consistency: [],
    coverage: [],
    general: [],
  };

  for (const rec of recommendations) {
    const group = groups[rec.type];
    if (group) {
      group.push(rec);
    }
  }

  return groups;
}

/**
 * Calculate estimated effort for recommendations
 */
export function estimateEffort(recommendation: Recommendation): "low" | "medium" | "high" {
  // Effort estimation based on type and affected count
  const highEffortTypes = ["stale_gifts", "unassigned_constituents", "no_gift_history"];
  const lowEffortTypes = ["invalid_format", "suspicious_value"];

  if (highEffortTypes.some((type) => recommendation.id.includes(type))) {
    return "high";
  }

  if (lowEffortTypes.some((type) => recommendation.id.includes(type))) {
    return "low";
  }

  // Based on affected count
  if (recommendation.affectedCount) {
    if (recommendation.affectedCount > 1000) return "high";
    if (recommendation.affectedCount > 100) return "medium";
  }

  return "medium";
}

/**
 * Get summary statistics for recommendations
 */
export function getRecommendationsSummary(recommendations: Recommendation[]): {
  total: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  totalAffected: number;
} {
  const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const byType: Record<string, number> = {};
  let totalAffected = 0;

  for (const rec of recommendations) {
    byPriority[rec.priority] = (byPriority[rec.priority] || 0) + 1;
    byType[rec.type] = (byType[rec.type] || 0) + 1;
    totalAffected += rec.affectedCount || 0;
  }

  return {
    total: recommendations.length,
    byPriority,
    byType,
    totalAffected,
  };
}
