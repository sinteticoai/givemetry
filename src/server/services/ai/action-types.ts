// T196: Action type definitions and templates for next-best-action recommendations

export interface ActionType {
  id: string;
  label: string;
  description: string;
  category: "cultivation" | "stewardship" | "solicitation" | "re-engagement";
  defaultUrgency: "high" | "medium" | "low";
  suggestedNextSteps: string[];
  typicalTimeframe: string;
}

/**
 * Standard action types for donor cultivation and stewardship
 */
export const ACTION_TYPES: Record<string, ActionType> = {
  schedule_meeting: {
    id: "schedule_meeting",
    label: "Schedule Personal Meeting",
    description: "Arrange an in-person or virtual meeting to discuss giving and engagement opportunities",
    category: "cultivation",
    defaultUrgency: "medium",
    suggestedNextSteps: [
      "Check calendar availability for next 2 weeks",
      "Prepare talking points based on donor interests",
      "Review recent giving history before meeting",
      "Confirm meeting logistics 24 hours in advance",
    ],
    typicalTimeframe: "Within 2 weeks",
  },

  stewardship_call: {
    id: "stewardship_call",
    label: "Stewardship Phone Call",
    description: "Make a thank-you call to acknowledge recent support and maintain relationship",
    category: "stewardship",
    defaultUrgency: "medium",
    suggestedNextSteps: [
      "Review recent gift details and fund designation",
      "Prepare impact story related to their giving area",
      "Call during business hours or at preferred contact time",
      "Document conversation outcome and any follow-up needed",
    ],
    typicalTimeframe: "Within 1 week",
  },

  thank_you_visit: {
    id: "thank_you_visit",
    label: "Thank You Visit",
    description: "Schedule an in-person thank you visit to express gratitude for significant support",
    category: "stewardship",
    defaultUrgency: "high",
    suggestedNextSteps: [
      "Coordinate with leadership for joint visit if appropriate",
      "Bring personalized thank you materials",
      "Prepare specific impact examples from their giving",
      "Consider small meaningful gift or recognition",
    ],
    typicalTimeframe: "Within 2-4 weeks",
  },

  re_engagement_call: {
    id: "re_engagement_call",
    label: "Re-engagement Outreach",
    description: "Reach out to reconnect with a donor who has been less active recently",
    category: "re-engagement",
    defaultUrgency: "high",
    suggestedNextSteps: [
      "Review giving history to identify preferred areas",
      "Research any life changes or news about the donor",
      "Prepare non-ask cultivation talking points",
      "Have updates on programs they previously supported",
    ],
    typicalTimeframe: "Within 1 week",
  },

  send_impact_report: {
    id: "send_impact_report",
    label: "Send Impact Report",
    description: "Send a personalized impact report showing how their contributions have made a difference",
    category: "stewardship",
    defaultUrgency: "low",
    suggestedNextSteps: [
      "Gather data on impact of their specific gifts",
      "Include photos or stories from beneficiaries if available",
      "Personalize the cover letter",
      "Schedule follow-up call after report delivery",
    ],
    typicalTimeframe: "Within 2-3 weeks",
  },

  campaign_solicitation: {
    id: "campaign_solicitation",
    label: "Campaign Solicitation",
    description: "Make a direct ask aligned with an active campaign or initiative",
    category: "solicitation",
    defaultUrgency: "high",
    suggestedNextSteps: [
      "Determine appropriate ask amount based on capacity and history",
      "Prepare case for support tailored to donor interests",
      "Identify specific naming or impact opportunities",
      "Have gift officer approval for ask amount",
    ],
    typicalTimeframe: "Based on campaign timeline",
  },

  event_invitation: {
    id: "event_invitation",
    label: "Invite to Event",
    description: "Extend a personal invitation to an upcoming engagement event",
    category: "cultivation",
    defaultUrgency: "medium",
    suggestedNextSteps: [
      "Select event aligned with donor interests",
      "Make personal call or send handwritten invitation",
      "Offer to introduce them to key speakers or leadership",
      "Follow up on RSVP within 1 week",
    ],
    typicalTimeframe: "Based on event date",
  },

  campus_visit: {
    id: "campus_visit",
    label: "Arrange Campus Visit",
    description: "Invite donor for a personalized campus or facility tour",
    category: "cultivation",
    defaultUrgency: "low",
    suggestedNextSteps: [
      "Coordinate with departments they have supported",
      "Arrange meetings with students or program beneficiaries",
      "Include lunch with leadership if appropriate",
      "Prepare VIP parking and escort arrangements",
    ],
    typicalTimeframe: "Within 4-6 weeks",
  },

  initial_outreach: {
    id: "initial_outreach",
    label: "Initial Introduction",
    description: "Make first contact to introduce yourself as their gift officer",
    category: "cultivation",
    defaultUrgency: "medium",
    suggestedNextSteps: [
      "Research donor background and connection to institution",
      "Prepare brief introduction of your role",
      "Have one or two relevant talking points ready",
      "Propose a brief introductory call or coffee",
    ],
    typicalTimeframe: "Within 1-2 weeks",
  },

  proposal_presentation: {
    id: "proposal_presentation",
    label: "Present Gift Proposal",
    description: "Schedule meeting to present a formal gift proposal or naming opportunity",
    category: "solicitation",
    defaultUrgency: "high",
    suggestedNextSteps: [
      "Finalize proposal document with advancement services",
      "Get proposal approved by appropriate leadership",
      "Prepare supporting materials and visuals",
      "Confirm attendees and any leadership involvement",
    ],
    typicalTimeframe: "As scheduled with donor",
  },

  pledge_reminder: {
    id: "pledge_reminder",
    label: "Pledge Payment Follow-up",
    description: "Follow up on outstanding pledge payments in a cultivation-focused way",
    category: "stewardship",
    defaultUrgency: "medium",
    suggestedNextSteps: [
      "Review pledge schedule and payment history",
      "Prepare impact update on pledge-supported initiative",
      "Offer flexible payment options if needed",
      "Document any changes to payment schedule",
    ],
    typicalTimeframe: "Within 1-2 weeks",
  },

  birthday_outreach: {
    id: "birthday_outreach",
    label: "Birthday or Anniversary Recognition",
    description: "Send birthday, graduation anniversary, or other milestone recognition",
    category: "stewardship",
    defaultUrgency: "low",
    suggestedNextSteps: [
      "Verify date and milestone information",
      "Send personalized card or small gift",
      "Consider handwritten note from leadership",
      "Document outreach in contact report",
    ],
    typicalTimeframe: "On or near the date",
  },
};

