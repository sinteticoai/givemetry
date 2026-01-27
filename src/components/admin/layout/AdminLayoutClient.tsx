// Admin Layout Client Component
"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminTRPCProvider } from "@/lib/trpc/admin-client";
import { cn } from "@/lib/utils";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "support";
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  session: AdminSession;
}

export function AdminLayoutClient({ children, session }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AdminTRPCProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <AdminSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          session={session}
        />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            session={session}
          />

          {/* Page content */}
          <main
            className={cn(
              "flex-1 overflow-y-auto p-6",
              "transition-all duration-200"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </AdminTRPCProvider>
  );
}
