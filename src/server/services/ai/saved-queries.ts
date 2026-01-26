// T182: Saved queries service
import type { PrismaClient } from "@prisma/client";

export interface SavedQuery {
  id: string;
  name: string;
  queryText: string;
  interpretedQuery: unknown;
  createdAt: Date;
}

export interface SaveQueryInput {
  organizationId: string;
  userId: string;
  queryText: string;
  name: string;
  interpretedQuery?: unknown;
  resultCount?: number;
  resultIds?: string[];
}

export interface GetSavedQueriesInput {
  organizationId: string;
  userId?: string; // If not provided, returns all for org
  limit?: number;
}

/**
 * Save a natural language query with a user-defined name
 */
export async function saveQuery(
  prisma: PrismaClient,
  input: SaveQueryInput
): Promise<SavedQuery> {
  const query = await prisma.naturalLanguageQuery.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      queryText: input.queryText,
      savedName: input.name,
      interpretedQuery: input.interpretedQuery || {},
      resultCount: input.resultCount || 0,
      resultIds: input.resultIds || [],
    },
  });

  return {
    id: query.id,
    name: query.savedName || "",
    queryText: query.queryText,
    interpretedQuery: query.interpretedQuery,
    createdAt: query.createdAt,
  };
}

/**
 * Update an existing query to add a saved name
 */
export async function updateQueryWithName(
  prisma: PrismaClient,
  queryId: string,
  name: string
): Promise<SavedQuery> {
  const query = await prisma.naturalLanguageQuery.update({
    where: { id: queryId },
    data: { savedName: name },
  });

  return {
    id: query.id,
    name: query.savedName || "",
    queryText: query.queryText,
    interpretedQuery: query.interpretedQuery,
    createdAt: query.createdAt,
  };
}

/**
 * Get all saved queries for an organization
 */
export async function getSavedQueries(
  prisma: PrismaClient,
  input: GetSavedQueriesInput
): Promise<SavedQuery[]> {
  const queries = await prisma.naturalLanguageQuery.findMany({
    where: {
      organizationId: input.organizationId,
      savedName: { not: null },
      ...(input.userId && { userId: input.userId }),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit || 50,
  });

  return queries.map((q) => ({
    id: q.id,
    name: q.savedName || "",
    queryText: q.queryText,
    interpretedQuery: q.interpretedQuery,
    createdAt: q.createdAt,
  }));
}

/**
 * Delete a saved query
 */
export async function deleteSavedQuery(
  prisma: PrismaClient,
  queryId: string,
  organizationId: string
): Promise<boolean> {
  try {
    await prisma.naturalLanguageQuery.delete({
      where: {
        id: queryId,
        organizationId, // Ensure organization isolation
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a specific saved query by ID
 */
export async function getSavedQueryById(
  prisma: PrismaClient,
  queryId: string,
  organizationId: string
): Promise<SavedQuery | null> {
  const query = await prisma.naturalLanguageQuery.findFirst({
    where: {
      id: queryId,
      organizationId,
      savedName: { not: null },
    },
  });

  if (!query) return null;

  return {
    id: query.id,
    name: query.savedName || "",
    queryText: query.queryText,
    interpretedQuery: query.interpretedQuery,
    createdAt: query.createdAt,
  };
}

/**
 * Record feedback on a query
 */
export async function recordQueryFeedback(
  prisma: PrismaClient,
  queryId: string,
  wasHelpful: boolean,
  feedback?: string
): Promise<void> {
  await prisma.naturalLanguageQuery.update({
    where: { id: queryId },
    data: {
      wasHelpful,
      feedback,
    },
  });
}

/**
 * Get popular queries based on usage
 */
export async function getPopularQueries(
  prisma: PrismaClient,
  organizationId: string,
  limit: number = 10
): Promise<Array<{ queryText: string; count: number }>> {
  // Get queries that were marked as helpful
  const queries = await prisma.naturalLanguageQuery.groupBy({
    by: ["queryText"],
    where: {
      organizationId,
      wasHelpful: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: limit,
  });

  return queries.map((q) => ({
    queryText: q.queryText,
    count: q._count.id,
  }));
}
