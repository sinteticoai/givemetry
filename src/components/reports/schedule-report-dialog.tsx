// T217: Schedule report dialog
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar, Clock } from "lucide-react";

interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ReportType = "executive" | "portfolio" | "lapse_risk" | "priorities";

const REPORT_TYPES = [
  { value: "executive", label: "Executive Summary" },
  { value: "portfolio", label: "Portfolio Health" },
  { value: "lapse_risk", label: "Lapse Risk" },
  { value: "priorities", label: "Priorities" },
];

const SCHEDULE_OPTIONS = [
  { value: "weekly-monday", label: "Weekly (Monday)", cron: "0 9 * * 1" },
  { value: "weekly-friday", label: "Weekly (Friday)", cron: "0 9 * * 5" },
  { value: "biweekly", label: "Bi-weekly (Monday)", cron: "0 9 1,15 * *" },
  { value: "monthly-first", label: "Monthly (1st)", cron: "0 9 1 * *" },
  { value: "monthly-last", label: "Monthly (last weekday)", cron: "0 9 L * 1-5" },
  { value: "quarterly", label: "Quarterly", cron: "0 9 1 1,4,7,10 *" },
];

const TIME_OPTIONS = [
  { value: "8", label: "8:00 AM" },
  { value: "9", label: "9:00 AM" },
  { value: "10", label: "10:00 AM" },
  { value: "12", label: "12:00 PM" },
  { value: "14", label: "2:00 PM" },
  { value: "17", label: "5:00 PM" },
];

export function ScheduleReportDialog({
  open,
  onOpenChange,
  onSuccess,
}: ScheduleReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("weekly-monday");
  const [time, setTime] = useState("9");
  const [recipients, setRecipients] = useState("");

  const utils = trpc.useUtils();

  const scheduleMutation = trpc.report.schedule.useMutation({
    onSuccess: () => {
      utils.report.getSchedules.invalidate();
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    },
  });

  const resetForm = () => {
    setReportType("executive");
    setTitle("");
    setSchedule("weekly-monday");
    setTime("9");
    setRecipients("");
  };

  const handleSchedule = async () => {
    const selectedSchedule = SCHEDULE_OPTIONS.find((s) => s.value === schedule);
    if (!selectedSchedule) return;

    // Adjust cron for selected time
    let cron = selectedSchedule.cron;
    const cronParts = cron.split(" ");
    cronParts[1] = time;
    cron = cronParts.join(" ");

    const reportTitle =
      title ||
      `Scheduled ${REPORT_TYPES.find((t) => t.value === reportType)?.label}`;

    // Parse recipients
    const recipientList = recipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    await scheduleMutation.mutateAsync({
      reportType,
      title: reportTitle,
      cron,
      recipients: recipientList.length > 0 ? recipientList : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Report
          </DialogTitle>
          <DialogDescription>
            Set up automatic report generation on a recurring schedule.
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
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Report Title</Label>
            <Input
              id="title"
              placeholder={`Scheduled ${REPORT_TYPES.find((t) => t.value === reportType)?.label}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Schedule */}
          <div className="grid gap-2">
            <Label>Schedule</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delivery Time
            </Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div className="grid gap-2">
            <Label htmlFor="recipients">
              Email Recipients (optional)
            </Label>
            <Input
              id="recipients"
              placeholder="email1@org.com, email2@org.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas. Leave empty to generate without emailing.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Create Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
