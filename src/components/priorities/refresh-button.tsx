// T151: Refresh priorities button with loading state
"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface RefreshButtonProps {
  onRefreshed?: () => void;
}

export function RefreshButton({ onRefreshed }: RefreshButtonProps) {
  const utils = trpc.useUtils();

  const refreshPriorities = trpc.analysis.refreshPriorities.useMutation({
    onSuccess: () => {
      utils.analysis.getPriorityList.invalidate();
      onRefreshed?.();
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => refreshPriorities.mutate()}
      disabled={refreshPriorities.isPending}
    >
      {refreshPriorities.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Refreshing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Priorities
        </>
      )}
    </Button>
  );
}
