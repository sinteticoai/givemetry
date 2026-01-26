// Search results page for natural language queries
"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GlobalSearch } from "@/components/shared/global-search";
import {
  QueryResults,
  QueryResultsSummary,
  InterpretedQuery,
  InterpretedQueryError,
  SaveQueryDialog,
  SavedQueriesList,
  QueryFeedback,
  NoResultsExplanation,
} from "@/components/query";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const queryText = searchParams.get("q") || "";
  const queryId = searchParams.get("id") || "";

  const [currentQueryId, setCurrentQueryId] = React.useState(queryId);
  const [currentQueryText, setCurrentQueryText] = React.useState(queryText);

  // Fetch results if we have a query ID
  const queryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      setCurrentQueryId(data.id);
      setCurrentQueryText(queryText);
    },
  });

  // Auto-run query if we have text but no ID
  React.useEffect(() => {
    if (queryText && !queryId && !queryMutation.isPending && !queryMutation.data) {
      queryMutation.mutate({ query: queryText });
    }
  }, [queryText, queryId, queryMutation]);

  // Use the mutation data if available, otherwise we're waiting
  const queryData = queryMutation.data;
  const isLoading = queryMutation.isPending;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with search */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Search Results</h1>
        </div>

        <GlobalSearch
          placeholder="Search donors... (try: 'donors who gave over $10K')"
          className="max-w-3xl"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Results */}
      {queryData && !isLoading && (
        <div className="space-y-6">
          {/* Interpreted query display */}
          {queryData.success ? (
            <InterpretedQuery
              originalQuery={currentQueryText || queryData.interpretation}
              interpretation={queryData.interpretation}
              filters={queryData.filters}
            />
          ) : (
            <InterpretedQueryError
              error={queryData.message || "Could not parse query"}
              suggestions={queryData.suggestions}
            />
          )}

          {/* Actions bar */}
          {queryData.success && queryData.results.length > 0 && (
            <div className="flex items-center justify-between">
              <QueryFeedback queryId={currentQueryId} />
              <div className="flex items-center gap-2">
                <SaveQueryDialog
                  queryId={currentQueryId}
                  queryText={currentQueryText}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryMutation.mutate({ query: currentQueryText })}
                  disabled={queryMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${queryMutation.isPending ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Results summary */}
          {queryData.results.length > 0 && (
            <QueryResultsSummary results={queryData.results} />
          )}

          {/* Results table or empty state */}
          {queryData.results.length > 0 ? (
            <QueryResults
              results={queryData.results}
              totalCount={queryData.totalCount}
            />
          ) : queryData.success ? (
            <NoResultsExplanation
              query={currentQueryText}
              filters={queryData.filters}
            />
          ) : null}
        </div>
      )}

      {/* No query state */}
      {!queryText && !isLoading && !queryData && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Search Your Donors</h2>
              <p className="text-muted-foreground mb-4">
                Use natural language to find donors. Try queries like:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>&ldquo;Show me donors who gave over $10,000&rdquo;</li>
                <li>&ldquo;High risk alumni from the class of 2010&rdquo;</li>
                <li>&ldquo;Donors not contacted in 6 months&rdquo;</li>
                <li>&ldquo;Top 20 priority prospects&rdquo;</li>
              </ul>
            </div>
          </div>
          <div>
            <SavedQueriesList />
          </div>
        </div>
      )}

      {/* Saved queries sidebar when we have results */}
      {queryData && queryData.results.length > 0 && (
        <div className="mt-8">
          <SavedQueriesList className="max-w-md" />
        </div>
      )}
    </div>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full max-w-3xl" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
