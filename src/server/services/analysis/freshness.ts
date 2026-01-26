// T104: Freshness scoring service
// Calculates data freshness scores based on recency of gifts, contacts, and uploads

export interface FreshnessInput {
  lastGiftDate: Date | null;
  lastContactDate: Date | null;
  lastUploadDate: Date | null;
}

export interface FreshnessResult {
  overall: number;
  giftFreshness: number;
  contactFreshness: number;
  dataFreshness: number;
}

export interface FreshnessIssue {
  type: "stale_gifts" | "stale_contacts" | "outdated_upload" | "no_gift_history" | "no_contact_history";
  severity: "high" | "medium" | "low";
  message: string;
  daysSince?: number;
}

export interface DataAgeAnalysis {
  daysSinceLastGift: number | null;
  daysSinceLastContact: number | null;
  daysSinceLastUpload: number | null;
  issues: FreshnessIssue[];
}

// Freshness thresholds (in days)
const GIFT_THRESHOLDS = {
  fresh: 30, // 1 month
  good: 90, // 3 months
  ok: 365, // 1 year
  stale: 730, // 2 years
};

const CONTACT_THRESHOLDS = {
  fresh: 14, // 2 weeks
  good: 30, // 1 month
  ok: 90, // 3 months
  stale: 180, // 6 months
};

const UPLOAD_THRESHOLDS = {
  fresh: 7, // 1 week
  good: 30, // 1 month
  ok: 90, // 3 months
  stale: 180, // 6 months
};

// Weights for overall freshness score
const FRESHNESS_WEIGHTS = {
  gift: 0.45,
  contact: 0.30,
  upload: 0.25,
};

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Calculate freshness score based on days since and thresholds
 * Returns score between 0 and 1
 */
function calculateDecayScore(
  daysSince: number,
  thresholds: { fresh: number; good: number; ok: number; stale: number }
): number {
  if (daysSince <= thresholds.fresh) return 1.0;
  if (daysSince <= thresholds.good) {
    // Linear decay from 1.0 to 0.8
    const range = thresholds.good - thresholds.fresh;
    const elapsed = daysSince - thresholds.fresh;
    return 1.0 - (0.2 * elapsed) / range;
  }
  if (daysSince <= thresholds.ok) {
    // Linear decay from 0.8 to 0.5
    const range = thresholds.ok - thresholds.good;
    const elapsed = daysSince - thresholds.good;
    return 0.8 - (0.3 * elapsed) / range;
  }
  if (daysSince <= thresholds.stale) {
    // Linear decay from 0.5 to 0.2
    const range = thresholds.stale - thresholds.ok;
    const elapsed = daysSince - thresholds.ok;
    return 0.5 - (0.3 * elapsed) / range;
  }
  // Exponential decay below 0.2 for very old data
  const extraDays = daysSince - thresholds.stale;
  return Math.max(0.05, 0.2 * Math.exp(-extraDays / 365));
}

/**
 * Calculate gift freshness score
 */
export function calculateGiftFreshness(lastGiftDate: Date | null): number {
  if (!lastGiftDate) return 0;

  const now = new Date();
  const daysSince = daysBetween(lastGiftDate, now);

  return calculateDecayScore(daysSince, GIFT_THRESHOLDS);
}

/**
 * Calculate contact freshness score
 */
export function calculateContactFreshness(lastContactDate: Date | null): number {
  if (!lastContactDate) return 0;

  const now = new Date();
  const daysSince = daysBetween(lastContactDate, now);

  return calculateDecayScore(daysSince, CONTACT_THRESHOLDS);
}

/**
 * Calculate data freshness score (based on last upload)
 */
export function calculateDataFreshness(lastUploadDate: Date | null): number {
  if (!lastUploadDate) return 0;

  const now = new Date();
  const daysSince = daysBetween(lastUploadDate, now);

  return calculateDecayScore(daysSince, UPLOAD_THRESHOLDS);
}

/**
 * Calculate overall freshness score from all components
 */
