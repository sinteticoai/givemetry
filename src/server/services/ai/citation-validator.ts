// T162: Citation extraction and validation service

export type CitationSource = "profile" | "gift" | "contact" | "prediction";

export interface Citation {
  text: string;
  source: CitationSource;
  sourceId: string;
  date?: string;
}

export interface BriefSection {
  text: string;
  citations: Citation[];
}

export interface BriefContent {
  summary: BriefSection;
  givingHistory: BriefSection & { totalLifetime: number };
  relationshipHighlights: BriefSection;
  conversationStarters: { items: string[]; citations: Citation[] };
  recommendedAsk: {
    amount: number | null;
    purpose: string;
    rationale: string;
    citations: Citation[];
  };
}

export interface SourceData {
  constituent: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    [key: string]: unknown;
  };
  gifts: Array<{
    id: string;
    amount: number;
    giftDate: Date;
    [key: string]: unknown;
  }>;
  contacts: Array<{
    id: string;
    contactType: string;
    contactDate: Date;
    [key: string]: unknown;
  }>;
  predictions: Array<{
    id: string;
    predictionType: string;
    score: number;
    [key: string]: unknown;
  }>;
}

export interface CreateCitationInput {
  text: string;
  source: CitationSource;
  sourceId: string;
  date?: string;
}

export interface VerificationResult {
  valid: boolean;
  matchedData?: unknown;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  validCount: number;
  invalidCount: number;
  invalidCitations: Array<Citation & { error?: string }>;
}

export function createCitation(input: CreateCitationInput): Citation {
  if (!input.text || input.text.trim() === "") {
    throw new Error("Citation text is required");
  }
  if (!input.source || input.source.trim() === "") {
    throw new Error("Citation source is required");
  }
  if (!input.sourceId || input.sourceId.trim() === "") {
    throw new Error("Citation sourceId is required");
  }

  return {
    text: input.text,
    source: input.source,
    sourceId: input.sourceId,
    ...(input.date && { date: input.date }),
  };
}

export function extractCitations(
  briefContent: BriefContent,
  options: { deduplicate?: boolean } = {}
): Citation[] {
  const { deduplicate = false } = options;

  const citations: Citation[] = [];

  // Extract from all sections
  if (briefContent.summary?.citations) {
    citations.push(...briefContent.summary.citations);
  }
  if (briefContent.givingHistory?.citations) {
    citations.push(...briefContent.givingHistory.citations);
  }
  if (briefContent.relationshipHighlights?.citations) {
    citations.push(...briefContent.relationshipHighlights.citations);
  }
  if (briefContent.conversationStarters?.citations) {
    citations.push(...briefContent.conversationStarters.citations);
  }
  if (briefContent.recommendedAsk?.citations) {
    citations.push(...briefContent.recommendedAsk.citations);
  }

  if (deduplicate) {
    const seen = new Set<string>();
    return citations.filter((c) => {
      if (seen.has(c.sourceId)) return false;
      seen.add(c.sourceId);
      return true;
    });
  }

  return citations;
}

export function verifyCitationSource(
  citation: Citation,
  sourceData: SourceData
): VerificationResult {
  const { source, sourceId } = citation;

  switch (source) {
    case "profile": {
      if (sourceData.constituent.id === sourceId) {
        return { valid: true, matchedData: sourceData.constituent };
      }
      return { valid: false, error: `Profile with ID ${sourceId} not found` };
    }

    case "gift": {
      const gift = sourceData.gifts.find((g) => g.id === sourceId);
      if (gift) {
        return { valid: true, matchedData: gift };
      }
      return { valid: false, error: `Gift with ID ${sourceId} not found` };
    }

    case "contact": {
      const contact = sourceData.contacts.find((c) => c.id === sourceId);
      if (contact) {
        return { valid: true, matchedData: contact };
      }
      return { valid: false, error: `Contact with ID ${sourceId} not found` };
    }

    case "prediction": {
      const prediction = sourceData.predictions.find((p) => p.id === sourceId);
      if (prediction) {
        return { valid: true, matchedData: prediction };
      }
      return { valid: false, error: `Prediction with ID ${sourceId} not found` };
    }

    default:
      return { valid: false, error: `Unknown source type: ${source}` };
  }
}

export function validateCitations(
  briefContent: BriefContent,
  sourceData: SourceData
): ValidationResult {
  const citations = extractCitations(briefContent);

  if (citations.length === 0) {
    return {
      valid: true,
      validCount: 0,
      invalidCount: 0,
      invalidCitations: [],
    };
  }

  const invalidCitations: Array<Citation & { error?: string }> = [];
  let validCount = 0;

  for (const citation of citations) {
    const result = verifyCitationSource(citation, sourceData);
    if (result.valid) {
      validCount++;
    } else {
      invalidCitations.push({ ...citation, error: result.error });
    }
  }

  return {
    valid: invalidCitations.length === 0,
    validCount,
    invalidCount: invalidCitations.length,
    invalidCitations,
  };
}

export function formatCitationForDisplay(citation: Citation): string {
  const sourceLabels: Record<CitationSource, string> = {
    profile: "Profile",
    gift: "Gift Record",
    contact: "Contact Record",
    prediction: "AI Prediction",
  };

  const label = sourceLabels[citation.source] || citation.source;
  return `[${label}] ${citation.text}`;
}

export function groupCitationsBySource(citations: Citation[]): Map<CitationSource, Citation[]> {
  const grouped = new Map<CitationSource, Citation[]>();

  for (const citation of citations) {
    const existing = grouped.get(citation.source) || [];
    existing.push(citation);
    grouped.set(citation.source, existing);
  }

  return grouped;
}
