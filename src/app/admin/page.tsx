// T034: Admin Dashboard Overview Page
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";

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
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </a>
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

      {/* Stats grid - fetches real data */}
      <DashboardStats />

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}
