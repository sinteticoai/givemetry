// Shared types for brief components
export type CitationSource = "profile" | "gift" | "contact" | "prediction";

export interface Citation {
  text: string;
  source: CitationSource;
  sourceId: string;
  date?: string;
}

export interface BriefContent {
  summary?: {
    text: string;
    citations?: Citation[];
  };
  givingHistory?: {
    text: string;
    totalLifetime: number;
    citations?: Citation[];
  };
  relationshipHighlights?: {
    text: string;
    citations?: Citation[];
  };
  conversationStarters?: {
    items: string[];
    citations?: Citation[];
  };
  recommendedAsk?: {
    amount: number | null;
    purpose: string;
    rationale: string;
    citations?: Citation[];
  };
}

export interface Brief {
  id: string;
  content: BriefContent | Record<string, unknown>;
  modelUsed?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  createdAt: string | Date;
  constituent?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}