/**
 * Get action type by ID
 */
export function getActionType(id: string): ActionType | undefined {
  return ACTION_TYPES[id];
}

/**
 * Get all action types for a category
 */
export function getActionsByCategory(category: ActionType["category"]): ActionType[] {
  return Object.values(ACTION_TYPES).filter((action) => action.category === category);
}

/**
 * Get high-urgency actions
 */
export function getHighUrgencyActions(): ActionType[] {
  return Object.values(ACTION_TYPES).filter((action) => action.defaultUrgency === "high");
}

/**
 * Action selection criteria weights
 */
export const ACTION_SELECTION_WEIGHTS = {
  // How much each factor influences action selection
  lapseRiskWeight: 0.25, // Higher lapse risk -> re-engagement actions
  priorityScoreWeight: 0.20, // Higher priority -> more direct engagement
  capacityWeight: 0.20, // Higher capacity -> more personal attention
  recencyWeight: 0.20, // Recent activity influences stewardship vs cultivation
  timingWeight: 0.15, // Fiscal year/campaign timing
};

/**
 * Action templates for generating contextual recommendations
 */
export const ACTION_TEMPLATES: Record<string, (context: ActionContext) => string> = {
  schedule_meeting: (ctx) =>
    `Schedule a personal meeting with ${ctx.name} to discuss their continued support. ` +
    `With ${ctx.capacityLabel} capacity and ${ctx.engagementLevel} engagement, ` +
    `this is an opportunity to deepen the relationship${ctx.campaign ? ` and discuss the ${ctx.campaign}` : ""}.`,

  stewardship_call: (ctx) =>
    `Make a stewardship call to thank ${ctx.name} for their support. ` +
    `Their ${ctx.giftCount} gift${ctx.giftCount !== 1 ? "s" : ""} totaling ${formatCurrency(ctx.totalGiving)} ` +
    `have made a meaningful impact${ctx.recentGiftInfo ? `, including ${ctx.recentGiftInfo}` : ""}.`,

  thank_you_visit: (ctx) =>
    `Schedule a thank you visit with ${ctx.name} to express gratitude for their generous support. ` +
    `As a ${ctx.capacityLabel} capacity donor with lifetime giving of ${formatCurrency(ctx.totalGiving)}, ` +
    `a personal visit demonstrates our appreciation for their partnership.`,

  re_engagement_call: (ctx) =>
    `Reach out to ${ctx.name} to reconnect and understand their current interests. ` +
    `It has been ${ctx.daysSinceLastContact} days since last contact, ` +
    `and their ${ctx.lapseRiskLevel} lapse risk suggests proactive outreach is warranted.`,

  send_impact_report: (ctx) =>
    `Send ${ctx.name} a personalized impact report highlighting the outcomes of their giving. ` +
    `Their support of ${ctx.preferredFund || "institutional priorities"} has made a real difference ` +
    `for our students and programs.`,

  campaign_solicitation: (ctx) =>
    `Prepare a solicitation for ${ctx.name} aligned with the ${ctx.campaign || "current campaign"}. ` +
    `Based on their ${ctx.capacityLabel} capacity and giving history, ` +
    `a suggested ask of ${formatCurrency(ctx.suggestedAsk || ctx.averageGift * 1.2)} would be appropriate.`,

  initial_outreach: (ctx) =>
    `Introduce yourself as the gift officer for ${ctx.name}. ` +
    `They are a ${ctx.constituentType} with ${ctx.capacityLabel} capacity ` +
    `who has not yet been personally contacted by advancement staff.`,
};

export interface ActionContext {
  name: string;
  constituentType: string;
  capacityLabel: string;
  engagementLevel: "high" | "medium" | "low";
  giftCount: number;
  totalGiving: number;
  averageGift: number;
  recentGiftInfo?: string;
  daysSinceLastContact: number | null;
  lapseRiskLevel: "high" | "medium" | "low";
  campaign?: string;
  preferredFund?: string;
  suggestedAsk?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate action-specific reasoning based on context
 */
export function generateActionReasoning(actionId: string, context: ActionContext): string {
  const template = ACTION_TEMPLATES[actionId];
  if (template) {
    return template(context);
  }

  // Fallback generic reasoning
  const action = ACTION_TYPES[actionId];
  if (action) {
    return `${action.description} for ${context.name}, a ${context.constituentType} with ${context.capacityLabel} capacity.`;
  }

  return `Recommended outreach for ${context.name}.`;
}
