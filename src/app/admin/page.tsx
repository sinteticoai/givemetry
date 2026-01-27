// T034: Admin Dashboard Overview Page
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

// Stats card component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
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
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <TrendingUp
              className={`mr-1 h-3 w-3 ${trend.value >= 0 ? "text-green-500" : "text-red-500"}`}
            />
            <span className={trend.value >= 0 ? "text-green-500" : "text-red-500"}>
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="ml-1 text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Quick actions card
function QuickActions() {
  const actions = [
    {
      label: "View Organizations",
      href: "/admin/organizations",
      description: "Manage all tenant organizations",
    },
    {
      label: "View Users",
      href: "/admin/users",
      description: "Manage users across organizations",
    },
    {
      label: "View Audit Logs",
      href: "/admin/audit",
      description: "Review platform activity",
    },
    {
      label: "Feature Flags",
      href: "/admin/feature-flags",
      description: "Toggle platform features",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <div>
                <p className="font-medium">{action.label}</p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Recent activity card
function RecentActivity() {
  // Placeholder for recent audit log entries
  const activities = [
    {
      id: 1,
      action: "Organization created",
      target: "Acme University",
      time: "2 minutes ago",
      admin: "Admin User",
    },
    {
      id: 2,
      action: "User disabled",
      target: "john@acme.edu",
      time: "15 minutes ago",
      admin: "Support User",
    },
    {
      id: 3,
      action: "Feature flag updated",
      target: "ai_briefings",
      time: "1 hour ago",
      admin: "Admin User",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest admin actions on the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className="rounded-full bg-muted p-2">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-sm text-muted-foreground">{activity.target}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {activity.time} by {activity.admin}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and quick actions
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatsCardSkeleton />}>
          <StatsCard
            title="Total Organizations"
            value="12"
            description="Active tenants on the platform"
            icon={Building2}
            trend={{ value: 8.3, label: "from last month" }}
          />
        </Suspense>
        <Suspense fallback={<StatsCardSkeleton />}>
          <StatsCard
            title="Total Users"
            value="156"
            description="Across all organizations"
            icon={Users}
            trend={{ value: 12.5, label: "from last month" }}
          />
        </Suspense>
        <Suspense fallback={<StatsCardSkeleton />}>
          <StatsCard
            title="Active Sessions"
            value="24"
            description="Currently logged in users"
            icon={Activity}
          />
        </Suspense>
        <Suspense fallback={<StatsCardSkeleton />}>
          <StatsCard
            title="Alerts"
            value="3"
            description="Pending attention items"
            icon={AlertTriangle}
          />
        </Suspense>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}
