// T208: PDF report template with @react-pdf/renderer
"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ExecutiveReportContent } from "./report-generator";

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  // Header
  header: {
    marginBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: "#1e40af",
    paddingBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 3,
  },
  orgName: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "bold",
  },
  dateRange: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 5,
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 4,
  },
  sectionContent: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
    paddingHorizontal: 5,
  },
  // Metrics
  metricsRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
  },
  metricLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  metricTrend: {
    fontSize: 8,
    marginTop: 2,
  },
  trendUp: {
    color: "#16a34a",
  },
  trendDown: {
    color: "#dc2626",
  },
  trendStable: {
    color: "#64748b",
  },
  // Health Score
  healthScoreBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 2,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  healthScoreLabel: {
    fontSize: 12,
    color: "#1e40af",
    fontWeight: "bold",
    flex: 1,
  },
  healthScoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e40af",
  },
  // Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    fontSize: 9,
    color: "#334155",
  },
  // Alert boxes
  alertBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  alertHigh: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  alertMedium: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  alertLow: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  alertText: {
    fontSize: 9,
    color: "#334155",
  },
  // Risk summary
  riskSummaryBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  riskSummaryText: {
    fontSize: 11,
    color: "#991b1b",
    fontWeight: "bold",
  },
  // Opportunities
  opportunityItem: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    marginBottom: 8,
  },
  opportunityRank: {
    width: 25,
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
  },
  opportunityContent: {
    flex: 1,
  },
  opportunityName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  opportunityDetails: {
    fontSize: 9,
    color: "#64748b",
  },
  opportunityAction: {
    fontSize: 9,
    color: "#1e40af",
    marginTop: 4,
  },
  // Actions
  actionItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  actionPriority: {
    width: 30,
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 10,
    color: "#1e293b",
    marginBottom: 2,
  },
  actionImpact: {
    fontSize: 9,
    color: "#64748b",
  },
  // Portfolio metrics
  portfolioCard: {
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    marginBottom: 8,
  },
  portfolioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  portfolioName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statusBadge: {
    fontSize: 8,
    padding: 3,
    borderRadius: 3,
  },
  statusHealthy: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusOverloaded: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
  },
  statusUnderutilized: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  portfolioStats: {
    flexDirection: "row",
    gap: 15,
  },
  portfolioStat: {
    fontSize: 9,
    color: "#64748b",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  disclaimer: {
    fontSize: 7,
    color: "#94a3b8",
    marginTop: 5,
    fontStyle: "italic",
  },
  // Page number
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

interface ReportPdfDocumentProps {
  content: ExecutiveReportContent;
}

/**
 * Executive Report PDF Document
 */
export function ReportPdfDocument({ content }: ReportPdfDocumentProps) {
  const getTrendStyle = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return styles.trendUp;
      case "down":
        return styles.trendDown;
      default:
        return styles.trendStable;
    }
  };

  const getTrendSymbol = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getStatusStyle = (status: "healthy" | "overloaded" | "underutilized") => {
    switch (status) {
      case "healthy":
        return styles.statusHealthy;
      case "overloaded":
        return styles.statusOverloaded;
      default:
        return styles.statusUnderutilized;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{content.header.title}</Text>
          <Text style={styles.subtitle}>{content.header.subtitle}</Text>
          <Text style={styles.orgName}>{content.header.organization}</Text>
          <Text style={styles.dateRange}>
            {content.header.dateRange} • Generated{" "}
            {new Date(content.header.generatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Key Metrics */}
        {content.keyMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsRow}>
              {content.keyMetrics.metrics.slice(0, 3).map((metric, index) => (
                <View key={index} style={styles.metricBox}>
                  <Text style={styles.metricLabel}>{metric.name}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={[styles.metricTrend, getTrendStyle(metric.trend)]}>
                    {getTrendSymbol(metric.trend)} {metric.benchmark || ""}
                  </Text>
                </View>
              ))}
            </View>
            {content.keyMetrics.metrics.length > 3 && (
              <View style={styles.metricsRow}>
                {content.keyMetrics.metrics.slice(3).map((metric, index) => (
                  <View key={index} style={styles.metricBox}>
                    <Text style={styles.metricLabel}>{metric.name}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={[styles.metricTrend, getTrendStyle(metric.trend)]}>
                      {getTrendSymbol(metric.trend)} {metric.benchmark || ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Portfolio Health */}
        {content.portfolioHealth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Health</Text>
            <View style={styles.healthScoreBox}>
              <Text style={styles.healthScoreLabel}>Overall Health Score</Text>
              <Text style={styles.healthScoreValue}>
                {Math.round(content.portfolioHealth.overallScore * 100)}%
              </Text>
            </View>
            <View style={styles.metricsRow}>
              {content.portfolioHealth.scoreBreakdown.map((item, index) => (
                <View key={index} style={styles.metricBox}>
                  <Text style={styles.metricLabel}>{item.category}</Text>
                  <Text style={styles.metricValue}>{Math.round(item.score * 100)}%</Text>
                </View>
              ))}
            </View>
            {content.portfolioHealth.keyIssues.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5 }}>
                  Key Issues
                </Text>
                {content.portfolioHealth.keyIssues.map((issue, index) => (
                  <View key={index} style={[styles.alertBox, styles.alertMedium]}>
                    <Text style={styles.alertText}>
                      {issue.issue}: {issue.recommendation}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Risk Alerts */}
        {content.riskAlerts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Alerts</Text>
            <View style={styles.riskSummaryBox}>
              <Text style={styles.riskSummaryText}>{content.riskAlerts.summary}</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Risk</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Last Gift</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Factor</Text>
              </View>
              {content.riskAlerts.topRisks.slice(0, 5).map((risk, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{risk.name}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1, color: risk.riskLevel === "high" ? "#dc2626" : "#ca8a04" },
                    ]}
                  >
                    {risk.riskLevel.toUpperCase()}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{risk.lastGift}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{risk.primaryFactor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{content.footer.generatedBy}</Text>
            <Text style={styles.footerText}>{content.footer.confidentiality}</Text>
          </View>
          <Text style={styles.disclaimer}>{content.footer.disclaimer}</Text>
        </View>
      </Page>

      {/* Page 2: Opportunities and Actions */}
      {(content.topOpportunities || content.recommendedActions || content.portfolioBalance) && (
        <Page size="A4" style={styles.page}>
          {/* Top Opportunities */}
          {content.topOpportunities && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Opportunities</Text>
              <Text style={[styles.sectionContent, { marginBottom: 10 }]}>
                {content.topOpportunities.summary}
              </Text>
              {content.topOpportunities.opportunities.slice(0, 5).map((opp, index) => (
                <View key={index} style={styles.opportunityItem}>
                  <Text style={styles.opportunityRank}>{opp.rank}</Text>
                  <View style={styles.opportunityContent}>
                    <Text style={styles.opportunityName}>{opp.name}</Text>
                    <Text style={styles.opportunityDetails}>
                      Capacity: {opp.capacity} • Priority Score: {Math.round(opp.priorityScore * 100)}
                      %
                    </Text>
                    <Text style={styles.opportunityAction}>
                      Action: {opp.recommendedAction} - {opp.reason}
                    </Text>
                  </View>
                </View>
              ))}
              {content.topOpportunities.totalPipelineValue > 0 && (
                <Text
                  style={{
                    fontSize: 10,
                    color: "#1e40af",
                    fontWeight: "bold",
                    marginTop: 10,
                  }}
                >
                  Total Pipeline Value: {formatCurrency(content.topOpportunities.totalPipelineValue)}
                </Text>
              )}
            </View>
          )}

          {/* Recommended Actions */}
          {content.recommendedActions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Actions</Text>
              <Text style={[styles.sectionContent, { marginBottom: 10 }]}>
                {content.recommendedActions.summary}
              </Text>
              {content.recommendedActions.actions.map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <Text style={styles.actionPriority}>#{action.priority}</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionText}>{action.action}</Text>
                    <Text style={styles.actionImpact}>
                      Impact: {action.impact}
                      {action.deadline && ` • Due: ${action.deadline}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Portfolio Balance */}
          {content.portfolioBalance && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Portfolio Balance</Text>
              <Text style={[styles.sectionContent, { marginBottom: 10 }]}>
                {content.portfolioBalance.summary}
              </Text>
              {content.portfolioBalance.officerMetrics.slice(0, 4).map((officer, index) => (
                <View key={index} style={styles.portfolioCard}>
                  <View style={styles.portfolioHeader}>
                    <Text style={styles.portfolioName}>{officer.name}</Text>
                    <Text style={[styles.statusBadge, getStatusStyle(officer.status)]}>
                      {officer.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.portfolioStats}>
                    <Text style={styles.portfolioStat}>
                      Portfolio: {officer.portfolioSize} constituents
                    </Text>
                    <Text style={styles.portfolioStat}>Capacity: {officer.totalCapacity}</Text>
                    <Text style={styles.portfolioStat}>No Contact: {officer.noContactPercent}%</Text>
                  </View>
                </View>
              ))}
              {content.portfolioBalance.imbalanceAlerts.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {content.portfolioBalance.imbalanceAlerts.map((alert, index) => (
                    <View key={index} style={[styles.alertBox, styles.alertMedium]}>
                      <Text style={styles.alertText}>{alert}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{content.footer.generatedBy}</Text>
              <Text style={styles.footerText}>{content.footer.confidentiality}</Text>
            </View>
            <Text style={styles.disclaimer}>{content.footer.disclaimer}</Text>
          </View>

          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </Page>
      )}
    </Document>
  );
}

export default ReportPdfDocument;
