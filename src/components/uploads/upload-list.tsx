// T094: Upload history list component
"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UploadStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "completed_with_errors";

export interface Upload {
  id: string;
  filename: string;
  status: UploadStatus;
  rowCount: number | null;
  processedCount: number | null;
  errorCount: number | null;
  progress: number;
  createdAt: Date | string;
  completedAt: Date | string | null;
  user: {
    id: string;
    name: string | null;
  };
}

export interface UploadListProps {
  uploads: Upload[];
  onRetry?: (uploadId: string) => void;
  onDelete?: (uploadId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function UploadList({
  uploads,
  onRetry,
  onDelete,
  isLoading = false,
  emptyMessage = "No uploads yet",
}: UploadListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Records</TableHead>
            <TableHead className="text-right">Errors</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploads.map((upload) => (
            <UploadRow
              key={upload.id}
              upload={upload}
              onRetry={onRetry}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface UploadRowProps {
  upload: Upload;
  onRetry?: (uploadId: string) => void;
  onDelete?: (uploadId: string) => void;
}

function UploadRow({ upload, onRetry, onDelete }: UploadRowProps) {
  const canRetry =
    upload.status === "failed" || upload.status === "completed_with_errors";
  const canDelete = upload.status !== "processing";

  return (
    <TableRow data-testid="upload-row">
      <TableCell>
        <Link
          href={`/uploads/${upload.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{upload.filename}</span>
        </Link>
      </TableCell>
      <TableCell>
        <StatusBadge status={upload.status} progress={upload.progress} />
      </TableCell>
      <TableCell className="text-right">
        {upload.processedCount !== null ? (
          <span>
            {upload.processedCount.toLocaleString()}
            {upload.rowCount && (
              <span className="text-muted-foreground">
                {" / "}
                {upload.rowCount.toLocaleString()}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {upload.errorCount !== null && upload.errorCount > 0 ? (
          <span className="text-destructive">
            {upload.errorCount.toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/uploads/${upload.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {canRetry && onRetry && (
              <DropdownMenuItem onClick={() => onRetry(upload.id)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Upload
              </DropdownMenuItem>
            )}
            {canDelete && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(upload.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({
  status,
  progress,
}: {
  status: UploadStatus;
  progress: number;
}) {
  const info = getStatusInfo(status);

  return (
    <Badge variant={info.variant} className="gap-1">
      <info.icon
        className={cn("h-3 w-3", info.animate && "animate-spin")}
      />
      <span>
        {info.label}
        {status === "processing" && ` (${Math.round(progress)}%)`}
      </span>
    </Badge>
  );
}

function getStatusInfo(status: UploadStatus) {
  switch (status) {
    case "queued":
      return {
        variant: "secondary" as const,
        icon: Clock,
        label: "Queued",
        animate: false,
      };
    case "processing":
      return {
        variant: "default" as const,
        icon: Loader2,
        label: "Processing",
        animate: true,
      };
    case "completed":
      return {
        variant: "default" as const,
        icon: CheckCircle,
        label: "Completed",
        animate: false,
      };
    case "completed_with_errors":
      return {
        variant: "outline" as const,
        icon: AlertTriangle,
        label: "Completed with errors",
        animate: false,
      };
    case "failed":
      return {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Failed",
        animate: false,
      };
    default:
      return {
        variant: "secondary" as const,
        icon: Clock,
        label: "Unknown",
        animate: false,
      };
  }
}

export default UploadList;
