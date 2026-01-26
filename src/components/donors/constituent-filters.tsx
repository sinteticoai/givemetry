// T248: Constituent search and filters component
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";
import { Search, X, ChevronDown, Users, ArrowUpDown, SortAsc, SortDesc } from "lucide-react";

interface ConstituentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  assignedOfficerId: string | undefined;
  onAssignedOfficerChange: (value: string | undefined) => void;
  portfolioTier: string | undefined;
  onPortfolioTierChange: (value: string | undefined) => void;
  sortBy: "name" | "priorityScore" | "lapseRiskScore" | "updatedAt";
  onSortByChange: (value: "name" | "priorityScore" | "lapseRiskScore" | "updatedAt") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
}

const PORTFOLIO_TIERS = [
  { value: "principal", label: "Principal" },
  { value: "major", label: "Major" },
  { value: "leadership", label: "Leadership" },
  { value: "annual", label: "Annual" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "priorityScore", label: "Priority Score" },
  { value: "lapseRiskScore", label: "Lapse Risk" },
  { value: "updatedAt", label: "Recently Updated" },
];

export function ConstituentFilters({
  search,
  onSearchChange,
  assignedOfficerId,
  onAssignedOfficerChange,
  portfolioTier,
  onPortfolioTierChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: ConstituentFiltersProps) {
  const { data: officers, isLoading: isLoadingOfficers } = trpc.user.listOfficers.useQuery(
    undefined,
    { staleTime: 60000 }
  );

  const selectedOfficer = officers?.find((o) => o.id === assignedOfficerId);
  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortBy);

  const hasActiveFilters = search || assignedOfficerId || portfolioTier;

  const clearFilters = () => {
    onSearchChange("");
    onAssignedOfficerChange(undefined);
    onPortfolioTierChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Officer Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-between" disabled={isLoadingOfficers}>
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4" />
              {selectedOfficer?.name || "All Officers"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem onClick={() => onAssignedOfficerChange(undefined)}>
            All Officers
          </DropdownMenuItem>
          {officers && officers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {officers.map((officer) => (
                <DropdownMenuItem
                  key={officer.id}
                  onClick={() => onAssignedOfficerChange(officer.id)}
                >
                  {officer.name || officer.email}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Portfolio Tier Filter */}
      <Select
        value={portfolioTier || "all"}
        onValueChange={(value) => onPortfolioTierChange(value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Tiers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          {PORTFOLIO_TIERS.map((tier) => (
            <SelectItem key={tier.value} value={tier.value}>
              {tier.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-between">
            <span className="flex items-center gap-2 truncate">
              <ArrowUpDown className="h-4 w-4" />
              {selectedSort?.label || "Sort by"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortByChange(option.value as typeof sortBy)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Order Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
        title={sortOrder === "asc" ? "Ascending" : "Descending"}
      >
        {sortOrder === "asc" ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
