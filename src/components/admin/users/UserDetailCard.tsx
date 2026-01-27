// T067: User Detail Card Component
"use client";

import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@prisma/client";
import {
  User,
  Building2,
  Shield,
  Calendar,
  Clock,
  AlertCircle,
  Activity,
} from "lucide-react";

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  lastLoginAt: Date | null;
  isDisabled: boolean;
  disabledAt: Date | null;
  disabledReason: string | null;
  createdAt: Date;
  recentActions: Array<{
    id: string;
    action: string;
    resourceType: string | null;
    createdAt: Date;
  }>;
  loginHistory: Array<{
    timestamp: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
}

interface UserDetailCardProps {
  user: UserDetail;
  onOrgClick?: (orgId: string) => void;
}

const formatDateTime = (date: Date | null | undefined): string => {
  if (!date) return "Never";
  return format(new Date(date), "MMM d, yyyy h:mm a");
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(new Date(date), "MMM d");
};

const formatRole = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    admin: "Admin",
    manager: "Manager",
    gift_officer: "Gift Officer",
    viewer: "Viewer",
  };
  return roleMap[role] || role;
};

const formatAction = (action: string): string => {
  // Convert action strings like "constituent.view" to "Viewed Constituent"
  const parts = action.split(".");
  const resource = parts[0] || action;
  const verb = parts[1];

  const verbMap: Record<string, string> = {
    view: "Viewed",
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Logged in",
    logout: "Logged out",
  };
  const resourceMap: Record<string, string> = {
    constituent: "Constituent",
    gift: "Gift",
    contact: "Contact",
    user: "User",
    analysis: "Analysis",
  };

  const formattedVerb = verb ? (verbMap[verb] || verb) : "";
  const formattedResource = resourceMap[resource] || resource;

  return formattedVerb ? `${formattedVerb} ${formattedResource}` : formattedResource;
};

export function UserDetailCard({ user, onOrgClick }: UserDetailCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>Basic user details and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-lg font-semibold">{user.name || "(No name)"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Organization
              </label>
              <p
                className={onOrgClick ? "text-lg text-primary cursor-pointer hover:underline" : "text-lg"}
                onClick={() => onOrgClick?.(user.organizationId)}
              >
                {user.organizationName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Role
              </label>
              <Badge variant="secondary" className="mt-1">
                {formatRole(user.role)}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created
              </label>
              <p className="text-sm">{formatDateTime(user.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last Login
              </label>
              <p className="text-sm">{formatDateTime(user.lastLoginAt)}</p>
            </div>
          </div>

          {/* Status Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={user.isDisabled ? "disabled" : "active"} />
              {user.isDisabled && user.disabledAt && (
                <span className="text-sm text-muted-foreground">
                  Disabled {formatRelativeTime(user.disabledAt)}
                </span>
              )}
            </div>
            {user.isDisabled && user.disabledReason && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Reason for disabling:</p>
                  <p className="text-sm text-muted-foreground">{user.disabledReason}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Last 20 actions</CardDescription>
        </CardHeader>
        <CardContent>
          {user.recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {user.recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <span className="truncate pr-2">{formatAction(action.action)}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatRelativeTime(action.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History Card */}
      {user.loginHistory.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Login History</CardTitle>
            <CardDescription>Recent login sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.loginHistory.map((login, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <span>{formatDateTime(login.timestamp)}</span>
                    {login.ipAddress && (
                      <span className="text-muted-foreground">IP: {login.ipAddress}</span>
                    )}
                  </div>
                  {login.userAgent && (
                    <span className="text-muted-foreground text-xs truncate max-w-xs">
                      {login.userAgent}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserDetailCard;
