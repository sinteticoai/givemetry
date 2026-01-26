// T238: Portfolio imbalance detection service
/**
 * Portfolio Imbalance Detection Service
 *
 * Detects and analyzes portfolio imbalances across gift officers:
 * - Size imbalance (constituent count variance)
 * - Capacity imbalance (total managed capacity variance)
 * - Workload imbalance (priority/risk concentration)
 */

export interface OfficerMetricsSummary {
  officerId: string;
  officerName: string | null;
  constituentCount: number;
  totalCapacity: number;
  avgPriorityScore: number;
}

export interface ImbalanceThresholds {
  sizeVarianceThreshold: number; // CV threshold for size imbalance
  capacityVarianceThreshold: number; // CV threshold for capacity imbalance
  overloadMultiplier: number; // How many times average = overloaded
  underutilizedMultiplier: number; // How many times below average = underutilized
}

export interface ImbalanceInput {
  officers: OfficerMetricsSummary[];
  thresholds?: Partial<ImbalanceThresholds>;
}

export interface ImbalanceDetail {
  type: "size" | "capacity" | "workload";
  severity: "high" | "medium" | "low";
  description: string;
  average: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  affectedOfficers: Array<{
    officerId: string;
    officerName: string | null;
    value: number;
    deviation: number;
    status: "overloaded" | "underutilized";
  }>;
}

export interface ImbalanceResult {
  hasImbalances: boolean;
  sizeImbalance: ImbalanceDetail | null;
  capacityImbalance: ImbalanceDetail | null;
  workloadImbalance: ImbalanceDetail | null;
  overallSeverity: "high" | "medium" | "low" | "none";
}

export interface ImbalanceAlert {
  officerId: string;
  officerName: string | null;
  type: "overloaded" | "underutilized" | "capacity-heavy" | "balanced";
  severity: "high" | "medium" | "low";
  message: string;
  metrics: {
    constituentCount: number;
    totalCapacity: number;
    deviationFromAverage: number;
  };
}

// Default thresholds
const DEFAULT_THRESHOLDS: ImbalanceThresholds = {
  sizeVarianceThreshold: 0.5, // 50% CV threshold
  capacityVarianceThreshold: 0.5, // 50% CV threshold
  overloadMultiplier: 1.5, // 50% above average
  underutilizedMultiplier: 0.5, // 50% below average
};

/**
 * Calculate imbalance score using coefficient of variation
 * Returns 0 for perfect balance, higher values for more imbalance
 */
export function calculateImbalanceScore(values: number[]): number {
  if (values.length <= 1) return 0;

  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;

  if (average === 0) return 0;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation
  return stdDev / average;
}

/**
 * Determine imbalance type for a single officer
 */
export function getImbalanceType(
  officer: OfficerMetricsSummary,
  averageSize: number,
  averageCapacity: number,
  thresholds: ImbalanceThresholds = DEFAULT_THRESHOLDS
): "overloaded" | "underutilized" | "capacity-heavy" | "balanced" {
  const sizeRatio = averageSize > 0 ? officer.constituentCount / averageSize : 1;
  const capacityRatio = averageCapacity > 0 ? officer.totalCapacity / averageCapacity : 1;

  // Check for overloaded (both size and capacity high)
  if (sizeRatio >= thresholds.overloadMultiplier) {
    return "overloaded";
  }

  // Check for underutilized (both size and capacity low)
  if (sizeRatio <= thresholds.underutilizedMultiplier) {
    return "underutilized";
  }

  // Check for capacity-heavy (normal size but high capacity)
  if (capacityRatio >= thresholds.overloadMultiplier * 1.5 && sizeRatio < thresholds.overloadMultiplier) {
    return "capacity-heavy";
  }

  return "balanced";
}

/**
 * Analyze imbalances across all dimensions
 */
