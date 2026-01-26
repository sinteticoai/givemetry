// T207: Executive report content aggregator
// Aggregates data from various sources for report generation

export interface ContentAggregatorInput {
  organizationId: string;
  constituents: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    priorityScore: number | null;
    lapseRiskScore: number | null;
    estimatedCapacity: number | null;
    assignedOfficerId: string | null;
    dataQualityScore: number | null;
  }>;
  gifts: Array<{
    id: string;
    constituentId: string;
    amount: number;
    giftDate: Date;
  }>;
  contacts: Array<{
    id: string;
    constituentId: string;
    contactDate: Date;
    contactType: string;
  }>;
  users: Array<{
    id: string;
    name: string | null;
  }>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AggregatedReportData {
  totalConstituents: number;
  totalGiving: number;
  averageGift: number;
  healthScore: number;
  healthBreakdown: {
    completeness: number;
    freshness: number;
    consistency: number;
    coverage: number;
  };
  lapseRiskSummary: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    totalAtRiskValue: number;
  };
  topOpportunities: Array<{
    id: string;
    name: string;
    capacity: string;
    priorityScore: number;
    recommendedAction: string;
    reason: string;
  }>;
  topRisks: Array<{
    id: string;
    name: string;
    riskLevel: string;
    riskScore: number;
    lastGift: string;
    lifetimeValue: number;
    primaryFactor: string;
  }>;
  portfolioMetrics: Array<{
    officerId: string;
    officerName: string;
    portfolioSize: number;
    totalCapacity: string;
    noContactPercent: number;
    status: "healthy" | "overloaded" | "underutilized";
  }>;
}

/**
 * Format capacity to readable label
 */
function formatCapacityLabel(capacity: number | null): string {
  if (!capacity) return "Unknown";
  if (capacity >= 1000000) return "$1M+";
  if (capacity >= 500000) return "$500K-$1M";
  if (capacity >= 250000) return "$250K-$500K";
  if (capacity >= 100000) return "$100K-$250K";
  if (capacity >= 50000) return "$50K-$100K";
  if (capacity >= 25000) return "$25K-$50K";
  if (capacity >= 10000) return "$10K-$25K";
  return "< $10K";
}

/**
 * Generate recommended action based on constituent data
 */
function generateRecommendedAction(
  priorityScore: number,
  lapseRiskScore: number | null,
  hasRecentContact: boolean
): string {
  if (lapseRiskScore && lapseRiskScore > 0.7) {
    return "Re-engagement call";
  }
  if (!hasRecentContact && priorityScore > 0.8) {
    return "Schedule meeting";
  }
  if (priorityScore > 0.85) {
    return "Proposal presentation";
  }
  if (priorityScore > 0.7) {
    return "Schedule meeting";
  }
  return "Stewardship touch";
}

/**
 * Generate opportunity reason
 */
function generateOpportunityReason(
  capacity: number | null,
  priorityScore: number,
  hasRecentGift: boolean
): string {
  const reasons: string[] = [];

  if (capacity && capacity >= 100000) {
    reasons.push("High capacity");
  }

  if (priorityScore > 0.85) {
    reasons.push("Strong engagement signals");
  }

  if (hasRecentGift) {
    reasons.push("Recent giving activity");
  }

  return reasons.join(", ") || "Priority prospect";
}

/**
 * Filter gifts by date range
 */
function filterGiftsByDateRange(
  gifts: ContentAggregatorInput["gifts"],
  dateRange?: ContentAggregatorInput["dateRange"]
): ContentAggregatorInput["gifts"] {
  if (!dateRange) return gifts;

  return gifts.filter((gift) => {
    const giftDate = new Date(gift.giftDate);
    return giftDate >= dateRange.start && giftDate <= dateRange.end;
  });
}

/**
 * Aggregate all report content
 */
