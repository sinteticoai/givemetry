// T160: Donor brief generation prompt templates

export interface DonorBriefPromptData {
  constituentId: string;
  constituentData: string;
  giftsData: string;
  contactsData: string;
  predictionsData: string;
  giftIds: string[];
  contactIds: string[];
  predictionIds: string[];
}

export const DONOR_BRIEF_SYSTEM_PROMPT = `You are an expert advancement officer assistant generating donor briefs for university gift officers.

CRITICAL RULES:
1. ONLY use facts from the provided data. NEVER invent or assume information.
2. Every factual statement MUST be based on the source data. Include citations using the exact IDs provided.
3. If information is missing, explicitly say "No data available" - NEVER guess or make up details.
4. For recommended ask amounts, base them ONLY on actual giving patterns in the data.
5. Be professional and concise.
6. Focus on actionable insights that help the gift officer prepare for donor meetings.

CITATION FORMAT:
- Use exact IDs from the data (e.g., "gift-123", "contact-456")
- Source types: "profile" (constituent data), "gift" (giving records), "contact" (interaction records), "prediction" (AI scores)

OUTPUT REQUIREMENTS:
- totalLifetime must be the EXACT sum of all gift amounts
- conversationStarters should be specific and actionable
- recommendedAsk should be based on giving history and patterns (or null if insufficient data)`;

export function createDonorBriefUserPrompt(data: DonorBriefPromptData): string {
  const exampleGiftId = data.giftIds[0] || "gift-id";
  const exampleContactId = data.contactIds[0] || "contact-id";

  return `Generate a comprehensive donor brief using ONLY the following data. Include citations with the exact IDs shown.

=== CONSTITUENT PROFILE ===
ID: ${data.constituentId}
${data.constituentData}

=== GIVING HISTORY ===
${data.giftsData}

=== CONTACT HISTORY ===
${data.contactsData}

=== PREDICTIONS & SCORES ===
${data.predictionsData}

=== CITATION EXAMPLES ===
- For profile facts, use sourceId: "${data.constituentId}"
- For gift facts, use sourceId: "${exampleGiftId}" (use actual gift IDs from data)
- For contact facts, use sourceId: "${exampleContactId}" (use actual contact IDs from data)

=== REQUIRED OUTPUT FORMAT ===
Respond with a valid JSON object (no markdown code blocks):

{
  "summary": {
    "text": "2-3 sentence executive summary highlighting key points for an upcoming meeting",
    "citations": [{"text": "specific cited fact", "source": "profile|gift|contact|prediction", "sourceId": "exact-id"}]
  },
  "givingHistory": {
    "text": "Analysis of giving patterns, trends, and preferences",
    "totalLifetime": <exact sum of all gifts as number>,
    "citations": [{"text": "specific fact", "source": "gift", "sourceId": "gift-id"}]
  },
  "relationshipHighlights": {
    "text": "Key relationship touchpoints and engagement history",
    "citations": [{"text": "specific interaction", "source": "contact", "sourceId": "contact-id"}]
  },
  "conversationStarters": {
    "items": ["specific topic 1", "specific topic 2", "specific topic 3"],
    "citations": []
  },
  "recommendedAsk": {
    "amount": <suggested amount as number, or null if insufficient history>,
    "purpose": "suggested fund or purpose based on past giving",
    "rationale": "why this ask makes sense given the data",
    "citations": []
  }
}

Generate the brief now:`;
}

export function createQuickBriefPrompt(data: {
  name: string;
  totalGiving: number;
  lastGiftDate: string | null;
  lastContactDate: string | null;
  topFunds: string[];
}): string {
  return `Generate a one-paragraph quick brief for:
- Name: ${data.name}
- Total Lifetime Giving: $${data.totalGiving.toLocaleString()}
- Last Gift: ${data.lastGiftDate || "No gifts on record"}
- Last Contact: ${data.lastContactDate || "No contacts on record"}
- Top Funds: ${data.topFunds.length > 0 ? data.topFunds.join(", ") : "None"}

Provide a concise summary (3-4 sentences) suitable for a quick reference before a meeting.`;
}

export function createBriefRefreshPrompt(data: {
  existingBrief: string;
  newData: string;
}): string {
  return `Update the following donor brief with new information:

=== EXISTING BRIEF ===
${data.existingBrief}

=== NEW DATA ===
${data.newData}

Update only the sections affected by the new data. Maintain the same JSON structure and citation format.`;
}
