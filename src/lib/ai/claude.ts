// T157: Claude API client wrapper
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODELS = {
  SONNET: "claude-sonnet-4-20250514",
  HAIKU: "claude-3-5-haiku-20241022",
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface CompletionOptions {
  apiKey: string;
  messages: ClaudeMessage[];
  model?: ClaudeModel;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  stopReason: string;
}

export interface BriefSection {
  text: string;
  citations: Citation[];
}

export interface Citation {
  text: string;
  source: "profile" | "gift" | "contact" | "prediction";
  sourceId: string;
  date?: string;
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

export interface BriefGenerationOptions {
  apiKey: string;
  constituent: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    prefix?: string | null;
    email?: string | null;
    constituentType?: string | null;
    classYear?: number | null;
    schoolCollege?: string | null;
    estimatedCapacity?: number | null;
    [key: string]: unknown;
  };
  gifts: Array<{
    id: string;
    amount: number | { toNumber(): number };
    giftDate: Date;
    fundName?: string | null;
    giftType?: string | null;
    campaign?: string | null;
    [key: string]: unknown;
  }>;
  contacts: Array<{
    id: string;
    contactType: string;
    contactDate: Date;
    notes?: string | null;
    subject?: string | null;
    outcome?: string | null;
    [key: string]: unknown;
  }>;
  predictions?: Array<{
    id: string;
    predictionType: string;
    score: number | { toNumber(): number };
    factors?: unknown;
    [key: string]: unknown;
  }>;
  model?: ClaudeModel;
}

export interface BriefGenerationResult {
  brief: BriefContent;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelUsed: string;
}

let anthropicClient: Anthropic | null = null;

export function createClaudeClient(apiKey: string): Anthropic {
  if (!apiKey) {
    throw new Error("API key is required");
  }
  return new Anthropic({ apiKey });
}

function getClient(apiKey: string): Anthropic {
  if (!anthropicClient) {
    anthropicClient = createClaudeClient(apiKey);
  }
  return anthropicClient;
}

export async function generateCompletion(
  options: CompletionOptions
): Promise<CompletionResult> {
  const {
    apiKey,
    messages,
    model = CLAUDE_MODELS.SONNET,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  const client = getClient(apiKey);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(systemPrompt && { system: systemPrompt }),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textContent = response.content
    .filter((c) => c.type === "text")
    .map((c) => ("text" in c ? c.text : ""))
    .join("");

  return {
    content: textContent,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model: response.model,
    stopReason: response.stop_reason || "unknown",
  };
}

export async function generateBriefContent(
  options: BriefGenerationOptions
): Promise<BriefGenerationResult> {
  const { apiKey, constituent, gifts, contacts, predictions = [], model = CLAUDE_MODELS.SONNET } = options;

  // Format data for the prompt
  const constituentData = formatConstituentData(constituent);
  const giftsData = formatGiftsData(gifts);
  const contactsData = formatContactsData(contacts);
  const predictionsData = formatPredictionsData(predictions);

  const systemPrompt = getBriefSystemPrompt();
  const userPrompt = getBriefUserPrompt({
    constituentData,
    giftsData,
    contactsData,
    predictionsData,
    constituentId: constituent.id,
    giftIds: gifts.map((g) => g.id),
    contactIds: contacts.map((c) => c.id),
    predictionIds: predictions.map((p) => p.id),
  });

  const result = await generateCompletion({
    apiKey,
    model,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4096,
    temperature: 0.3, // Lower temperature for more factual output
  });

  // Parse the JSON response
  let briefContent: BriefContent;
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = result.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim();
    }
    briefContent = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse brief content: Invalid JSON response from AI");
  }

  return {
    brief: briefContent,
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
    modelUsed: result.model,
  };
}

function formatConstituentData(constituent: BriefGenerationOptions["constituent"]): string {
  const parts: string[] = [];

  const name = [constituent.prefix, constituent.firstName, constituent.lastName]
    .filter(Boolean)
    .join(" ");
  if (name) parts.push(`Name: ${name}`);
  if (constituent.email) parts.push(`Email: ${constituent.email}`);
  if (constituent.constituentType) parts.push(`Type: ${constituent.constituentType}`);
  if (constituent.classYear) parts.push(`Class Year: ${constituent.classYear}`);
  if (constituent.schoolCollege) parts.push(`School/College: ${constituent.schoolCollege}`);
  if (constituent.estimatedCapacity) {
    parts.push(`Estimated Capacity: $${constituent.estimatedCapacity.toLocaleString()}`);
  }

  return parts.join("\n") || "No profile data available";
}

