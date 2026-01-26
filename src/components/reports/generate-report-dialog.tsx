// T216: Generate report customization dialog
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, BarChart, AlertTriangle, Target } from "lucide-react";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (reportId: string) => void;
}

const REPORT_TYPES = [
  {
    value: "executive",
    label: "Executive Summary",
    description: "Comprehensive overview for leadership",
    icon: FileText,
  },
  {
    value: "portfolio",
    label: "Portfolio Health",
    description: "Data quality and coverage metrics",
    icon: BarChart,
  },
  {
    value: "lapse_risk",
    label: "Lapse Risk",
    description: "Donors at risk of lapsing",
    icon: AlertTriangle,
  },
  {
    value: "priorities",
    label: "Priorities",
    description: "Top prospects and opportunities",
    icon: Target,
  },
];

const SECTIONS = [
  { value: "portfolioHealth", label: "Portfolio Health" },
  { value: "topOpportunities", label: "Top Opportunities" },
  { value: "riskAlerts", label: "Risk Alerts" },
  { value: "keyMetrics", label: "Key Metrics" },
  { value: "recommendedActions", label: "Recommended Actions" },
  { value: "portfolioBalance", label: "Portfolio Balance" },
];

type ReportType = "executive" | "portfolio" | "lapse_risk" | "priorities";
type SectionType = "portfolioHealth" | "topOpportunities" | "riskAlerts" | "keyMetrics" | "recommendedActions" | "portfolioBalance";

export function GenerateReportDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<SectionType[]>([
    "portfolioHealth",
    "topOpportunities",
    "riskAlerts",
    "keyMetrics",
    "recommendedActions",
    "portfolioBalance",
  ]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [customCommentary, setCustomCommentary] = useState("");

  const utils = trpc.useUtils();

  const generateMutation = trpc.report.generate.useMutation({
    onSuccess: (data) => {
      utils.report.list.invalidate();
      onOpenChange(false);
      onSuccess?.(data.id);
      resetForm();
    },
  });

  const resetForm = () => {
    setReportType("executive");
    setTitle("");
    setSections([
      "portfolioHealth",
      "topOpportunities",
      "riskAlerts",
      "keyMetrics",
      "recommendedActions",
      "portfolioBalance",
    ]);
    setIncludeCharts(true);
    setIncludeRecommendations(true);
    setCustomCommentary("");
  };

  const handleGenerate = async () => {
    const reportTitle =
      title ||
      `${REPORT_TYPES.find((t) => t.value === reportType)?.label} - ${new Date().toLocaleDateString()}`;

    await generateMutation.mutateAsync({
      reportType,
      title: reportTitle,
      sections,
      parameters: {
        includeCharts,
        includeRecommendations,
      },
      customCommentary: customCommentary || undefined,
    });
  };

  const toggleSection = (section: SectionType) => {
    setSections((current) =>
      current.includes(section)
        ? current.filter((s) => s !== section)
        : [...current, section]
    );
  };

  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);
  const TypeIcon = selectedType?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Create a new executive report with customized sections and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Report Type */}
          <div className="grid gap-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Report Title (optional)</Label>
            <Input
              id="title"
              placeholder={`${selectedType?.label} - ${new Date().toLocaleDateString()}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Sections */}
          <div className="grid gap-2">
            <Label>Include Sections</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map((section) => (
                <div
                  key={section.value}
                  className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                    sections.includes(section.value as SectionType)
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  }`}
                  onClick={() => toggleSection(section.value as SectionType)}
                >
                  <span className="text-sm">{section.label}</span>
                  <Switch
                    checked={sections.includes(section.value as SectionType)}
                    onCheckedChange={() => toggleSection(section.value as SectionType)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Charts</Label>
                <p className="text-sm text-muted-foreground">
                  Add visual charts and graphs
                </p>
              </div>
              <Switch
                checked={includeCharts}
                onCheckedChange={setIncludeCharts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include AI Recommendations</Label>
                <p className="text-sm text-muted-foreground">
                  Add action recommendations
                </p>
              </div>
              <Switch
                checked={includeRecommendations}
                onCheckedChange={setIncludeRecommendations}
              />
            </div>
          </div>

          {/* Commentary */}
          <div className="grid gap-2">
            <Label htmlFor="commentary">Custom Commentary (optional)</Label>
            <Textarea
              id="commentary"
              placeholder="Add any additional notes or context for this report..."
              value={customCommentary}
              onChange={(e) => setCustomCommentary(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || sections.length === 0}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
