// T043: Organization Detail Tabs Component
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import {
  Building2,
  Users,
  Activity,
  Settings,
  BarChart2,
  Calendar,
  Mail,
  Shield,
} from "lucide-react";
import type { OrgStatus, UserRole } from "@prisma/client";

interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLoginAt: Date | null;
  isDisabled: boolean;
}

interface ActivityItem {
  id: string;
  action: string;
  userId: string | null;
  userName: string | null;
  createdAt: Date;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  planExpiresAt: Date | null;
  status: OrgStatus;
  usersCount: number;
  constituentsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  deletedAt: Date | null;
  settings: Record<string, unknown>;
  usageLimits: Record<string, number>;
  features: Record<string, boolean>;
  users: OrganizationUser[];
  recentActivity: ActivityItem[];
}

interface OrganizationDetailTabsProps {
  organization: OrganizationDetail;
  onUserClick?: (userId: string) => void;
}

const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "-";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
};

const formatShortDate = (date: Date | null | undefined): string => {
  if (!date) return "-";
  return format(new Date(date), "MMM d, yyyy");
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  gift_officer: "Gift Officer",
  viewer: "Viewer",
};

const actionLabels: Record<string, string> = {
  "user.login": "User logged in",
  "user.logout": "User logged out",
  "constituent.create": "Created constituent",
  "constituent.update": "Updated constituent",
  "gift.create": "Added gift",
  "contact.create": "Logged contact",
  "upload.complete": "Completed upload",
  "brief.generate": "Generated brief",
};

export function OrganizationDetailTabs({
  organization,
  onUserClick
}: OrganizationDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview" className="gap-2">
          <Building2 className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-2">
          <Users className="h-4 w-4" />
          Users ({organization.usersCount})
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="h-4 w-4" />
          Activity
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization.usersCount}</div>
              {organization.usageLimits.maxUsers && (
                <p className="text-xs text-muted-foreground">
                  of {organization.usageLimits.maxUsers} limit
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Constituents</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization.constituentsCount.toLocaleString()}</div>
              {organization.usageLimits.maxConstituents && (
                <p className="text-xs text-muted-foreground">
                  of {organization.usageLimits.maxConstituents.toLocaleString()} limit
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{organization.plan || "None"}</div>
              {organization.planExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires: {formatShortDate(organization.planExpiresAt)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {organization.lastActivityAt
                  ? formatShortDate(organization.lastActivityAt)
                  : "No activity"
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={organization.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-sm">{organization.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(organization.createdAt)}</span>
              </div>
              {organization.suspendedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suspended</span>
                    <span>{formatDate(organization.suspendedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason</span>
                    <span className="text-right max-w-[200px]">{organization.suspendedReason}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enabled features for this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(organization.features).length > 0 ? (
                  Object.entries(organization.features).map(([key, enabled]) => (
                    <Badge
                      key={key}
                      variant={enabled ? "default" : "secondary"}
                    >
                      {key.replace(/_/g, " ")}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No custom features enabled</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Users Tab */}
      <TabsContent value="users" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization Users</CardTitle>
            <CardDescription>
              All users belonging to this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organization.users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No users in this organization
                </p>
              ) : (
                organization.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => onUserClick?.(user.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.name || "Unnamed User"}
                          {user.isDisabled && (
                            <StatusBadge status="disabled" size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{roleLabels[user.role]}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last login: {user.lastLoginAt ? formatShortDate(user.lastLoginAt) : "Never"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Activity Tab */}
      <TabsContent value="activity" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Recent actions performed within this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organization.recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                organization.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm">
                          {actionLabels[activity.action] || activity.action}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {activity.userName || "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
              <CardDescription>
                Resource limits for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(organization.usageLimits).length > 0 ? (
                  Object.entries(organization.usageLimits).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className="font-medium">{value.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No custom limits set</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Custom configuration for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(organization.settings).length > 0 ? (
                  Object.entries(organization.settings).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className="font-medium font-mono text-sm">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No custom settings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default OrganizationDetailTabs;