export function calculateFreshnessScore(input: FreshnessInput): FreshnessResult {
  const giftFreshness = calculateGiftFreshness(input.lastGiftDate);
  const contactFreshness = calculateContactFreshness(input.lastContactDate);
  const dataFreshness = calculateDataFreshness(input.lastUploadDate);

  // Calculate weighted overall score
  // If a component is missing (null date), redistribute its weight
  let totalWeight = 0;
  let weightedSum = 0;

  if (input.lastGiftDate) {
    weightedSum += giftFreshness * FRESHNESS_WEIGHTS.gift;
    totalWeight += FRESHNESS_WEIGHTS.gift;
  }

  if (input.lastContactDate) {
    weightedSum += contactFreshness * FRESHNESS_WEIGHTS.contact;
    totalWeight += FRESHNESS_WEIGHTS.contact;
  }

  if (input.lastUploadDate) {
    weightedSum += dataFreshness * FRESHNESS_WEIGHTS.upload;
    totalWeight += FRESHNESS_WEIGHTS.upload;
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    overall,
    giftFreshness,
    contactFreshness,
    dataFreshness,
  };
}

/**
 * Analyze data age and identify issues
 */
export function analyzeDataAge(input: FreshnessInput): DataAgeAnalysis {
  const now = new Date();
  const issues: FreshnessIssue[] = [];

  const daysSinceLastGift = input.lastGiftDate
    ? daysBetween(input.lastGiftDate, now)
    : null;

  const daysSinceLastContact = input.lastContactDate
    ? daysBetween(input.lastContactDate, now)
    : null;

  const daysSinceLastUpload = input.lastUploadDate
    ? daysBetween(input.lastUploadDate, now)
    : null;

  // Check for missing gift history
  if (daysSinceLastGift === null) {
    issues.push({
      type: "no_gift_history",
      severity: "medium",
      message: "No gift history available",
    });
  } else if (daysSinceLastGift > GIFT_THRESHOLDS.stale) {
    issues.push({
      type: "stale_gifts",
      severity: "high",
      message: `Last gift was ${daysSinceLastGift} days ago (over 2 years)`,
      daysSince: daysSinceLastGift,
    });
  } else if (daysSinceLastGift > GIFT_THRESHOLDS.ok) {
    issues.push({
      type: "stale_gifts",
      severity: "medium",
      message: `Last gift was ${daysSinceLastGift} days ago (over 1 year)`,
      daysSince: daysSinceLastGift,
    });
  }

  // Check for missing contact history
  if (daysSinceLastContact === null) {
    issues.push({
      type: "no_contact_history",
      severity: "low",
      message: "No contact history available",
    });
  } else if (daysSinceLastContact > CONTACT_THRESHOLDS.stale) {
    issues.push({
      type: "stale_contacts",
      severity: "medium",
      message: `Last contact was ${daysSinceLastContact} days ago (over 6 months)`,
      daysSince: daysSinceLastContact,
    });
  }

  // Check for outdated upload
  if (daysSinceLastUpload !== null && daysSinceLastUpload > UPLOAD_THRESHOLDS.stale) {
    issues.push({
      type: "outdated_upload",
      severity: "medium",
      message: `Data was last uploaded ${daysSinceLastUpload} days ago (over 6 months)`,
      daysSince: daysSinceLastUpload,
    });
  }

  return {
    daysSinceLastGift,
    daysSinceLastContact,
    daysSinceLastUpload,
    issues,
  };
}

/**
 * Calculate aggregate freshness for multiple records
 */
export function calculateBatchFreshness(
  records: Array<{ lastGiftDate: Date | null; lastContactDate: Date | null }>
): {
  averageGiftFreshness: number;
  averageContactFreshness: number;
  percentWithRecentGifts: number;
  percentWithRecentContacts: number;
} {
  if (records.length === 0) {
    return {
      averageGiftFreshness: 0,
      averageContactFreshness: 0,
      percentWithRecentGifts: 0,
      percentWithRecentContacts: 0,
    };
  }

  let totalGiftFreshness = 0;
  let totalContactFreshness = 0;
  let recentGiftCount = 0;
  let recentContactCount = 0;

  const now = new Date();

  for (const record of records) {
    totalGiftFreshness += calculateGiftFreshness(record.lastGiftDate);
    totalContactFreshness += calculateContactFreshness(record.lastContactDate);

    if (record.lastGiftDate) {
      const daysSince = daysBetween(record.lastGiftDate, now);
      if (daysSince <= GIFT_THRESHOLDS.good) {
        recentGiftCount++;
      }
    }

    if (record.lastContactDate) {
      const daysSince = daysBetween(record.lastContactDate, now);
      if (daysSince <= CONTACT_THRESHOLDS.good) {
        recentContactCount++;
      }
    }
  }

  const n = records.length;

  return {
    averageGiftFreshness: totalGiftFreshness / n,
    averageContactFreshness: totalContactFreshness / n,
    percentWithRecentGifts: recentGiftCount / n,
    percentWithRecentContacts: recentContactCount / n,
  };
}