export async function aggregateReportContent(
  input: ContentAggregatorInput
): Promise<AggregatedReportData> {
  const { constituents, gifts, contacts, users, dateRange } = input;

  // Filter gifts by date range
  const filteredGifts = filterGiftsByDateRange(gifts, dateRange);

  // Calculate totals
  const totalConstituents = constituents.length;
  const totalGiving = filteredGifts.reduce((sum, g) => sum + g.amount, 0);
  const averageGift = filteredGifts.length > 0 ? totalGiving / filteredGifts.length : 0;

  // Aggregate health metrics
  const healthMetrics = aggregateHealthMetrics(constituents, filteredGifts, contacts);

  // Aggregate lapse risk data
  const lapseRiskData = aggregateLapseRiskData(constituents, filteredGifts);

  // Aggregate opportunities
  const opportunities = aggregateOpportunities(constituents, filteredGifts, contacts);

  // Aggregate portfolio metrics
  const portfolioMetrics = aggregatePortfolioMetrics(constituents, contacts, users);

  return {
    totalConstituents,
    totalGiving,
    averageGift,
    healthScore: healthMetrics.overallScore,
    healthBreakdown: healthMetrics.breakdown,
    lapseRiskSummary: {
      highRiskCount: lapseRiskData.highRiskCount,
      mediumRiskCount: lapseRiskData.mediumRiskCount,
      lowRiskCount: lapseRiskData.lowRiskCount,
      totalAtRiskValue: lapseRiskData.totalAtRiskValue,
    },
    topOpportunities: opportunities.opportunities,
    topRisks: lapseRiskData.topRisks,
    portfolioMetrics,
  };
}

/**
 * Aggregate health metrics from constituents
 */
export function aggregateHealthMetrics(
  constituents: ContentAggregatorInput["constituents"],
  gifts: ContentAggregatorInput["gifts"],
  contacts: ContentAggregatorInput["contacts"]
): {
  overallScore: number;
  breakdown: {
    completeness: number;
    freshness: number;
    consistency: number;
    coverage: number;
  };
  issues: Array<{ issue: string; severity: "high" | "medium" | "low" }>;
} {
  if (constituents.length === 0) {
    return {
      overallScore: 0,
      breakdown: { completeness: 0, freshness: 0, consistency: 0, coverage: 0 },
      issues: [],
    };
  }

  // Calculate completeness (percentage of constituents with email)
  const withEmail = constituents.filter((c) => c.email).length;
  const completeness = withEmail / constituents.length;

  // Calculate freshness (percentage with recent activity - last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentGiftIds = new Set(
    gifts.filter((g) => new Date(g.giftDate) >= oneYearAgo).map((g) => g.constituentId)
  );
  const recentContactIds = new Set(
    contacts.filter((c) => new Date(c.contactDate) >= oneYearAgo).map((c) => c.constituentId)
  );

  const withRecentActivity = constituents.filter(
    (c) => recentGiftIds.has(c.id) || recentContactIds.has(c.id)
  ).length;
  const freshness = withRecentActivity / constituents.length;

  // Calculate consistency (average data quality score)
  const qualityScores = constituents
    .filter((c) => c.dataQualityScore !== null)
    .map((c) => c.dataQualityScore!);
  const consistency =
    qualityScores.length > 0
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
      : 0.7; // Default

  // Calculate coverage (percentage with assigned officer and contact)
  const withOfficer = constituents.filter((c) => c.assignedOfficerId).length;
  const coverage = withOfficer / constituents.length;

  // Calculate overall score (weighted average)
  const overallScore =
    completeness * 0.3 + freshness * 0.25 + consistency * 0.25 + coverage * 0.2;

  // Identify issues
  const issues: Array<{ issue: string; severity: "high" | "medium" | "low" }> = [];
  if (completeness < 0.6) {
    issues.push({ issue: "Low email coverage", severity: "high" });
  } else if (completeness < 0.8) {
    issues.push({ issue: "Moderate email gaps", severity: "medium" });
  }

  if (freshness < 0.5) {
    issues.push({ issue: "Many constituents without recent activity", severity: "high" });
  }

  if (coverage < 0.7) {
    issues.push({ issue: "Portfolio assignment gaps", severity: "medium" });
  }

  return {
    overallScore,
    breakdown: {
      completeness,
      freshness,
      consistency,
      coverage,
    },
    issues,
  };
}

/**
 * Aggregate lapse risk data
 */
