// T093: Upload progress indicator component
"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type UploadStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "completed_with_errors";

export interface UploadProgressProps {
  uploadId: string;
  filename: string;
  status: UploadStatus;
  progress: number;
  rowCount?: number | null;
  processedCount?: number | null;
  errorCount?: number | null;
  className?: string;
}

export function UploadProgress({
  filename,
  status,
  progress,
  rowCount,
  processedCount,
  errorCount,
  className,
}: UploadProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(progress);

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const statusInfo = getStatusInfo(status);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">{filename}</CardTitle>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(status === "queued" || status === "processing") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {status === "queued" ? "Waiting to start..." : "Processing..."}
              </span>
              <span className="font-medium">{Math.round(displayProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  status === "queued" ? "bg-muted-foreground/30" : "bg-primary"
                )}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{rowCount ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Total Rows</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">
              {processedCount ?? "-"}
            </p>
            <p className="text-xs text-muted-foreground">Processed</p>
          </div>
          <div>
            <p
              className={cn(
                "text-2xl font-bold",
                (errorCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {errorCount ?? "-"}
            </p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>

        {/* Status Message */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-3 text-sm",
            statusInfo.bgColor
          )}
        >
          <statusInfo.icon
            className={cn("h-4 w-4", statusInfo.iconColor)}
          />
          <span className={statusInfo.textColor}>{statusInfo.message}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const info = getStatusBadgeInfo(status);

  return (
    <Badge variant={info.variant} className="gap-1">
      {info.icon}
      {info.label}
    </Badge>
  );
}

function getStatusInfo(status: UploadStatus) {
  switch (status) {
    case "queued":
      return {
        icon: Loader2,
        iconColor: "text-muted-foreground animate-spin",
        textColor: "text-muted-foreground",
        bgColor: "bg-muted",
        message: "Your upload is queued and will start processing shortly.",
      };
    case "processing":
      return {
        icon: Loader2,
        iconColor: "text-primary animate-spin",
        textColor: "text-primary",
        bgColor: "bg-primary/10",
        message: "Processing your data. This may take a few minutes...",
      };
    case "completed":
      return {
        icon: CheckCircle,
        iconColor: "text-green-500",
        textColor: "text-green-700",
        bgColor: "bg-green-50",
        message: "Upload completed successfully!",
      };
    case "completed_with_errors":
      return {
        icon: AlertTriangle,
        iconColor: "text-yellow-500",
        textColor: "text-yellow-700",
        bgColor: "bg-yellow-50",
        message:
          "Upload completed with some errors. Check the error report for details.",
      };
    case "failed":
      return {
        icon: XCircle,
        iconColor: "text-destructive",
        textColor: "text-destructive",
        bgColor: "bg-destructive/10",
        message: "Upload failed. Please check the errors and try again.",
      };
    default:
      return {
        icon: Loader2,
        iconColor: "text-muted-foreground",
        textColor: "text-muted-foreground",
        bgColor: "bg-muted",
        message: "Unknown status",
      };
  }
}

function getStatusBadgeInfo(status: UploadStatus) {
  switch (status) {
    case "queued":
      return {
        variant: "secondary" as const,
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Queued",
      };
    case "processing":
      return {
        variant: "default" as const,
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Processing",
      };
    case "completed":
      return {
        variant: "default" as const,
        icon: <CheckCircle className="h-3 w-3" />,
        label: "Completed",
      };
    case "completed_with_errors":
      return {
        variant: "outline" as const,
        icon: <AlertTriangle className="h-3 w-3 text-yellow-500" />,
        label: "Completed with errors",
      };
    case "failed":
      return {
        variant: "destructive" as const,
        icon: <XCircle className="h-3 w-3" />,
        label: "Failed",
      };
    default:
      return {
        variant: "secondary" as const,
        icon: null,
        label: "Unknown",
      };
  }
}

export default UploadProgress;
