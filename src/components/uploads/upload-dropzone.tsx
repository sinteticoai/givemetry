// T091: File upload dropzone component
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  maxSize?: number; // in bytes
  className?: string;
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB

export function UploadDropzone({
  onFileSelect,
  disabled = false,
  maxSize = DEFAULT_MAX_SIZE,
  className,
}: UploadDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      // Handle accepted file
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file) {
          setSelectedFile(file);
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const onDropRejected = useCallback(
    (rejectedFiles: Array<{ file: File; errors: Array<{ code: string }> }>) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection && rejection.errors.some((e) => e.code === "file-too-large")) {
          setError(`File is too large. Maximum size is ${formatBytes(maxSize)}.`);
        } else if (rejection && rejection.errors.some((e) => e.code === "file-invalid-type")) {
          setError("Invalid file type. Please upload a CSV file.");
        } else {
          setError("Could not upload file. Please try again.");
        }
      }
    },
    [maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    disabled,
    maxSize,
    accept: {
      "text/csv": [".csv"],
      "application/csv": [".csv"],
    },
    multiple: false,
  });

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedFile ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            isDragActive && !isDragReject && "border-primary bg-primary/5",
            isDragReject && "border-destructive bg-destructive/5",
            !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} aria-label="Upload CSV file" />

          <div className="rounded-full bg-muted p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="text-center">
            <p className="font-medium">
              {isDragActive
                ? isDragReject
                  ? "Invalid file type"
                  : "Drop your CSV file here"
                : "Drag and drop your CSV file"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (max {formatBytes(maxSize)})
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Supported formats: CSV
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default UploadDropzone;
