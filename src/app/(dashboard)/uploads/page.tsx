// T090: Uploads management page
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadDropzone from "@/components/uploads/upload-dropzone";
import UploadList from "@/components/uploads/upload-list";
import FieldMapping, {
  type FieldMappingSuggestion,
} from "@/components/uploads/field-mapping";

type DataType = "constituents" | "gifts" | "contacts";

export default function UploadsPage() {
  const router = useRouter();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<DataType>("constituents");
  const [uploadStep, setUploadStep] = useState<"select" | "mapping">("select");
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mappingSuggestions, setMappingSuggestions] =
    useState<FieldMappingSuggestion | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, string>[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<
    string,
    string | null
  > | null>(null);

  const utils = trpc.useUtils();

  // Fetch uploads
  const { data: uploadsData, isLoading } = trpc.upload.list.useQuery({
    limit: 50,
  });

  // Mutations
  const createPresignedUrl = trpc.upload.createPresignedUrl.useMutation();
  const confirmUpload = trpc.upload.confirmUpload.useMutation();
  const updateFieldMapping = trpc.upload.updateFieldMapping.useMutation();
  const retryUpload = trpc.upload.retry.useMutation();
  const deleteUpload = trpc.upload.delete.useMutation();

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        // Create presigned URL
        const result = await createPresignedUrl.mutateAsync({
          filename: file.name,
          contentType: file.type || "text/csv",
          fileSize: file.size,
        });

        setCurrentUploadId(result.uploadId);

        // Upload file to storage
        if (result.presignedUrl) {
          // S3 upload
          await fetch(result.presignedUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "text/csv",
            },
          });
        } else if (result.uploadUrl) {
          // Local upload
          const formData = new FormData();
          formData.append("file", file);

          await fetch(result.uploadUrl, {
            method: "POST",
            body: formData,
          });
        }

        // Confirm upload and get field mapping suggestions
        await confirmUpload.mutateAsync({
          uploadId: result.uploadId,
        });

        // For now, we'll use mock data - in reality this would come from the server
        // after parsing the first few rows
        setDetectedColumns(["ID", "First Name", "Last Name", "Email"]);
        setMappingSuggestions({
          mapping: {
            ID: "externalId",
            "First Name": "firstName",
            "Last Name": "lastName",
            Email: "email",
          },
          confidence: {
            ID: 0.95,
            "First Name": 0.9,
            "Last Name": 0.9,
            Email: 0.99,
          },
          unmappedColumns: [],
          requiredFields: ["externalId", "lastName"],
          optionalFields: [
            "firstName",
            "email",
            "phone",
            "addressLine1",
            "city",
            "state",
          ],
        });
        setSampleData([]);

        setUploadStep("mapping");
      } catch {
        toast.error("Failed to upload file");
      }
    },
    [createPresignedUrl, confirmUpload]
  );

  // Handle mapping confirmation
  const handleMappingConfirm = useCallback(async () => {
    if (!currentUploadId || !currentMapping) return;

    try {
      const mappingToSend: Record<string, string> = {};
      for (const [key, value] of Object.entries(currentMapping)) {
        if (value !== null) {
          mappingToSend[key] = value;
        }
      }
      await updateFieldMapping.mutateAsync({
        uploadId: currentUploadId,
        fieldMapping: mappingToSend,
      });

      toast.success("Import started");
      setIsUploadDialogOpen(false);
      resetUploadState();
      utils.upload.list.invalidate();

      // Navigate to upload detail
      router.push(`/uploads/${currentUploadId}`);
    } catch {
      toast.error("Failed to start import");
    }
  }, [currentUploadId, currentMapping, updateFieldMapping, utils, router]);

  // Handle retry
  const handleRetry = useCallback(
    async (uploadId: string) => {
      try {
        await retryUpload.mutateAsync({ id: uploadId });
        toast.success("Upload requeued");
        utils.upload.list.invalidate();
      } catch {
        toast.error("Failed to retry upload");
      }
    },
    [retryUpload, utils]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (uploadId: string) => {
      if (!confirm("Are you sure you want to delete this upload?")) return;

      try {
        await deleteUpload.mutateAsync({ id: uploadId });
        toast.success("Upload deleted");
        utils.upload.list.invalidate();
      } catch {
        toast.error("Failed to delete upload");
      }
    },
    [deleteUpload, utils]
  );

  // Reset upload state
  const resetUploadState = () => {
    setUploadStep("select");
    setCurrentUploadId(null);
    setDetectedColumns([]);
    setMappingSuggestions(null);
    setSampleData([]);
    setCurrentMapping(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetUploadState();
    }
    setIsUploadDialogOpen(open);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Uploads</h1>
          <p className="text-muted-foreground">
            Upload and manage your CRM data exports
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {uploadStep === "select"
                  ? "Upload Data"
                  : "Map Fields"}
              </DialogTitle>
              <DialogDescription>
                {uploadStep === "select"
                  ? "Select the type of data and upload your CSV file"
                  : "Review and adjust how your CSV columns map to database fields"}
              </DialogDescription>
            </DialogHeader>

            {uploadStep === "select" ? (
              <div className="space-y-6">
                {/* Data type selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Data Type</label>
                  <Tabs
                    value={selectedDataType}
                    onValueChange={(v) => setSelectedDataType(v as DataType)}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="constituents">Constituents</TabsTrigger>
                      <TabsTrigger value="gifts">Gifts</TabsTrigger>
                      <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="constituents" className="text-sm text-muted-foreground">
                      Upload donor/prospect records with contact information
                    </TabsContent>
                    <TabsContent value="gifts" className="text-sm text-muted-foreground">
                      Upload gift/donation transaction records
                    </TabsContent>
                    <TabsContent value="contacts" className="text-sm text-muted-foreground">
                      Upload contact/interaction history records
                    </TabsContent>
                  </Tabs>
                </div>

                {/* File upload */}
                <UploadDropzone
                  onFileSelect={handleFileSelect}
                  disabled={createPresignedUrl.isPending}
                />

                <p className="text-xs text-muted-foreground">
                  Max file size: 500MB. Supported format: CSV
                </p>
              </div>
            ) : mappingSuggestions ? (
              <FieldMapping
                columns={detectedColumns}
                suggestions={mappingSuggestions}
                sampleData={sampleData}
                dataType={selectedDataType}
                onMappingChange={setCurrentMapping}
                onConfirm={handleMappingConfirm}
                onCancel={() => setUploadStep("select")}
                isLoading={updateFieldMapping.isPending}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent uploads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Uploads</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => utils.upload.list.invalidate()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <UploadList
            uploads={(uploadsData?.items ?? []).map((u) => ({
              ...u,
              user: {
                id: u.user?.id ?? "",
                name: u.user?.name ?? null,
              },
            }))}
            onRetry={handleRetry}
            onDelete={handleDelete}
            isLoading={isLoading}
            emptyMessage="No uploads yet. Click 'New Upload' to get started."
          />
        </CardContent>
      </Card>
    </div>
  );
}
