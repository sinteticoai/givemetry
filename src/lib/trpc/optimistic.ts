// T258: Optimistic update utilities for common mutations
import type { QueryClient } from "@tanstack/react-query";

/**
 * Helper to create optimistic updates for list mutations
 * Usage: Use these patterns in your components with useMutation's onMutate/onError/onSettled
 */

type OptimisticUpdateConfig<TData, TVariables> = {
  queryKey: unknown[];
  queryClient: QueryClient;
  updater: (old: TData | undefined, variables: TVariables) => TData | undefined;
};

/**
 * Creates optimistic update handlers for mutations
 * @example
 * ```tsx
 * const mutation = trpc.alert.dismiss.useMutation({
 *   ...createOptimisticHandlers({
 *     queryKey: [['alert', 'list']],
 *     queryClient,
 *     updater: (old, { id }) => old?.filter(a => a.id !== id) ?? [],
 *   }),
 * });
 * ```
 */
export function createOptimisticHandlers<TData, TVariables>({
  queryKey,
  queryClient,
  updater,
}: OptimisticUpdateConfig<TData, TVariables>) {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => updater(old, variables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (
      _err: unknown,
      _variables: TVariables,
      context: { previousData: TData | undefined } | undefined
    ) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Common optimistic update patterns
 */
export const optimisticPatterns = {
  /**
   * Remove an item from a list by ID
   */
  removeFromList: <T extends { id: string }>(
    items: T[] | undefined,
    idToRemove: string
  ): T[] => {
    return items?.filter((item) => item.id !== idToRemove) ?? [];
  },

  /**
   * Update an item in a list
   */
  updateInList: <T extends { id: string }>(
    items: T[] | undefined,
    id: string,
    updates: Partial<T>
  ): T[] => {
    return (
      items?.map((item) => (item.id === id ? { ...item, ...updates } : item)) ??
      []
    );
  },

  /**
   * Add an item to the beginning of a list
   */
  prependToList: <T>(items: T[] | undefined, newItem: T): T[] => {
    return [newItem, ...(items ?? [])];
  },

  /**
   * Add an item to the end of a list
   */
  appendToList: <T>(items: T[] | undefined, newItem: T): T[] => {
    return [...(items ?? []), newItem];
  },

  /**
   * Toggle a boolean field on an item
   */
  toggleField: <T extends { id: string }, K extends keyof T>(
    items: T[] | undefined,
    id: string,
    field: K
  ): T[] => {
    return (
      items?.map((item) =>
        item.id === id ? { ...item, [field]: !item[field] } : item
      ) ?? []
    );
  },

  /**
   * Update status field on an item (common for alerts, uploads, etc.)
   */
  updateStatus: <T extends { id: string; status: string }>(
    items: T[] | undefined,
    id: string,
    newStatus: string
  ): T[] => {
    return (
      items?.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      ) ?? []
    );
  },
};
