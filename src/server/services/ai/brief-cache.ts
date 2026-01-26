// T163: Brief caching for AI fallback
import type { BriefContent } from "./citation-validator";

export interface CachedBrief {
  constituentId: string;
  organizationId: string;
  content: BriefContent;
  generatedAt: Date;
  expiresAt: Date;
  dataVersion: string; // Hash of constituent data to detect staleness
}

export interface BriefCacheOptions {
  ttlMinutes?: number; // Default 60 minutes
  maxEntries?: number; // Default 100
}

// In-memory cache for development and fallback
// In production, this could be backed by Redis or database
class BriefCacheStore {
  private cache = new Map<string, CachedBrief>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(options: BriefCacheOptions = {}) {
    this.maxEntries = options.maxEntries || 100;
    this.ttlMs = (options.ttlMinutes || 60) * 60 * 1000;
  }

  private getCacheKey(organizationId: string, constituentId: string): string {
    return `${organizationId}:${constituentId}`;
  }

  get(organizationId: string, constituentId: string): CachedBrief | null {
    const key = this.getCacheKey(organizationId, constituentId);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(brief: Omit<CachedBrief, "expiresAt">): void {
    const key = this.getCacheKey(brief.organizationId, brief.constituentId);

    // Enforce max entries (LRU-style eviction)
    if (this.cache.size >= this.maxEntries) {
      const firstKey = Array.from(this.cache.keys())[0];
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      ...brief,
      expiresAt: new Date(Date.now() + this.ttlMs),
    });
  }

  invalidate(organizationId: string, constituentId: string): boolean {
    const key = this.getCacheKey(organizationId, constituentId);
    return this.cache.delete(key);
  }

  invalidateOrganization(organizationId: string): number {
    let deleted = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(`${organizationId}:`)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Check if cached data is stale based on data version hash
  isStale(
    organizationId: string,
    constituentId: string,
    currentDataVersion: string
  ): boolean {
    const cached = this.get(organizationId, constituentId);
    if (!cached) return true;
    return cached.dataVersion !== currentDataVersion;
  }
}

// Singleton instance
let cacheInstance: BriefCacheStore | null = null;

export function getBriefCache(options?: BriefCacheOptions): BriefCacheStore {
  if (!cacheInstance) {
    cacheInstance = new BriefCacheStore(options);
  }
  return cacheInstance;
}

export function resetBriefCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance = null;
  }
}

// Utility to generate data version hash
export function generateDataVersion(data: {
  constituent: { id: string; updatedAt?: Date };
  gifts: Array<{ id: string; updatedAt?: Date }>;
  contacts: Array<{ id: string; updatedAt?: Date }>;
}): string {
  const parts = [
    data.constituent.id,
    data.constituent.updatedAt?.toISOString() || "",
    data.gifts.map((g) => `${g.id}:${g.updatedAt?.toISOString() || ""}`).join(","),
    data.contacts.map((c) => `${c.id}:${c.updatedAt?.toISOString() || ""}`).join(","),
  ];

  // Simple hash - in production, use a proper hash function
  return btoa(parts.join("|")).slice(0, 32);
}

// Fallback brief content when AI is unavailable
export function getFallbackBrief(data: {
  constituent: {
    firstName?: string | null;
    lastName?: string | null;
    constituentType?: string | null;
  };
  totalGifts: number;
  lifetimeGiving: number;
  contactCount: number;
  lastGiftDate?: Date | null;
}): BriefContent {
  const name = [data.constituent.firstName, data.constituent.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return {
    summary: {
      text: `${name} is a ${data.constituent.constituentType || "constituent"} with ${data.totalGifts} gifts totaling $${data.lifetimeGiving.toLocaleString()}. This brief was generated using a fallback template due to AI service unavailability.`,
      citations: [],
    },
    givingHistory: {
      text: data.totalGifts > 0
        ? `Has made ${data.totalGifts} gifts totaling $${data.lifetimeGiving.toLocaleString()}. ${data.lastGiftDate ? `Last gift was on ${data.lastGiftDate.toLocaleDateString()}.` : ""}`
        : "No giving history on record.",
      totalLifetime: data.lifetimeGiving,
      citations: [],
    },
    relationshipHighlights: {
      text: data.contactCount > 0
        ? `${data.contactCount} contact records on file.`
        : "No contact history recorded.",
      citations: [],
    },
    conversationStarters: {
      items: [
        "Discuss recent giving impact",
        "Thank for continued support",
        "Share updates on organizational priorities",
      ],
      citations: [],
    },
    recommendedAsk: {
      amount: null,
      purpose: "To be determined based on conversation",
      rationale: "AI-generated recommendation unavailable - please review giving history manually.",
      citations: [],
    },
  };
}
