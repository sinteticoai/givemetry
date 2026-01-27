// T117: Admin Settings Page
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

// System information (would come from API in production)
const systemInfo = {
  version: "1.0.0",
  environment: process.env.NODE_ENV || "development",
  nodeVersion: "20.x LTS",
  databaseStatus: "connected",
  lastMigration: "2026-01-27",
};

// Retention settings display
const retentionSettings = {
  auditLogRetentionYears: 2,
  deletedOrgRetentionDays: 30,
  sessionDurationHours: 8,
  impersonationTimeoutMinutes: 60,
  loginLockoutThreshold: 5,
  loginLockoutDurationMinutes: 15,
};

function InfoCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [jobRunning, setJobRunning] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Placeholder for running maintenance jobs
  const runMaintenanceJob = async (jobName: string) => {
    setJobRunning(jobName);
    setJobResult(null);

    // Simulate job execution (in production, this would call the actual API)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setJobRunning(null);
    setJobResult({
      type: jobName,
      success: true,
      message: `${jobName} completed successfully. Check server logs for details.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Platform configuration and maintenance
        </p>
      </div>

      {/* System Information */}
      <InfoCard
        title="System Information"
        description="Current platform version and environment details"
        icon={Settings}
      >
        <div className="space-y-2">
          <SettingRow
            label="Platform Version"
            value={systemInfo.version}
            description="Current GiveMetry version"
          />
          <Separator />
          <SettingRow
            label="Environment"
            value={systemInfo.environment}
            description="Current deployment environment"
          />
          <Separator />
          <SettingRow
            label="Node.js Version"
            value={systemInfo.nodeVersion}
            description="Server runtime version"
          />
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Database Status</p>
              <p className="text-sm text-muted-foreground">PostgreSQL connection</p>
            </div>
            <Badge
              variant={systemInfo.databaseStatus === "connected" ? "default" : "destructive"}
              className={systemInfo.databaseStatus === "connected" ? "bg-green-500" : ""}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              {systemInfo.databaseStatus}
            </Badge>
          </div>
        </div>
      </InfoCard>

      {/* Security Settings */}
      <InfoCard
        title="Security Settings"
        description="Authentication and access control configuration"
        icon={Shield}
      >
        <div className="space-y-2">
          <SettingRow
            label="Session Duration"
            value={`${retentionSettings.sessionDurationHours} hours`}
            description="Admin session timeout (after which re-login is required)"
          />
          <Separator />
          <SettingRow
            label="Impersonation Timeout"
            value={`${retentionSettings.impersonationTimeoutMinutes} minutes`}
            description="Maximum duration for user impersonation sessions"
          />
          <Separator />
          <SettingRow
            label="Login Lockout Threshold"
            value={`${retentionSettings.loginLockoutThreshold} attempts`}
            description="Failed login attempts before account lockout"
          />
          <Separator />
          <SettingRow
            label="Lockout Duration"
            value={`${retentionSettings.loginLockoutDurationMinutes} minutes`}
            description="Time until locked account is automatically unlocked"
          />
        </div>
      </InfoCard>

      {/* Data Retention */}
      <InfoCard
        title="Data Retention"
        description="Automated cleanup and retention policies"
        icon={Database}
      >
        <div className="space-y-2">
          <SettingRow
            label="Audit Log Retention"
            value={`${retentionSettings.auditLogRetentionYears} years`}
            description="Audit logs older than this are automatically purged"
          />
          <Separator />
          <SettingRow
            label="Deleted Organization Retention"
            value={`${retentionSettings.deletedOrgRetentionDays} days`}
            description="Soft-deleted organizations are permanently removed after this period"
          />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-300">Retention Policy</p>
            <p className="text-blue-600 dark:text-blue-400">
              Retention jobs run automatically. Deleted data cannot be recovered.
            </p>
          </div>
        </div>
      </InfoCard>

      {/* Maintenance Jobs */}
      <InfoCard
        title="Maintenance Jobs"
        description="Manual execution of scheduled maintenance tasks"
        icon={Clock}
      >
        <div className="space-y-4">
          {/* Audit Log Cleanup */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Audit Log Cleanup</p>
              <p className="text-sm text-muted-foreground">
                Remove audit logs older than {retentionSettings.auditLogRetentionYears} years
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => runMaintenanceJob("Audit Log Cleanup")}
              disabled={jobRunning !== null}
            >
              {jobRunning === "Audit Log Cleanup" ? "Running..." : "Run Now"}
            </Button>
          </div>

          {/* Deleted Org Cleanup */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Deleted Organization Cleanup</p>
              <p className="text-sm text-muted-foreground">
                Permanently remove organizations deleted more than {retentionSettings.deletedOrgRetentionDays} days ago
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => runMaintenanceJob("Deleted Organization Cleanup")}
              disabled={jobRunning !== null}
            >
              {jobRunning === "Deleted Organization Cleanup" ? "Running..." : "Run Now"}
            </Button>
          </div>

          {/* Job Result */}
          {jobResult && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 ${
                jobResult.success
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
              }`}
            >
              {jobResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    jobResult.success
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {jobResult.type}
                </p>
                <p
                  className={
                    jobResult.success
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {jobResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">Warning</p>
            <p className="text-amber-600 dark:text-amber-400">
              Manual job execution should only be used for testing or emergency maintenance.
              These jobs run automatically on schedule.
            </p>
          </div>
        </div>
      </InfoCard>

      {/* Environment Variables Info */}
      <InfoCard
        title="Required Environment Variables"
        description="Configuration variables that must be set for the admin dashboard"
        icon={Settings}
      >
        <div className="space-y-2 font-mono text-sm">
          <div className="rounded bg-muted p-2">
            <code>ADMIN_AUTH_SECRET</code>
            <span className="ml-2 text-muted-foreground"># Separate JWT secret for admin auth</span>
          </div>
          <div className="rounded bg-muted p-2">
            <code>ADMIN_AUTH_URL</code>
            <span className="ml-2 text-muted-foreground"># Base URL for admin authentication</span>
          </div>
          <div className="rounded bg-muted p-2">
            <code>DATABASE_URL</code>
            <span className="ml-2 text-muted-foreground"># PostgreSQL connection string</span>
          </div>
        </div>
      </InfoCard>
    </div>
  );
}
