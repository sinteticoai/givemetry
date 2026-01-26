// T246: Donors list page
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ConstituentList } from "@/components/donors/constituent-list";
import { ConstituentFilters } from "@/components/donors/constituent-filters";
import { ConstituentDetail } from "@/components/donors/constituent-detail";
import { LoadingSpinner } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

export default function DonorsPage() {
  const [search, setSearch] = useState("");
  const [assignedOfficerId, setAssignedOfficerId] = useState<string | undefined>();
  const [portfolioTier, setPortfolioTier] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"name" | "priorityScore" | "lapseRiskScore" | "updatedAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedConstituentId, setSelectedConstituentId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.constituent.list.useInfiniteQuery(
    {
      limit: 25,
      search: search || undefined,
      assignedOfficerId,
      portfolioTier,
      sortBy,
      sortOrder,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const constituents = data?.pages.flatMap((page) => page.items) ?? [];

  const handleSelectConstituent = (id: string) => {
    setSelectedConstituentId(id === selectedConstituentId ? null : id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Donors</h1>
        <p className="text-muted-foreground">
          Manage and view constituent information
        </p>
      </div>

      {/* Filters */}
      <ConstituentFilters
        search={search}
        onSearchChange={setSearch}
        assignedOfficerId={assignedOfficerId}
        onAssignedOfficerChange={setAssignedOfficerId}
        portfolioTier={portfolioTier}
        onPortfolioTierChange={setPortfolioTier}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Content */}
      <div className="flex flex-1 gap-6 mt-6 min-h-0">
        {/* List */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : constituents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No donors found"
              description={
                search || assignedOfficerId || portfolioTier
                  ? "Try adjusting your filters to find more donors."
                  : "Upload donor data to get started."
              }
            />
          ) : (
            <ConstituentList
              constituents={constituents}
              selectedId={selectedConstituentId}
              onSelect={handleSelectConstituent}
              hasMore={hasNextPage ?? false}
              onLoadMore={() => fetchNextPage()}
              isLoadingMore={isFetchingNextPage}
            />
          )}
        </div>

        {/* Detail Sidebar */}
        {selectedConstituentId && (
          <div className="w-96 flex-shrink-0 hidden lg:block">
            <ConstituentDetail
              constituentId={selectedConstituentId}
              onClose={() => setSelectedConstituentId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
