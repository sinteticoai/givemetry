// T033: Admin Sidebar Component
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  BarChart3,
  ScrollText,
  Flag,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AdminSession } from "./AdminLayoutClient";

interface AdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AdminSession;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "super_admin" | "support";
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit",
    icon: ScrollText,
  },
  {
    label: "Feature Flags",
    href: "/admin/feature-flags",
    icon: Flag,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar({ open, onOpenChange, session }: AdminSidebarProps) {
  const pathname = usePathname();

  // Filter nav items based on role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (session.role === "super_admin") return true;
    return item.requiredRole === session.role;
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.025em' }}>GiveMetry</span>
            <span className="text-sm text-muted-foreground">Admin</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            <p>Logged in as {session.role === "super_admin" ? "Super Admin" : "Support"}</p>
            <p className="truncate">{session.email}</p>
          </div>
        </div>
      </aside>

      {/* Desktop collapse button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpenChange(!open)}
        className="fixed bottom-4 left-4 z-40 hidden lg:flex"
      >
        {open ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
