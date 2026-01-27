// T032, T079: App layout with sidebar navigation and impersonation banner
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ImpersonationBanner } from "@/components/admin/layout/ImpersonationBanner";
import { cn } from "@/lib/utils";

interface ImpersonationData {
  isImpersonating: boolean;
  targetUserName?: string;
  targetUserEmail?: string;
  organizationName?: string;
  startedAt?: string;
  expiresAt?: string;
  sessionId?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const router = useRouter();

  // Check for impersonation cookie on mount
  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch("/api/admin/impersonation/status");
        if (response.ok) {
          const data = await response.json();
          setImpersonation(data);
        }
      } catch (error) {
        // Not impersonating or error - silently ignore
        console.debug("No impersonation context:", error);
      }
    };

    checkImpersonation();
  }, []);

  // Handle ending impersonation session
  const handleEndImpersonation = useCallback(async () => {
    setIsEndingSession(true);
    try {
      const response = await fetch("/api/admin/impersonation/end", {
        method: "POST",
      });

      if (response.ok) {
        setImpersonation(null);
        // Redirect back to admin dashboard
        router.push("/admin");
      }
    } catch (error) {
      console.error("Failed to end impersonation:", error);
    } finally {
      setIsEndingSession(false);
    }
  }, [router]);

  const isImpersonating = impersonation?.isImpersonating ?? false;

  return (
    <div className="flex h-screen bg-background">
      {/* T079: Impersonation Banner - shown at top when impersonating */}
      {isImpersonating && impersonation && (
        <ImpersonationBanner
          targetUserName={impersonation.targetUserName ?? ""}
          targetUserEmail={impersonation.targetUserEmail ?? ""}
          organizationName={impersonation.organizationName ?? ""}
          startedAt={new Date(impersonation.startedAt ?? Date.now())}
          expiresAt={new Date(impersonation.expiresAt ?? Date.now())}
          onEndSession={handleEndImpersonation}
          isEnding={isEndingSession}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page content - add top padding when impersonation banner is shown */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-6",
            "transition-all duration-200",
            isImpersonating && "pt-20 md:pt-16" // Extra padding for banner
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