export function aggregateLapseRiskData(
  constituents: ContentAggregatorInput["constituents"],
  gifts: ContentAggregatorInput["gifts"]
): {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalAtRiskValue: number;
  topRisks: AggregatedReportData["topRisks"];
} {
  // Create gift lookup by constituent
  const giftsByConstituent = new Map<string, ContentAggregatorInput["gifts"]>();
  gifts.forEach((gift) => {
    const existing = giftsByConstituent.get(gift.constituentId) || [];
    existing.push(gift);
    giftsByConstituent.set(gift.constituentId, existing);
  });

  // Categorize by risk level
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let totalAtRiskValue = 0;

  const riskConstituents: Array<{
    constituent: ContentAggregatorInput["constituents"][0];
    riskScore: number;
    lifetimeValue: number;
    lastGiftDate: Date | null;
  }> = [];

  constituents.forEach((c) => {
    const riskScore = c.lapseRiskScore ?? 0;
    const constituentGifts = giftsByConstituent.get(c.id) || [];
    const lifetimeValue = constituentGifts.reduce((sum, g) => sum + g.amount, 0);

    const sortedGifts = [...constituentGifts].sort(
      (a, b) => new Date(b.giftDate).getTime() - new Date(a.giftDate).getTime()
    );
    const lastGiftDate = sortedGifts[0]?.giftDate ? new Date(sortedGifts[0].giftDate) : null;

    if (riskScore > 0.7) {
      highRiskCount++;
      totalAtRiskValue += lifetimeValue;
      riskConstituents.push({ constituent: c, riskScore, lifetimeValue, lastGiftDate });
    } else if (riskScore > 0.4) {
      mediumRiskCount++;
      riskConstituents.push({ constituent: c, riskScore, lifetimeValue, lastGiftDate });
    } else {
      lowRiskCount++;
    }
  });

  // Sort by risk score descending and take top 10
  const topRisks = riskConstituents
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((r) => ({
      id: r.constituent.id,
      name:
        [r.constituent.firstName, r.constituent.lastName].filter(Boolean).join(" ") || "Unknown",
      riskLevel: r.riskScore > 0.7 ? "high" : r.riskScore > 0.4 ? "medium" : "low",
      riskScore: r.riskScore,
      lastGift: r.lastGiftDate?.toISOString().split("T")[0] || "Never",
      lifetimeValue: r.lifetimeValue,
      primaryFactor: generateRiskFactor(r.riskScore, r.lastGiftDate, r.lifetimeValue),
    }));

  return {
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    totalAtRiskValue,
    topRisks,
  };
}

/**
 * Generate risk factor description
 */
function generateRiskFactor(
  riskScore: number,
  lastGiftDate: Date | null,
  lifetimeValue: number
): string {
  if (!lastGiftDate) {
    return "No giving history";
  }

  const monthsSinceGift = Math.floor(
    (Date.now() - lastGiftDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (monthsSinceGift > 18) {
    return `${monthsSinceGift} months since last gift`;
  }

  if (riskScore > 0.8) {
    return "Significant decline in engagement";
  }

  if (lifetimeValue > 10000 && monthsSinceGift > 12) {
    return "Major donor without recent activity";
  }

  return "Decreased giving frequency";
}

/**
 * Aggregate opportunities
 */
export function aggregateOpportunities(
  constituents: ContentAggregatorInput["constituents"],
  gifts: ContentAggregatorInput["gifts"],
  contacts: ContentAggregatorInput["contacts"],
  limit = 10
): {
  opportunities: AggregatedReportData["topOpportunities"];
  totalPipelineValue: number;
} {
  // Create recent contact lookup
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentContactIds = new Set(
    contacts.filter((c) => new Date(c.contactDate) >= threeMonthsAgo).map((c) => c.constituentId)
  );

  // Create recent gift lookup
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentGiftIds = new Set(
    gifts.filter((g) => new Date(g.giftDate) >= sixMonthsAgo).map((g) => g.constituentId)
  );

  // Sort by priority score and take top N
  const opportunities = constituents
    .filter((c) => (c.priorityScore ?? 0) > 0.5) // Only include promising prospects
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
      capacity: formatCapacityLabel(c.estimatedCapacity),
      priorityScore: c.priorityScore ?? 0,
      recommendedAction: generateRecommendedAction(
        c.priorityScore ?? 0,
        c.lapseRiskScore,
        recentContactIds.has(c.id)
      ),
      reason: generateOpportunityReason(
        c.estimatedCapacity,
        c.priorityScore ?? 0,
        recentGiftIds.has(c.id)
      ),
    }));

  // Calculate total pipeline value
  const totalPipelineValue = opportunities.reduce((sum, opp) => {
    const constituent = constituents.find((c) => c.id === opp.id);
    return sum + (constituent?.estimatedCapacity ?? 0);
  }, 0);

  return { opportunities, totalPipelineValue };
}

