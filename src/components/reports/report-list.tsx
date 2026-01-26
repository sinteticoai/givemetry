// T215: Report list component
"use client";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Download, Eye, Trash2, FileText, RefreshCw } from "lucide-react";

interface ReportListProps {
  onViewReport?: (reportId: string) => void;
}

export function ReportList({ onViewReport }: ReportListProps) {
  const utils = trpc.useUtils();

  const { data, isLoading, isFetching } = trpc.report.list.useQuery({
    limit: 20,
    status: undefined,
  });

  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => {
      utils.report.list.invalidate();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "generating":
        return <Badge variant="default" className="bg-blue-500">Generating</Badge>;
      case "queued":
        return <Badge variant="secondary">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case "executive":
        return "Executive Summary";
      case "portfolio":
        return "Portfolio Health";
      case "lapse_risk":
        return "Lapse Risk";
      case "priorities":
        return "Priorities";
      case "campaign":
        return "Campaign";
      default:
        return type;
    }
  };

  const handleDelete = async (reportId: string) => {
    if (confirm("Are you sure you want to delete this report?")) {
      await deleteMutation.mutateAsync({ id: reportId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate your first report to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {report.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getReportTypeLabel(report.reportType)}</TableCell>
                <TableCell>{getStatusBadge(report.status)}</TableCell>
                <TableCell>
                  <span title={new Date(report.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(report.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {report.status === "completed" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onViewReport?.(report.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                        </>
                      )}
                      {report.status === "failed" && (
                        <DropdownMenuItem>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(report.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isFetching}
          >
            {isFetching ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
