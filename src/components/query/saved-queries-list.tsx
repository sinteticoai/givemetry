// T190: Saved queries list
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Play, Trash2, MoreVertical, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedQueriesListProps {
  onRunQuery?: (queryText: string) => void;
  className?: string;
}

export function SavedQueriesList({
  onRunQuery,
  className,
}: SavedQueriesListProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data: queries, isLoading, refetch } = trpc.ai.getSavedQueries.useQuery();

  const deleteMutation = trpc.ai.deleteSavedQuery.useMutation({
    onSuccess: () => {
      toast.success("Query deleted");
      refetch();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete query");
    },
  });

  const queryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      if (data.results && data.results.length > 0) {
        toast.success(`Found ${data.totalCount} results`);
      } else {
        toast.info("No results found");
      }
      onRunQuery?.(data.interpretation);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to run query");
    },
  });

  const handleRunQuery = (queryText: string) => {
    queryMutation.mutate({ query: queryText });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queries || queries.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyState
            icon={Bookmark}
            title="No saved queries"
            description="Save your frequently used searches for quick access."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Queries
          </CardTitle>
          <CardDescription>
            Your saved searches for quick access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {queries.map((query) => (
              <div
                key={query.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium truncate">{query.savedName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    &ldquo;{query.queryText}&rdquo;
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(query.createdAt), { addSuffix: true })}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunQuery(query.queryText)}
                    disabled={queryMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRunQuery(query.queryText)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Query
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(query.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Query?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved query will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Compact version for sidebar
export function SavedQueriesCompact({
  onRunQuery,
  limit = 5,
}: {
  onRunQuery?: (queryText: string) => void;
  limit?: number;
}) {
  const { data: queries, isLoading } = trpc.ai.getSavedQueries.useQuery();

  const queryMutation = trpc.ai.query.useMutation({
    onSuccess: (data) => {
      onRunQuery?.(data.interpretation);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!queries || queries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No saved queries yet
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {queries.slice(0, limit).map((query) => (
        <Button
          key={query.id}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm font-normal h-auto py-2"
          onClick={() => queryMutation.mutate({ query: query.queryText })}
          disabled={queryMutation.isPending}
        >
          <Bookmark className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{query.savedName}</span>
        </Button>
      ))}
    </div>
  );
}