/**
 * Aggregate portfolio metrics per officer
 */
export function aggregatePortfolioMetrics(
  constituents: ContentAggregatorInput["constituents"],
  contacts: ContentAggregatorInput["contacts"],
  users: ContentAggregatorInput["users"]
): AggregatedReportData["portfolioMetrics"] {
  // Create contact lookup
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentContactIds = new Set(
    contacts.filter((c) => new Date(c.contactDate) >= sixMonthsAgo).map((c) => c.constituentId)
  );

  // Group constituents by officer
  const byOfficer = new Map<string, ContentAggregatorInput["constituents"]>();
  constituents.forEach((c) => {
    if (c.assignedOfficerId) {
      const existing = byOfficer.get(c.assignedOfficerId) || [];
      existing.push(c);
      byOfficer.set(c.assignedOfficerId, existing);
    }
  });

  // Calculate metrics for each officer
  const metrics: AggregatedReportData["portfolioMetrics"] = [];

  users.forEach((user) => {
    const portfolio = byOfficer.get(user.id) || [];
    if (portfolio.length === 0) return;

    const portfolioSize = portfolio.length;
    const totalCapacity = portfolio.reduce((sum, c) => sum + (c.estimatedCapacity ?? 0), 0);
    const noContactCount = portfolio.filter((c) => !recentContactIds.has(c.id)).length;
    const noContactPercent = Math.round((noContactCount / portfolioSize) * 100);

    // Determine status
    let status: "healthy" | "overloaded" | "underutilized";
    if (portfolioSize > 175) {
      status = "overloaded";
    } else if (portfolioSize < 75) {
      status = "underutilized";
    } else {
      status = "healthy";
    }

    // Override status if contact rate is concerning
    if (noContactPercent > 30 && status === "healthy") {
      status = "overloaded"; // Likely too many to manage effectively
    }

    metrics.push({
      officerId: user.id,
      officerName: user.name || "Unknown Officer",
      portfolioSize,
      totalCapacity: formatCapacityLabel(totalCapacity),
      noContactPercent,
      status,
    });
  });

  return metrics.sort((a, b) => b.portfolioSize - a.portfolioSize);
}

/**
 * Calculate key metrics for report
 */
export function calculateKeyMetrics(
  constituents: ContentAggregatorInput["constituents"],
  gifts: ContentAggregatorInput["gifts"],
  contacts: ContentAggregatorInput["contacts"]
): Array<{
  name: string;
  value: string;
  change: number | null;
  trend: "up" | "down" | "stable";
  benchmark: string | null;
}> {
  const totalConstituents = constituents.length;
  const totalGiving = gifts.reduce((sum, g) => sum + g.amount, 0);
  const averageGift = gifts.length > 0 ? totalGiving / gifts.length : 0;
  const activeConstituents = new Set(gifts.map((g) => g.constituentId)).size;
  const contactedConstituents = new Set(contacts.map((c) => c.constituentId)).size;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(n);

  return [
    {
      name: "Total Constituents",
      value: totalConstituents.toLocaleString(),
      change: null,
      trend: "stable",
      benchmark: null,
    },
    {
      name: "Total Giving",
      value: formatCurrency(totalGiving),
      change: null,
      trend: "stable",
      benchmark: null,
    },
    {
      name: "Average Gift",
      value: formatCurrency(averageGift),
      change: null,
      trend: "stable",
      benchmark: "Industry avg: $1,200",
    },
    {
      name: "Active Donors",
      value: activeConstituents.toLocaleString(),
      change: null,
      trend: "stable",
      benchmark: null,
    },
    {
      name: "Contacted",
      value: `${contactedConstituents.toLocaleString()} (${Math.round((contactedConstituents / totalConstituents) * 100)}%)`,
      change: null,
      trend: contactedConstituents / totalConstituents > 0.6 ? "up" : "stable",
      benchmark: "Target: 75%",
    },
  ];
}
