// T092: Field mapping UI component
"use client";

import { useState, useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FieldMappingSuggestion {
  mapping: Record<string, string | null>;
  confidence: Record<string, number>;
  unmappedColumns: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface FieldMappingProps {
  columns: string[];
  suggestions: FieldMappingSuggestion;
  sampleData?: Record<string, string>[];
  dataType: "constituents" | "gifts" | "contacts";
  onMappingChange: (mapping: Record<string, string | null>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  externalId: "External ID",
  firstName: "First Name",
  lastName: "Last Name",
  middleName: "Middle Name",
  prefix: "Prefix",
  suffix: "Suffix",
  email: "Email",
  phone: "Phone",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  city: "City",
  state: "State/Province",
  postalCode: "Postal/ZIP Code",
  country: "Country",
  constituentType: "Type",
  classYear: "Class Year",
  schoolCollege: "School/College",
  estimatedCapacity: "Estimated Capacity",
  capacitySource: "Capacity Source",
  assignedOfficerId: "Assigned Officer",
  portfolioTier: "Portfolio Tier",
  constituentExternalId: "Constituent ID",
  amount: "Amount",
  giftDate: "Gift Date",
  giftType: "Gift Type",
  fundName: "Fund Name",
  fundCode: "Fund Code",
  campaign: "Campaign",
  appeal: "Appeal",
  recognitionAmount: "Recognition Amount",
  isAnonymous: "Anonymous",
  contactDate: "Contact Date",
  contactType: "Contact Type",
  subject: "Subject",
  notes: "Notes",
  outcome: "Outcome",
  nextAction: "Next Action",
  nextActionDate: "Next Action Date",
};

export function FieldMapping({
  columns,
  suggestions,
  sampleData = [],
  onMappingChange,
  onConfirm,
  onCancel,
  isLoading = false,
}: FieldMappingProps) {
  const [mapping, setMapping] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(suggestions.mapping)) {
      initial[key] = value ?? null;
    }
    return initial;
  });

  const allTargetFields = useMemo(
    () => [...suggestions.requiredFields, ...suggestions.optionalFields],
    [suggestions.requiredFields, suggestions.optionalFields]
  );

  const mappedFields = useMemo(
    () => new Set(Object.values(mapping).filter((v): v is string => v !== null)),
    [mapping]
  );

  const missingRequired = useMemo(
    () => suggestions.requiredFields.filter((f) => !mappedFields.has(f)),
    [suggestions.requiredFields, mappedFields]
  );

  const isValid = missingRequired.length === 0;

  const handleFieldChange = (column: string, field: string | null) => {
    const newMapping = { ...mapping, [column]: field };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-500";
    if (confidence >= 0.7) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Map CSV Columns to Fields</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              {missingRequired.length > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {missingRequired.length} required field
                  {missingRequired.length > 1 ? "s" : ""} missing
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1 bg-green-500">
                  <Check className="h-3 w-3" />
                  All required fields mapped
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">CSV Column</TableHead>
                  <TableHead className="w-[200px]">Maps To Field</TableHead>
                  <TableHead>Sample Value</TableHead>
                  <TableHead className="w-[100px]">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column) => {
                  const currentField = mapping[column] ?? null;
                  const confidence = suggestions.confidence[column] || 0;

                  return (
                    <TableRow key={column}>
                      <TableCell className="font-medium">{column}</TableCell>
                      <TableCell>
                        <FieldSelect
                          value={currentField}
                          onChange={(field) => handleFieldChange(column, field)}
                          options={allTargetFields}
                          mappedFields={mappedFields}
                          requiredFields={suggestions.requiredFields}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(sampleData[0] && sampleData[0][column]) || "-"}
                      </TableCell>
                      <TableCell>
                        {currentField && confidence > 0 && (
                          <span className={cn("text-sm", getConfidenceColor(confidence))}>
                            {Math.round(confidence * 100)}%
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {missingRequired.length > 0 && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Required fields not mapped:</span>
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-destructive">
                {missingRequired.map((field) => (
                  <li key={field}>{FIELD_LABELS[field] || field}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {sampleData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Data (First 3 Rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.slice(0, 3).map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap">
                          {row[col] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!isValid || isLoading}>
          {isLoading ? "Processing..." : "Confirm & Start Import"}
        </Button>
      </div>
    </div>
  );
}

interface FieldSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  mappedFields: Set<string>;
  requiredFields: string[];
}

function FieldSelect({
  value,
  onChange,
  options,
  mappedFields,
  requiredFields,
}: FieldSelectProps) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        !value && "text-muted-foreground"
      )}
    >
      <option value="">-- Skip this column --</option>
      {options.map((field) => {
        const isRequired = requiredFields.includes(field);
        const isUsed = mappedFields.has(field) && field !== value;

        return (
          <option key={field} value={field} disabled={isUsed}>
            {FIELD_LABELS[field] || field}
            {isRequired ? " *" : ""}
            {isUsed ? " (already mapped)" : ""}
          </option>
        );
      })}
    </select>
  );
}

export default FieldMapping;
