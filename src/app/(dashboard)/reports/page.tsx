// T214, T219: Reports page with list, generation, scheduling, and preview
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportList } from "@/components/reports/report-list";
import { GenerateReportDialog } from "@/components/reports/generate-report-dialog";
import { ScheduleReportDialog } from "@/components/reports/schedule-report-dialog";
import { ReportPreview } from "@/components/reports/report-preview";
import {
  Plus,
  Calendar,
  FileText,
  Clock,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export default function ReportsPage() {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: schedules, isLoading: schedulesLoading } =
    trpc.report.getSchedules.useQuery();

  const cancelScheduleMutation = trpc.report.cancelSchedule.useMutation({
    onSuccess: () => {
      utils.report.getSchedules.invalidate();
    },
  });

  const handleViewReport = (reportId: string) => {
    setPreviewReportId(reportId);
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    if (confirm("Are you sure you want to cancel this scheduled report?")) {
      await cancelScheduleMutation.mutateAsync({ id: scheduleId });
    }
  };

  const formatCron = (cron: string | null): string => {
    if (!cron) return "Unknown";

    // Simple cron to human readable
    const parts = cron.split(" ");
    if (parts.length !== 5) return cron;

    const [, hour, dayOfMonth, , dayOfWeek] = parts;

    const timeStr = `${hour}:00`;

    if (dayOfWeek === "1") return `Weekly (Monday) at ${timeStr}`;
    if (dayOfWeek === "5") return `Weekly (Friday) at ${timeStr}`;
    if (dayOfMonth === "1") return `Monthly (1st) at ${timeStr}`;
    if (dayOfMonth === "1,15") return `Bi-weekly at ${timeStr}`;

    return `${timeStr}`;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and schedule executive reports for your portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedules
            {schedules && schedules.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {schedules.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <ReportList onViewReport={handleViewReport} />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          {schedulesLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading schedules...
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No scheduled reports</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set up automatic report generation on a recurring schedule.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{schedule.title}</CardTitle>
                        <CardDescription>
                          {schedule.reportType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Report
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleCancelSchedule(schedule.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel Schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCron(schedule.scheduleCron)}</span>
                      </div>
                      {schedule.nextRunAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Next run:{" "}
                            {formatDistanceToNow(new Date(schedule.nextRunAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                      {schedule.lastRunAt && (
                        <div className="text-muted-foreground">
                          Last run:{" "}
                          {formatDistanceToNow(new Date(schedule.lastRunAt), {
                            addSuffix: true,
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      <GenerateReportDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handleViewReport}
      />

      {/* Schedule Report Dialog */}
      <ScheduleReportDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />

      {/* Report Preview Dialog */}
      <Dialog
        open={!!previewReportId}
        onOpenChange={(open) => !open && setPreviewReportId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          {previewReportId && <ReportPreview reportId={previewReportId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
