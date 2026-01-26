// T186: Global search bar component for natural language queries
"use client";

import * as React from "react";
import { Search, X, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  onResultsChange?: (hasResults: boolean) => void;
}

export function GlobalSearch({
  className,
  placeholder = "Search donors... (try: 'donors who gave over $10K')",
  onResultsChange,
}: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isExpanded, setIsExpanded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const queryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      if (onResultsChange) {
        onResultsChange(data.results.length > 0);
      }
      // Navigate to search results page with query ID
      router.push(`/search?q=${encodeURIComponent(query)}&id=${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;
    queryMutation.mutate({ query: query.trim() });
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("");
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex items-center transition-all duration-200",
        isExpanded ? "w-full max-w-2xl" : "w-80",
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => {
            if (!query) setIsExpanded(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-20 h-10",
            queryMutation.isPending && "pr-28"
          )}
          disabled={queryMutation.isPending}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-16 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {queryMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="h-4 w-4 text-purple-500" />
          )}
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={query.trim().length < 3 || queryMutation.isPending}
            className="h-7 px-2 text-xs"
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}

// Compact version for use in header
export function GlobalSearchCompact({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const queryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      router.push(`/search?q=${encodeURIComponent(query)}&id=${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;
    queryMutation.mutate({ query: query.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask about your donors..."
        className="h-8 w-64 pl-8 pr-8 text-sm"
        disabled={queryMutation.isPending}
      />
      {queryMutation.isPending && (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </form>
  );
}