function analyzeImbalanceDimension(
  officers: OfficerMetricsSummary[],
  getValue: (o: OfficerMetricsSummary) => number,
  type: "size" | "capacity" | "workload",
  threshold: number
): ImbalanceDetail | null {
  if (officers.length <= 1) return null;

  const values = officers.map(getValue);
  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;

  if (average === 0) return null;

  const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / average;

  if (cv < threshold) return null;

  // Find affected officers
  const affectedOfficers = officers
    .map((o, i) => {
      const value = values[i] ?? 0;
      const deviation = (value - average) / average;
      let status: "overloaded" | "underutilized" | null = null;

      if (deviation > 0.5) status = "overloaded";
      else if (deviation < -0.5) status = "underutilized";

      return {
        officerId: o.officerId,
        officerName: o.officerName,
        value,
        deviation,
        status,
      };
    })
    .filter((o): o is { officerId: string; officerName: string | null; value: number; deviation: number; status: "overloaded" | "underutilized" } => o.status !== null);

  // Determine severity
  let severity: "high" | "medium" | "low" = "low";
  if (cv > threshold * 2) severity = "high";
  else if (cv > threshold * 1.5) severity = "medium";

  const typeLabel = type === "size" ? "portfolio sizes" : type === "capacity" ? "managed capacity" : "workload";
  const description = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} vary significantly across officers (CV: ${(cv * 100).toFixed(1)}%)`;

  return {
    type,
    severity,
    description,
    average,
    standardDeviation: stdDev,
    coefficientOfVariation: cv,
    affectedOfficers,
  };
}

/**
 * Detect all portfolio imbalances
 */
export function detectImbalances(input: ImbalanceInput): ImbalanceResult {
  const { officers, thresholds: customThresholds } = input;
  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };

  if (officers.length <= 1) {
    return {
      hasImbalances: false,
      sizeImbalance: null,
      capacityImbalance: null,
      workloadImbalance: null,
      overallSeverity: "none",
    };
  }

  // Analyze size imbalance
  const sizeImbalance = analyzeImbalanceDimension(
    officers,
    o => o.constituentCount,
    "size",
    thresholds.sizeVarianceThreshold
  );

  // Analyze capacity imbalance
  const capacityImbalance = analyzeImbalanceDimension(
    officers,
    o => o.totalCapacity,
    "capacity",
    thresholds.capacityVarianceThreshold
  );

  // Analyze workload imbalance (using priority as proxy)
  const workloadImbalance = analyzeImbalanceDimension(
    officers,
    o => o.avgPriorityScore * o.constituentCount, // Weighted workload
    "workload",
    thresholds.sizeVarianceThreshold
  );

  const hasImbalances = sizeImbalance !== null || capacityImbalance !== null || workloadImbalance !== null;

  // Determine overall severity
  const severities = [
    sizeImbalance?.severity,
    capacityImbalance?.severity,
    workloadImbalance?.severity,
  ].filter(Boolean);

  let overallSeverity: "high" | "medium" | "low" | "none" = "none";
  if (severities.includes("high")) overallSeverity = "high";
  else if (severities.includes("medium")) overallSeverity = "medium";
  else if (severities.length > 0) overallSeverity = "low";

  return {
    hasImbalances,
    sizeImbalance,
    capacityImbalance,
    workloadImbalance,
    overallSeverity,
  };
}

/**
 * Generate actionable alerts for officers with imbalanced portfolios
 */
export function generateImbalanceAlerts(officers: OfficerMetricsSummary[]): ImbalanceAlert[] {
  if (officers.length <= 1) return [];

  const alerts: ImbalanceAlert[] = [];

  // Calculate averages
  const totalSize = officers.reduce((sum, o) => sum + o.constituentCount, 0);
  const totalCapacity = officers.reduce((sum, o) => sum + o.totalCapacity, 0);
  const avgSize = totalSize / officers.length;
  const avgCapacity = totalCapacity / officers.length;

  for (const officer of officers) {
    const type = getImbalanceType(officer, avgSize, avgCapacity);

    if (type === "balanced") continue;

    const sizeDeviation = avgSize > 0 ? (officer.constituentCount - avgSize) / avgSize : 0;
    const capacityDeviation = avgCapacity > 0 ? (officer.totalCapacity - avgCapacity) / avgCapacity : 0;

    // Determine severity based on deviation magnitude
    let severity: "high" | "medium" | "low" = "low";
    const maxDeviation = Math.max(Math.abs(sizeDeviation), Math.abs(capacityDeviation));
    if (maxDeviation > 1.0) severity = "high"; // More than 100% deviation
    else if (maxDeviation > 0.5) severity = "medium"; // More than 50% deviation

    // Generate message
    let message = "";
    switch (type) {
      case "overloaded":
        message = `Portfolio is ${Math.round(sizeDeviation * 100)}% larger than average (${officer.constituentCount} vs ${Math.round(avgSize)} constituents)`;
        break;
      case "underutilized":
        message = `Portfolio is ${Math.round(Math.abs(sizeDeviation) * 100)}% smaller than average (${officer.constituentCount} vs ${Math.round(avgSize)} constituents)`;
        break;
      case "capacity-heavy":
        message = `Portfolio has ${Math.round(capacityDeviation * 100)}% more capacity than average while maintaining normal size`;
        break;
    }

    alerts.push({
      officerId: officer.officerId,
      officerName: officer.officerName,
      type,
      severity,
      message,
      metrics: {
        constituentCount: officer.constituentCount,
        totalCapacity: officer.totalCapacity,
        deviationFromAverage: sizeDeviation,
      },
    });
  }

  // Sort by severity (high first)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

/**
 * Get imbalance summary suitable for display
 */
export function getImbalanceSummary(result: ImbalanceResult): {
  hasIssues: boolean;
  issueCount: number;
  severity: string;
  primaryIssue: string | null;
} {
  const issues = [
    result.sizeImbalance,
    result.capacityImbalance,
    result.workloadImbalance,
  ].filter(Boolean);

  if (issues.length === 0) {
    return {
      hasIssues: false,
      issueCount: 0,
      severity: "none",
      primaryIssue: null,
    };
  }

  // Find primary issue (highest severity)
  const primaryIssue = issues.reduce((highest, current) => {
    if (!current) return highest;
    if (!highest) return current;

    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[current.severity] < severityOrder[highest.severity] ? current : highest;
  }, null as ImbalanceDetail | null);

  return {
    hasIssues: true,
    issueCount: issues.length,
    severity: result.overallSeverity,
    primaryIssue: primaryIssue?.description || null,
  };
}
