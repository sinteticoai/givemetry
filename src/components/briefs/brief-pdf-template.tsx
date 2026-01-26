// T173: Brief PDF template using @react-pdf/renderer
"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 4,
  },
  sectionContent: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 1.6,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    padding: 12,
  },
  statLabel: {
    fontSize: 9,
    color: "#15803d",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#166534",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  listNumber: {
    width: 20,
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "bold",
  },
  listText: {
    flex: 1,
    fontSize: 11,
    color: "#334155",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: "#94a3b8",
  },
  askBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 6,
    padding: 15,
    marginTop: 10,
  },
  askAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 5,
  },
  askPurpose: {
    fontSize: 12,
    color: "#78350f",
    marginBottom: 8,
  },
  askRationale: {
    fontSize: 10,
    color: "#92400e",
    fontStyle: "italic",
  },
});

interface BriefContent {
  summary?: { text: string };
  givingHistory?: { text: string; totalLifetime: number };
  relationshipHighlights?: { text: string };
  conversationStarters?: { items: string[] };
  recommendedAsk?: { amount: number | null; purpose: string; rationale: string };
}

interface Brief {
  id: string;
  content: BriefContent;
  createdAt: string | Date;
}

interface BriefPdfDocumentProps {
  brief: Brief;
  constituentName: string;
}

export function BriefPdfDocument({ brief, constituentName }: BriefPdfDocumentProps) {
  const content = brief.content;

  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Donor Brief: {constituentName}</Text>
          <Text style={styles.subtitle}>Generated {formatDate(brief.createdAt)}</Text>
        </View>

        {/* Stats Row */}
        {content.givingHistory?.totalLifetime !== undefined && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Lifetime Giving</Text>
              <Text style={styles.statValue}>
                {formatCurrency(content.givingHistory.totalLifetime)}
              </Text>
            </View>
          </View>
        )}

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.sectionContent}>
            {content.summary?.text || "No summary available."}
          </Text>
        </View>

        {/* Giving History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giving History</Text>
          <Text style={styles.sectionContent}>
            {content.givingHistory?.text || "No giving history available."}
          </Text>
        </View>

        {/* Relationship Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Highlights</Text>
          <Text style={styles.sectionContent}>
            {content.relationshipHighlights?.text || "No relationship history recorded."}
          </Text>
        </View>

        {/* Conversation Starters */}
        {content.conversationStarters?.items && content.conversationStarters.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversation Starters</Text>
            {content.conversationStarters.items.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listNumber}>{index + 1}.</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommended Ask */}
        {content.recommendedAsk && (content.recommendedAsk.amount || content.recommendedAsk.purpose) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Ask</Text>
            <View style={styles.askBox}>
              {content.recommendedAsk.amount && (
                <Text style={styles.askAmount}>
                  {formatCurrency(content.recommendedAsk.amount)}
                </Text>
              )}
              {content.recommendedAsk.purpose && (
                <Text style={styles.askPurpose}>{content.recommendedAsk.purpose}</Text>
              )}
              {content.recommendedAsk.rationale && (
                <Text style={styles.askRationale}>{content.recommendedAsk.rationale}</Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>GiveMetry Donor Intelligence Platform</Text>
          <Text style={styles.footerText}>Confidential</Text>
        </View>
      </Page>
    </Document>
  );
}
