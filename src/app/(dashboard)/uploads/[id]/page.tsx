// T095: Upload detail page with error display
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Download,
  AlertCircle,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UploadProgress, {
  type UploadStatus,
} from "@/components/uploads/upload-progress";

export default function UploadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uploadId = params.id as string;

  const utils = trpc.useUtils();

  // Fetch upload details
  const {
    data: upload,
    isLoading,
    error,
  } = trpc.upload.get.useQuery(
    { id: uploadId },
    {
      refetchInterval: (query) => {
        // Poll while processing
        const data = query.state.data;
        if (
          data?.status === "queued" ||
          data?.status === "processing"
        ) {
          return 2000;
        }
        return false;
      },
    }
  );

  // Mutations
  const retryUpload = trpc.upload.retry.useMutation();
  const deleteUpload = trpc.upload.delete.useMutation();

  const handleRetry = async () => {
    try {
      await retryUpload.mutateAsync({ id: uploadId });
      toast.success("Upload requeued");
      utils.upload.get.invalidate({ id: uploadId });
    } catch {
      toast.error("Failed to retry upload");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this upload?")) return;

    try {
      await deleteUpload.mutateAsync({ id: uploadId });
      toast.success("Upload deleted");
      router.push("/uploads");
    } catch {
      toast.error("Failed to delete upload");
    }
  };

  const downloadErrorReport = () => {
    if (!upload?.errors) return;

    const errors = upload.errors as Array<{
      row?: number;
      field?: string;
      message: string;
    }>;

    const csv = [
      ["Row", "Field", "Error"],
      ...errors.map((e) => [
        e.row?.toString() ?? "",
        e.field ?? "",
        e.message,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${upload.filename}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !upload) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Upload not found</h2>
        <Button variant="outline" asChild>
          <Link href="/uploads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Uploads
          </Link>
        </Button>
      </div>
    );
  }

  const status = upload.status as UploadStatus;
  const canRetry = status === "failed" || status === "completed_with_errors";
  const canDelete = status !== "queued" && status !== "processing";
  const errors = (upload.errors ?? []) as Array<{
    row?: number;
    field?: string;
    message: string;
  }>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/uploads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <FileText className="h-6 w-6" />
              {upload.filename}
            </h1>
            <p className="text-muted-foreground">
              Uploaded{" "}
              {formatDistanceToNow(new Date(upload.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={retryUpload.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUpload.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <UploadProgress
        uploadId={upload.id}
        filename={upload.filename}
        status={status}
        progress={upload.progress}
        rowCount={upload.rowCount}
        processedCount={upload.processedCount}
        errorCount={upload.errorCount}
      />

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span>{upload.fileSize ? formatBytes(upload.fileSize) : "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(upload.createdAt), "PPp")}</span>
            </div>
            {upload.startedAt && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{format(new Date(upload.startedAt), "PPp")}</span>
                </div>
              </>
            )}
            {upload.completedAt && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(upload.completedAt), "PPp")}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded By</span>
              <span>{upload.user?.name || "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            {upload.fieldMapping ? (
              <div className="space-y-2">
                {Object.entries(
                  upload.fieldMapping as Record<string, string | null>
                ).map(([source, target]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{source}</span>
                    <span>
                      {target ? (
                        <Badge variant="secondary">{target}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Skipped</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No field mapping available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Errors ({errors.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={downloadErrorReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Row</TableHead>
                    <TableHead className="w-[150px]">Field</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.slice(0, 100).map((error, idx) => (
                    <TableRow key={idx} data-testid="error-row">
                      <TableCell className="font-mono">
                        {error.row ?? "-"}
                      </TableCell>
                      <TableCell>
                        {error.field ? (
                          <Badge variant="outline">{error.field}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {error.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.length > 100 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing first 100 errors. Download the full report to see all{" "}
                {errors.length} errors.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
