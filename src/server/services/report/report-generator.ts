// T206: Report generation service
// Generates executive reports from aggregated data

export interface ReportGeneratorInput {
  organizationId: string;
  organizationName: string;
  userId: string;
  reportType: "executive_summary" | "portfolio_health" | "lapse_risk" | "priorities" | "custom";
  sections: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  customTitle?: string;
  customCommentary?: string;
  includeLogo?: boolean;
  aggregatedData: AggregatedReportData;
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

export interface ExecutiveReportContent {
  header: {
    title: string;
    subtitle: string;
    organization: string;
    generatedAt: string;
    dateRange: string;
    logo: string | null;
  };
  portfolioHealth?: {
    overallScore: number;
    trend: "up" | "down" | "stable";
    scoreBreakdown: Array<{
      category: string;
      score: number;
      change: number;
    }>;
    keyIssues: Array<{
      issue: string;
      impact: string;
      recommendation: string;
    }>;
  };
  topOpportunities?: {
    summary: string;
    opportunities: Array<{
      rank: number;
      name: string;
      capacity: string;
      priorityScore: number;
      recommendedAction: string;
      reason: string;
    }>;
    totalPipelineValue: number;
  };
  riskAlerts?: {
    summary: string;
    highRiskCount: number;
    totalAtRiskValue: number;
    topRisks: Array<{
      name: string;
      riskLevel: string;
      lastGift: string;
      lifetimeValue: number;
      primaryFactor: string;
    }>;
  };
  keyMetrics?: {
    metrics: Array<{
      name: string;
      value: string;
      change: number | null;
      trend: "up" | "down" | "stable";
      benchmark: string | null;
    }>;
  };
  recommendedActions?: {
    summary: string;
    actions: Array<{
      priority: number;
      action: string;
      impact: string;
      owner: string | null;
      deadline: string | null;
    }>;
  };
  portfolioBalance?: {
    summary: string;
    officerMetrics: Array<{
      name: string;
      portfolioSize: number;
      totalCapacity: string;
      noContactPercent: number;
      status: "healthy" | "overloaded" | "underutilized";
    }>;
    imbalanceAlerts: string[];
  };
  footer: {
    disclaimer: string;
    generatedBy: string;
    confidentiality: string;
  };
}

/**
 * Format currency values
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date range for display
 */
function formatDateRange(start?: Date, end?: Date): string {
  if (!start && !end) {
    return "All Time";
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (start && end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
  }
  if (start) {
    return `From ${formatDate(start)}`;
  }
  if (end) {
    return `Through ${formatDate(end)}`;
  }
  return "All Time";
}

/**
 * Calculate trend based on score
 */
function calculateTrend(score: number, previousScore?: number): "up" | "down" | "stable" {
  if (previousScore === undefined) {
    return "stable";
  }
  const change = score - previousScore;
  if (Math.abs(change) < 0.02) {
    return "stable";
  }
  return change > 0 ? "up" : "down";
}

/**
 * Generate health issues from score breakdown
 */
function generateHealthIssues(breakdown: AggregatedReportData["healthBreakdown"]): Array<{
  issue: string;
  impact: string;
  recommendation: string;
}> {
  const issues: Array<{ issue: string; impact: string; recommendation: string }> = [];

  if (breakdown.completeness < 0.7) {
    issues.push({
      issue: "Low data completeness",
      impact: "Reduced prediction accuracy and incomplete donor profiles",
      recommendation: "Focus on enriching key contact fields during next data upload",
    });
  }

  if (breakdown.freshness < 0.7) {
    issues.push({
      issue: "Stale data detected",
      impact: "Recommendations may not reflect current donor status",
      recommendation: "Schedule regular data imports from CRM system",
    });
  }

  if (breakdown.consistency < 0.7) {
    issues.push({
      issue: "Data format inconsistencies",
      impact: "May affect matching and deduplication",
      recommendation: "Review and standardize data entry practices",
    });
  }

  if (breakdown.coverage < 0.7) {
    issues.push({
      issue: "Portfolio coverage gaps",
      impact: "Some constituents may not receive appropriate attention",
      recommendation: "Review portfolio assignments and contact schedules",
    });
  }

  return issues;
}

/**
 * Generate recommended actions from report data
 */
function generateRecommendedActions(data: AggregatedReportData): Array<{
  priority: number;
  action: string;
  impact: string;
  owner: string | null;
  deadline: string | null;
}> {
  const actions: Array<{
    priority: number;
    action: string;
    impact: string;
    owner: string | null;
    deadline: string | null;
  }> = [];

  // High risk action
  if (data.lapseRiskSummary.highRiskCount > 0) {
    actions.push({
      priority: 1,
      action: `Contact ${data.lapseRiskSummary.highRiskCount} high-risk donors immediately`,
      impact: `Potential to retain ${formatCurrency(data.lapseRiskSummary.totalAtRiskValue)} in giving`,
      owner: null,
      deadline: "Within 2 weeks",
    });
  }

  // Top opportunity action
  if (data.topOpportunities.length > 0) {
    const topOpp = data.topOpportunities[0];
    actions.push({
      priority: 2,
      action: `Schedule meeting with ${topOpp?.name || "top prospect"}`,
      impact: `High-priority prospect with strong capacity rating`,
      owner: null,
      deadline: "Within 1 week",
    });
  }

  // Portfolio balance action
  const overloadedOfficers = data.portfolioMetrics.filter((m) => m.status === "overloaded");
  if (overloadedOfficers.length > 0) {
    actions.push({
      priority: 3,
      action: `Review portfolio distribution for ${overloadedOfficers.length} overloaded officer(s)`,
      impact: "Improved coverage and donor attention",
      owner: "Manager",
      deadline: "End of quarter",
    });
  }

  // Data quality action
  if (data.healthScore < 0.75) {
    actions.push({
      priority: 4,
      action: "Improve data quality through targeted enrichment",
      impact: "Better predictions and more accurate insights",
      owner: "Data Team",
      deadline: "Ongoing",
    });
  }

  return actions.slice(0, 5);
}

/**
 * Generate imbalance alerts from portfolio metrics
 */
function generateImbalanceAlerts(metrics: AggregatedReportData["portfolioMetrics"]): string[] {
  const alerts: string[] = [];

  const overloaded = metrics.filter((m) => m.status === "overloaded");
  const underutilized = metrics.filter((m) => m.status === "underutilized");

  if (overloaded.length > 0) {
    alerts.push(
      `${overloaded.length} gift officer(s) have portfolios exceeding recommended capacity`
    );
  }

  if (underutilized.length > 0) {
    alerts.push(`${underutilized.length} gift officer(s) have capacity for additional prospects`);
  }

  const highNoContact = metrics.filter((m) => m.noContactPercent > 25);
  if (highNoContact.length > 0) {
    alerts.push(
      `${highNoContact.length} portfolio(s) have more than 25% constituents without recent contact`
    );
  }

  return alerts;
}

/**
 * Generate executive summary report
 */
export async function generateExecutiveReport(
  input: ReportGeneratorInput
): Promise<ExecutiveReportContent> {
  const { sections, aggregatedData, organizationName, customTitle, dateRange } = input;

  const content: ExecutiveReportContent = {
    header: {
      title: customTitle || "Executive Summary Report",
      subtitle: "Donor Portfolio Intelligence",
      organization: organizationName,
      generatedAt: new Date().toISOString(),
      dateRange: formatDateRange(dateRange?.start, dateRange?.end),
      logo: null,
    },
    footer: {
      disclaimer:
        "This report is generated using AI-powered analytics. Predictions and recommendations should be validated with direct donor knowledge.",
      generatedBy: "GiveMetry",
      confidentiality: "Confidential - Internal Use Only",
    },
  };

  // Add requested sections
  if (sections.includes("portfolioHealth")) {
    content.portfolioHealth = {
      overallScore: aggregatedData.healthScore,
      trend: calculateTrend(aggregatedData.healthScore),
      scoreBreakdown: [
        {
          category: "Completeness",
          score: aggregatedData.healthBreakdown.completeness,
          change: 0,
        },
        { category: "Freshness", score: aggregatedData.healthBreakdown.freshness, change: 0 },
        {
          category: "Consistency",
          score: aggregatedData.healthBreakdown.consistency,
          change: 0,
        },
        { category: "Coverage", score: aggregatedData.healthBreakdown.coverage, change: 0 },
      ],
      keyIssues: generateHealthIssues(aggregatedData.healthBreakdown),
    };
  }

  if (sections.includes("topOpportunities")) {
    const totalPipeline = aggregatedData.topOpportunities.reduce((sum, opp) => {
      // Extract numeric value from capacity string
      const match = opp.capacity.match(/\$?([\d,]+)/);
      return sum + (match ? parseInt(match[1]!.replace(/,/g, "")) : 0);
    }, 0);

    content.topOpportunities = {
      summary: `${aggregatedData.topOpportunities.length} high-priority prospects identified with a combined pipeline value of ${formatCurrency(totalPipeline)}`,
      opportunities: aggregatedData.topOpportunities.map((opp, index) => ({
        rank: index + 1,
        name: opp.name,
        capacity: opp.capacity,
        priorityScore: opp.priorityScore,
        recommendedAction: opp.recommendedAction,
        reason: opp.reason,
      })),
      totalPipelineValue: totalPipeline,
    };
  }

  if (sections.includes("riskAlerts")) {
    content.riskAlerts = {
      summary: `${aggregatedData.lapseRiskSummary.highRiskCount} donors at high risk of lapsing, representing ${formatCurrency(aggregatedData.lapseRiskSummary.totalAtRiskValue)} in potential lost giving`,
      highRiskCount: aggregatedData.lapseRiskSummary.highRiskCount,
      totalAtRiskValue: aggregatedData.lapseRiskSummary.totalAtRiskValue,
      topRisks: aggregatedData.topRisks.map((risk) => ({
        name: risk.name,
        riskLevel: risk.riskLevel,
        lastGift: risk.lastGift,
        lifetimeValue: risk.lifetimeValue,
        primaryFactor: risk.primaryFactor,
      })),
    };
  }

  if (sections.includes("keyMetrics")) {
    content.keyMetrics = {
      metrics: [
        {
          name: "Total Constituents",
          value: aggregatedData.totalConstituents.toLocaleString(),
          change: null,
          trend: "stable",
          benchmark: null,
        },
        {
          name: "Total Giving",
          value: formatCurrency(aggregatedData.totalGiving),
          change: null,
          trend: "stable",
          benchmark: null,
        },
        {
          name: "Average Gift",
          value: formatCurrency(aggregatedData.averageGift),
          change: null,
          trend: "stable",
          benchmark: null,
        },
        {
          name: "Data Health Score",
          value: `${Math.round(aggregatedData.healthScore * 100)}%`,
          change: null,
          trend: calculateTrend(aggregatedData.healthScore),
          benchmark: "Industry avg: 72%",
        },
        {
          name: "High Risk Donors",
          value: aggregatedData.lapseRiskSummary.highRiskCount.toString(),
          change: null,
          trend: aggregatedData.lapseRiskSummary.highRiskCount > 50 ? "up" : "stable",
          benchmark: null,
        },
      ],
    };
  }

  if (sections.includes("recommendedActions")) {
    const actions = generateRecommendedActions(aggregatedData);
    content.recommendedActions = {
      summary: `${actions.length} priority actions identified to improve portfolio performance`,
      actions,
    };
  }

  if (sections.includes("portfolioBalance")) {
    content.portfolioBalance = {
      summary: `Portfolio balance across ${aggregatedData.portfolioMetrics.length} gift officers`,
      officerMetrics: aggregatedData.portfolioMetrics.map((m) => ({
        name: m.officerName,
        portfolioSize: m.portfolioSize,
        totalCapacity: m.totalCapacity,
        noContactPercent: m.noContactPercent,
        status: m.status,
      })),
      imbalanceAlerts: generateImbalanceAlerts(aggregatedData.portfolioMetrics),
    };
  }

  return content;
}

/**
 * Generate portfolio health report (focused on data quality)
 */
export async function generatePortfolioHealthReport(
  input: ReportGeneratorInput
): Promise<ExecutiveReportContent> {
  return generateExecutiveReport({
    ...input,
    customTitle: input.customTitle || "Portfolio Health Report",
    sections: ["portfolioHealth", "keyMetrics", "portfolioBalance"],
  });
}

/**
 * Generate lapse risk report
 */
export async function generateLapseRiskReport(
  input: ReportGeneratorInput
): Promise<ExecutiveReportContent> {
  return generateExecutiveReport({
    ...input,
    customTitle: input.customTitle || "Lapse Risk Report",
    sections: ["riskAlerts", "keyMetrics", "recommendedActions"],
  });
}

/**
 * Generate priorities report
 */
export async function generatePrioritiesReport(
  input: ReportGeneratorInput
): Promise<ExecutiveReportContent> {
  return generateExecutiveReport({
    ...input,
    customTitle: input.customTitle || "Priorities Report",
    sections: ["topOpportunities", "keyMetrics", "recommendedActions"],
  });
}