function formatGiftsData(gifts: BriefGenerationOptions["gifts"]): string {
  if (gifts.length === 0) {
    return "No giving history on record.";
  }

  const totalAmount = gifts.reduce((sum, g) => {
    const amount = typeof g.amount === "object" ? g.amount.toNumber() : g.amount;
    return sum + amount;
  }, 0);

  const sortedGifts = [...gifts].sort(
    (a, b) => b.giftDate.getTime() - a.giftDate.getTime()
  );

  const lines = [
    `Total Lifetime Giving: $${totalAmount.toLocaleString()} (${gifts.length} gifts)`,
    "",
    "Recent Gifts:",
    ...sortedGifts.slice(0, 10).map((g) => {
      const amount = typeof g.amount === "object" ? g.amount.toNumber() : g.amount;
      return `- [ID: ${g.id}] $${amount.toLocaleString()} on ${g.giftDate.toISOString().split("T")[0]} to ${g.fundName || "General Fund"}`;
    }),
  ];

  return lines.join("\n");
}

function formatContactsData(contacts: BriefGenerationOptions["contacts"]): string {
  if (contacts.length === 0) {
    return "No contact history on record.";
  }

  const sortedContacts = [...contacts].sort(
    (a, b) => b.contactDate.getTime() - a.contactDate.getTime()
  );

  const lines = [
    `Total Contacts: ${contacts.length}`,
    "",
    "Recent Contacts:",
    ...sortedContacts.slice(0, 10).map((c) => {
      const parts = [
        `- [ID: ${c.id}] ${c.contactType} on ${c.contactDate.toISOString().split("T")[0]}`,
      ];
      if (c.subject) parts[0] += ` - ${c.subject}`;
      if (c.notes) parts.push(`  Notes: ${c.notes.slice(0, 200)}${c.notes.length > 200 ? "..." : ""}`);
      return parts.join("\n");
    }),
  ];

  return lines.join("\n");
}

function formatPredictionsData(predictions: BriefGenerationOptions["predictions"]): string {
  if (!predictions || predictions.length === 0) {
    return "No predictions available.";
  }

  const lines = predictions.map((p) => {
    const score = typeof p.score === "object" ? p.score.toNumber() : p.score;
    return `- [ID: ${p.id}] ${p.predictionType}: ${(score * 100).toFixed(1)}%`;
  });

  return lines.join("\n");
}

function getBriefSystemPrompt(): string {
  return `You are an expert advancement officer assistant generating donor briefs for university gift officers.

CRITICAL RULES:
1. ONLY use facts from the provided data. NEVER invent or assume information.
2. Every factual statement MUST be based on the source data. Include citations using the exact IDs provided.
3. If information is missing, explicitly say "No data available" - NEVER guess or make up details.
4. For recommended ask amounts, base them ONLY on actual giving patterns in the data.
5. Be professional and concise.

OUTPUT FORMAT:
Respond with a valid JSON object matching this exact structure (no markdown code blocks):
{
  "summary": {
    "text": "2-3 sentence executive summary",
    "citations": [{"text": "cited fact", "source": "profile|gift|contact|prediction", "sourceId": "exact-id"}]
  },
  "givingHistory": {
    "text": "Summary of giving patterns",
    "totalLifetime": <number>,
    "citations": [...]
  },
  "relationshipHighlights": {
    "text": "Key relationship points",
    "citations": [...]
  },
  "conversationStarters": {
    "items": ["starter 1", "starter 2", "starter 3"],
    "citations": [...]
  },
  "recommendedAsk": {
    "amount": <number or null>,
    "purpose": "suggested designation",
    "rationale": "why this ask",
    "citations": [...]
  }
}`;
}

function getBriefUserPrompt(data: {
  constituentData: string;
  giftsData: string;
  contactsData: string;
  predictionsData: string;
  constituentId: string;
  giftIds: string[];
  contactIds: string[];
  predictionIds: string[];
}): string {
  return `Generate a donor brief using ONLY the following data. Include citations with the exact IDs shown.

CONSTITUENT PROFILE (ID: ${data.constituentId}):
${data.constituentData}

GIVING HISTORY:
${data.giftsData}

CONTACT HISTORY:
${data.contactsData}

PREDICTIONS:
${data.predictionsData}

Remember:
- Use ONLY facts from the data above
- Include citations with the exact IDs shown (e.g., ${data.constituentId} for profile, ${data.giftIds[0] || "gift-id"} for gifts)
- If something is not in the data, say "No data available"
- Calculate totalLifetime exactly from the gift amounts shown

Generate the JSON brief now:`;
}
