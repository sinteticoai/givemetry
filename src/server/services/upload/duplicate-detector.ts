// T096: Duplicate detection with fuzzy matching
import type { PrismaClient } from "@prisma/client";
import { distance as levenshteinDistance } from "fastest-levenshtein";

export interface DuplicateCandidate {
  id: string;
  externalId: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  score: number;
  matchType: "exact" | "fuzzy";
  matchedFields: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  candidates: DuplicateCandidate[];
  bestMatch: DuplicateCandidate | null;
}

export interface DuplicateCheckOptions {
  minScore?: number; // Minimum score to consider a duplicate (0-1)
  maxCandidates?: number;
  checkFields?: ("externalId" | "email" | "name")[];
}

const DEFAULT_OPTIONS: Required<DuplicateCheckOptions> = {
  minScore: 0.7,
  maxCandidates: 5,
  checkFields: ["externalId", "email", "name"],
};

/**
 * Check for duplicate constituents
 */
export async function checkForDuplicates(
  prisma: PrismaClient,
  organizationId: string,
  record: {
    externalId?: string;
    firstName?: string | null;
    lastName: string;
    email?: string | null;
  },
  options: DuplicateCheckOptions = {}
): Promise<DuplicateCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const candidates: DuplicateCandidate[] = [];

  // Check exact external ID match first
  if (record.externalId && opts.checkFields.includes("externalId")) {
    const exactMatch = await prisma.constituent.findFirst({
      where: {
        organizationId,
        externalId: record.externalId,
      },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (exactMatch) {
      return {
        isDuplicate: true,
        candidates: [
          {
            id: exactMatch.id,
            externalId: exactMatch.externalId,
            firstName: exactMatch.firstName,
            lastName: exactMatch.lastName,
            email: exactMatch.email,
            score: 1.0,
            matchType: "exact",
            matchedFields: ["externalId"],
          },
        ],
        bestMatch: {
          id: exactMatch.id,
          externalId: exactMatch.externalId,
          firstName: exactMatch.firstName,
          lastName: exactMatch.lastName,
          email: exactMatch.email,
          score: 1.0,
          matchType: "exact",
          matchedFields: ["externalId"],
        },
      };
    }
  }

  // Check exact email match
  if (record.email && opts.checkFields.includes("email")) {
    const emailMatches = await prisma.constituent.findMany({
      where: {
        organizationId,
        email: record.email.toLowerCase(),
      },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: opts.maxCandidates,
    });

    for (const match of emailMatches) {
      candidates.push({
        id: match.id,
        externalId: match.externalId,
        firstName: match.firstName,
        lastName: match.lastName,
        email: match.email,
        score: 0.95, // High score for exact email match
        matchType: "exact",
        matchedFields: ["email"],
      });
    }
  }

  // Check fuzzy name match
  if (opts.checkFields.includes("name")) {
    // Search for similar last names
    const nameMatches = await prisma.constituent.findMany({
      where: {
        organizationId,
        lastName: {
          contains: record.lastName.slice(0, 3), // Search by first 3 chars
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 100, // Limit for performance
    });

    for (const match of nameMatches) {
      // Skip if already a candidate
      if (candidates.some((c) => c.id === match.id)) {
        continue;
      }

      const score = calculateNameSimilarity(
        record.firstName || "",
        record.lastName,
        match.firstName || "",
        match.lastName
      );

      if (score >= opts.minScore) {
        candidates.push({
          id: match.id,
          externalId: match.externalId,
          firstName: match.firstName,
          lastName: match.lastName,
          email: match.email,
          score,
          matchType: "fuzzy",
          matchedFields: ["name"],
        });
      }
    }
  }

  // Sort by score and limit
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, opts.maxCandidates);

  const first = topCandidates[0];
  return {
    isDuplicate: topCandidates.length > 0 && first !== undefined && first.score >= opts.minScore,
    candidates: topCandidates,
    bestMatch: first || null,
  };
}

/**
 * Calculate similarity score between two names
 */
export function calculateNameSimilarity(
  firstName1: string,
  lastName1: string,
  firstName2: string,
  lastName2: string
): number {
  const fullName1 = `${firstName1} ${lastName1}`.toLowerCase().trim();
  const fullName2 = `${firstName2} ${lastName2}`.toLowerCase().trim();

  // Exact match
  if (fullName1 === fullName2) {
    return 1.0;
  }

  // Calculate last name similarity (weighted more heavily)
  const lastNameSim = stringSimilarity(
    (lastName1 ?? "").toLowerCase(),
    (lastName2 ?? "").toLowerCase()
  );

  // Calculate first name similarity
  const firstNameSim = stringSimilarity(
    firstName1.toLowerCase(),
    firstName2.toLowerCase()
  );

  // Check for nickname matches
  const nicknameBonus = hasNicknameMatch(firstName1, firstName2) ? 0.2 : 0;

  // Weighted average: last name is more important
  const baseScore = lastNameSim * 0.7 + firstNameSim * 0.3;

  return Math.min(1.0, baseScore + nicknameBonus);
}

/**
 * Calculate string similarity using Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Check for common nickname matches
 */
const NICKNAME_MAP: Record<string, string[]> = {
  robert: ["bob", "rob", "bobby", "robbie"],
  william: ["will", "bill", "billy", "willy", "liam"],
  richard: ["rick", "rich", "dick", "ricky"],
  james: ["jim", "jimmy", "jamie"],
  john: ["jack", "johnny", "jon"],
  michael: ["mike", "mikey", "mick"],
  david: ["dave", "davey"],
  thomas: ["tom", "tommy"],
  charles: ["charlie", "chuck"],
  elizabeth: ["liz", "beth", "lizzie", "betty", "eliza"],
  margaret: ["meg", "maggie", "peggy", "marge"],
  jennifer: ["jen", "jenny"],
  katherine: ["kate", "kathy", "katie", "cat"],
  patricia: ["pat", "patty", "trish"],
  joseph: ["joe", "joey"],
  christopher: ["chris", "kit"],
  daniel: ["dan", "danny"],
  matthew: ["matt", "matty"],
  anthony: ["tony"],
  steven: ["steve", "stevie"],
  edward: ["ed", "eddie", "ted", "teddy"],
  alexander: ["alex", "al", "sandy"],
  benjamin: ["ben", "benny"],
  nicholas: ["nick", "nicky"],
  samuel: ["sam", "sammy"],
  timothy: ["tim", "timmy"],
  jonathan: ["jon", "johnny"],
  andrew: ["andy", "drew"],
  joshua: ["josh"],
  rebecca: ["becky", "becca"],
  victoria: ["vicky", "tori"],
  samantha: ["sam", "sammy"],
  alexandra: ["alex", "lexi", "sandy"],
  stephanie: ["steph", "stephie"],
  jessica: ["jess", "jessie"],
  deborah: ["deb", "debbie"],
  dorothy: ["dot", "dotty", "dottie"],
  barbara: ["barb", "barbie"],
  susan: ["sue", "susie"],
};

function hasNicknameMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Check direct nickname relationship
  const entries = Object.entries(NICKNAME_MAP);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const [formal, nicknames] = entry;
    if (
      (n1 === formal && nicknames.includes(n2)) ||
      (n2 === formal && nicknames.includes(n1)) ||
      (nicknames.includes(n1) && nicknames.includes(n2))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Batch check for duplicates (more efficient for large imports)
 */
export async function batchCheckForDuplicates(
  prisma: PrismaClient,
  organizationId: string,
  records: Array<{
    externalId?: string;
    firstName?: string | null;
    lastName: string;
    email?: string | null;
  }>,
  options: DuplicateCheckOptions = {}
): Promise<Map<number, DuplicateCheckResult>> {
  const results = new Map<number, DuplicateCheckResult>();

  // Collect all external IDs and emails for batch lookup
  const externalIds = records
    .map((r) => r.externalId)
    .filter((id): id is string => !!id);
  const emails = records
    .map((r) => r.email?.toLowerCase())
    .filter((email): email is string => !!email);

  // Batch lookup existing records
  const existingByExternalId = new Map<
    string,
    { id: string; externalId: string; firstName: string | null; lastName: string; email: string | null }
  >();
  const existingByEmail = new Map<
    string,
    { id: string; externalId: string; firstName: string | null; lastName: string; email: string | null }[]
  >();

  if (externalIds.length > 0) {
    const matches = await prisma.constituent.findMany({
      where: {
        organizationId,
        externalId: { in: externalIds },
      },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    for (const match of matches) {
      existingByExternalId.set(match.externalId, match);
    }
  }

  if (emails.length > 0) {
    const matches = await prisma.constituent.findMany({
      where: {
        organizationId,
        email: { in: emails },
      },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    for (const match of matches) {
      if (match.email) {
        const key = match.email.toLowerCase();
        if (!existingByEmail.has(key)) {
          existingByEmail.set(key, []);
        }
        existingByEmail.get(key)!.push(match);
      }
    }
  }

  // Check each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record) continue;

    const candidates: DuplicateCandidate[] = [];

    // Check external ID match
    if (record.externalId) {
      const match = existingByExternalId.get(record.externalId);
      if (match) {
        results.set(i, {
          isDuplicate: true,
          candidates: [
            {
              ...match,
              score: 1.0,
              matchType: "exact",
              matchedFields: ["externalId"],
            },
          ],
          bestMatch: {
            ...match,
            score: 1.0,
            matchType: "exact",
            matchedFields: ["externalId"],
          },
        });
        continue;
      }
    }

    // Check email match
    if (record.email) {
      const matches = existingByEmail.get(record.email.toLowerCase()) || [];
      for (const match of matches) {
        candidates.push({
          ...match,
          score: 0.95,
          matchType: "exact",
          matchedFields: ["email"],
        });
      }
    }

    // Sort and set result
    candidates.sort((a, b) => b.score - a.score);
    const minScore = options.minScore ?? DEFAULT_OPTIONS.minScore;

    results.set(i, {
      isDuplicate: candidates.length > 0 && candidates[0] !== undefined && candidates[0].score >= minScore,
      candidates: candidates.slice(0, options.maxCandidates ?? DEFAULT_OPTIONS.maxCandidates),
      bestMatch: candidates[0] || null,
    });
  }

  return results;
}
