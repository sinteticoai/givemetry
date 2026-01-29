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

// Simple CSV line parser that handles quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Column name patterns for auto-mapping
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  externalId: [/^(constituent|donor|account|contact)?[_\s-]*(id|number)$/i, /^id$/i],
  firstName: [/^first[_\s-]*(name)?$/i, /^given[_\s-]*name$/i],
  lastName: [/^last[_\s-]*(name)?$/i, /^sur[_\s-]*name$/i],
  middleName: [/^middle[_\s-]*(name)?$/i],
  prefix: [/^prefix$/i, /^title$/i, /^salutation$/i],
  suffix: [/^suffix$/i],
  email: [/^e?mail$/i, /^email[_\s-]*address$/i],
  phone: [/^phone$/i, /^telephone$/i, /^tel$/i],
  addressLine1: [/^address[_\s-]*(line)?[_\s-]*1?$/i, /^street$/i],
  addressLine2: [/^address[_\s-]*(line)?[_\s-]*2$/i, /^apt$/i, /^suite$/i],
  city: [/^city$/i, /^town$/i],
  state: [/^state$/i, /^province$/i],
  postalCode: [/^(postal|zip)[_\s-]*(code)?$/i, /^postcode$/i],
  country: [/^country$/i],
  constituentType: [/^(constituent|donor)?[_\s-]*type$/i],
  classYear: [/^class[_\s-]*(year|of)?$/i, /^(graduation|grad)[_\s-]*year$/i],
  schoolCollege: [/^school[_\s-]*(college)?$/i, /^college$/i],
  estimatedCapacity: [/^(estimated[_\s-]*)?(capacity|wealth)$/i],
  capacitySource: [/^capacity[_\s-]*source$/i],
  assignedOfficerId: [/^assigned[_\s-]*(officer|gift[_\s-]*officer)?[_\s-]*(id)?$/i],
  portfolioTier: [/^portfolio[_\s-]*tier$/i, /^tier$/i],
  // Gift fields
  constituentExternalId: [/^constituent[_\s-]*(id|number)?$/i],
  amount: [/^(gift[_\s-]*)?(amount|amt)$/i, /^donation$/i],
  giftDate: [/^(gift[_\s-]*)?date$/i],
  giftType: [/^(gift[_\s-]*)?type$/i],
  fundName: [/^fund[_\s-]*(name)?$/i],
  fundCode: [/^fund[_\s-]*(code|id)$/i],
  campaign: [/^campaign$/i],
  appeal: [/^appeal$/i],
  recognitionAmount: [/^recognition[_\s-]*(amount)?$/i],
  isAnonymous: [/^(is[_\s-]*)?anonymous$/i],
  // Contact fields
  contactDate: [/^(contact|interaction)[_\s-]*(date)?$/i],
  contactType: [/^(contact|interaction)[_\s-]*type$/i],
  subject: [/^subject$/i, /^title$/i],
  notes: [/^notes?$/i, /^description$/i, /^comments?$/i],
  outcome: [/^outcome$/i, /^result$/i],
  nextAction: [/^next[_\s-]*action$/i],
  nextActionDate: [/^next[_\s-]*action[_\s-]*date$/i],
};

const FIELD_DEFS: Record<DataType, { required: string[]; optional: string[] }> = {
  constituents: {
    required: ["externalId", "lastName"],
    optional: [
      "firstName", "middleName", "prefix", "suffix", "email", "phone",
      "addressLine1", "addressLine2", "city", "state", "postalCode", "country",
      "constituentType", "classYear", "schoolCollege", "estimatedCapacity",
      "capacitySource", "assignedOfficerId", "portfolioTier",
    ],
  },
  gifts: {
    required: ["constituentExternalId", "amount", "giftDate"],
    optional: [
      "externalId", "giftType", "fundName", "fundCode", "campaign",
      "appeal", "recognitionAmount", "isAnonymous",
    ],
  },
  contacts: {
    required: ["constituentExternalId", "contactDate", "contactType"],
    optional: ["externalId", "subject", "notes", "outcome", "nextAction", "nextActionDate"],
  },
};

function generateMappingSuggestions(
  columns: string[],
  dataType: DataType
): FieldMappingSuggestion {
  const fields = FIELD_DEFS[dataType];
  const allFields = [...fields.required, ...fields.optional];
  const mapping: Record<string, string | null> = {};
  const confidence: Record<string, number> = {};
  const usedFields = new Set<string>();

  for (const column of columns) {
    const normalized = column.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    let bestMatch: string | null = null;
    let bestConfidence = 0;

    for (const field of allFields) {
      if (usedFields.has(field)) continue;

      const patterns = COLUMN_PATTERNS[field];
      if (patterns) {
        for (const pattern of patterns) {
          if (pattern.test(column) || pattern.test(normalized)) {
            if (0.95 > bestConfidence) {
              bestMatch = field;
              bestConfidence = 0.95;
            }
          }
        }
      }

      // Fallback: exact match on normalized name
      if (field.toLowerCase() === normalized && bestConfidence < 0.9) {
        bestMatch = field;
        bestConfidence = 0.9;
      }
    }

    mapping[column] = bestMatch;
    confidence[column] = bestConfidence;
    if (bestMatch) usedFields.add(bestMatch);
  }

  const unmappedColumns = columns.filter((c) => !mapping[c]);

  return {
    mapping,
    confidence,
    unmappedColumns,
    requiredFields: fields.required,
    optionalFields: fields.optional,
  };
}

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
        // Create presigned URL with selected data type
        const result = await createPresignedUrl.mutateAsync({
          filename: file.name,
          contentType: file.type || "text/csv",
          fileSize: file.size,
          dataType: selectedDataType,
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

        // Confirm upload
        await confirmUpload.mutateAsync({
          uploadId: result.uploadId,
        });

        // Parse CSV to get columns and sample data
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];

        // Get sample data (first 3 rows)
        const samples: Record<string, string>[] = [];
        for (let i = 1; i < Math.min(4, lines.length); i++) {
          const values = parseCSVLine(lines[i] ?? "");
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] ?? "";
          });
          samples.push(row);
        }

        // Generate field mapping suggestions based on data type
        const suggestions = generateMappingSuggestions(headers, selectedDataType);

        setDetectedColumns(headers);
        setMappingSuggestions(suggestions);
        setSampleData(samples);
        // Initialize currentMapping with the suggested mapping
        setCurrentMapping(suggestions.mapping);

        setUploadStep("mapping");
      } catch {
        toast.error("Failed to upload file");
      }
    },
    [createPresignedUrl, confirmUpload, selectedDataType]
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
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
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
              <div className="overflow-y-auto flex-1 -mx-6 px-6">
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
              </div>
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
