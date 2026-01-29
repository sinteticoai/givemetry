// Dashboard Stats Component - fetches real data from analytics API
"use client";

import { adminTrpc } from "@/lib/trpc/admin-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Activity,
  AlertTriangle,
} from "lucide-react";

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const { data: overview, isLoading, error } = adminTrpc.analytics.overview.useQuery();
  const { data: engagement } = adminTrpc.analytics.engagement.useQuery();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Error loading stats:</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Organizations"
        value={overview?.activeOrganizations ?? 0}
        description={`${overview?.suspendedOrganizations ?? 0} suspended`}
        icon={Building2}
        isLoading={isLoading}
      />
      <StatsCard
        title="Total Users"
        value={overview?.totalUsers ?? 0}
        description={`${overview?.activeUsersLast30Days ?? 0} active last 30 days`}
        icon={Users}
        isLoading={isLoading}
      />
      <StatsCard
        title="Daily Active Users"
        value={engagement?.dailyActiveUsers ?? 0}
        description="Logged in today"
        icon={Activity}
        isLoading={isLoading}
      />
      <StatsCard
        title="Suspended Orgs"
        value={overview?.suspendedOrganizations ?? 0}
        description="Require attention"
        icon={AlertTriangle}
        isLoading={isLoading}
      />
    </div>
  );
}
