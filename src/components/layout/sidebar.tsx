// T033: Sidebar component
// T233: Alerts badge in sidebar navigation
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  AlertTriangle,
  Bell,
  FileText,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Donors", href: "/donors", icon: Users },
  { name: "Priorities", href: "/priorities", icon: TrendingUp },
  { name: "Lapse Risk", href: "/lapse-risk", icon: AlertTriangle },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Uploads", href: "/uploads", icon: Upload },
];

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();

  // Fetch alert counts for badge
  const { data: alertCounts } = trpc.alert.counts.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card transition-all duration-200",
        open ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            G
          </div>
          {open && (
            <span className="text-lg font-semibold">GiveMetry</span><span className="ml-px inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">AI</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isAlerts = item.name === "Alerts";
          const activeAlertCount = alertCounts?.active ?? 0;
          const highAlertCount = alertCounts?.high ?? 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isAlerts && activeAlertCount > 0 && !open && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                      highAlertCount > 0 ? "bg-red-500" : "bg-yellow-500"
                    )}
                  />
                )}
              </div>
              {open && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {isAlerts && activeAlertCount > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "default"}
                      className={cn(
                        "ml-auto h-5 px-1.5 text-xs",
                        !isActive && highAlertCount > 0 && "bg-red-500 hover:bg-red-600"
                      )}
                    >
                      {activeAlertCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="border-t p-2">
        {bottomNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {open && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
        onClick={() => onOpenChange(!open)}
      >
        {open ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </aside>
  );
}
