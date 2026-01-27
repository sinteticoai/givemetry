// T078: Impersonation Banner Component
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeOff, Clock, AlertTriangle, X } from "lucide-react";

interface ImpersonationBannerProps {
  targetUserName: string;
  targetUserEmail: string;
  organizationName: string;
  startedAt: Date; // Passed for future features (showing session duration)
  expiresAt: Date;
  onEndSession: () => void;
  isEnding?: boolean;
}

export function ImpersonationBanner({
  targetUserName,
  targetUserEmail,
  organizationName,
  startedAt: _startedAt, // Unused but part of API for future features
  expiresAt,
  onEndSession,
  isEnding = false,
}: ImpersonationBannerProps) {
  const [remainingTime, setRemainingTime] = useState<string>("");
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const updateRemainingTime = () => {
      const now = new Date();
      const remaining = expiresAt.getTime() - now.getTime();

      if (remaining <= 0) {
        setRemainingTime("Expired");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      // Warning when less than 10 minutes remaining
      setIsExpiringSoon(minutes < 10);

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setRemainingTime(`${hours}h ${mins}m`);
      } else {
        setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    // Update immediately and then every second
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <Alert
      className={`
        fixed top-0 left-0 right-0 z-[100] rounded-none border-b-2
        ${isExpiringSoon ? "bg-orange-100 border-orange-500" : "bg-red-100 border-red-500"}
        shadow-lg
      `}
    >
      <div className="container mx-auto flex items-center justify-between py-2">
        {/* Left: Icon and info */}
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-full ${isExpiringSoon ? "bg-orange-200" : "bg-red-200"}`}
          >
            <EyeOff
              className={`h-5 w-5 ${isExpiringSoon ? "text-orange-700" : "text-red-700"}`}
            />
          </div>

          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm">
            <span className="font-semibold text-gray-900">
              Impersonating:
            </span>
            <span className="text-gray-800">
              {targetUserName || targetUserEmail}
            </span>
            <span className="hidden sm:inline text-gray-500">|</span>
            <span className="text-gray-600 text-xs sm:text-sm">
              {organizationName}
            </span>
          </AlertDescription>
        </div>

        {/* Center: Time remaining */}
        <div
          className={`
            hidden md:flex items-center gap-2 px-3 py-1 rounded-full
            ${isExpiringSoon ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800"}
          `}
        >
          {isExpiringSoon ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span className="text-sm font-mono font-medium">
            {remainingTime}
          </span>
          <span className="text-xs">remaining</span>
        </div>

        {/* Right: End session button */}
        <Button
          onClick={onEndSession}
          disabled={isEnding}
          variant="destructive"
          size="sm"
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isEnding ? "Ending..." : "End Session"}
          </span>
        </Button>
      </div>

      {/* Mobile time remaining */}
      <div className="md:hidden flex justify-center pb-2">
        <div
          className={`
            inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs
            ${isExpiringSoon ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800"}
          `}
        >
          {isExpiringSoon ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          <span className="font-mono font-medium">{remainingTime}</span>
          <span>remaining</span>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Wrapper component that fetches impersonation status from cookie/API
 * This component is used in the tenant app layout
 */
interface ImpersonationBannerWrapperProps {
  impersonationData: {
    isImpersonating: boolean;
    targetUserName?: string;
    targetUserEmail?: string;
    organizationName?: string;
    startedAt?: string;
    expiresAt?: string;
  } | null;
  onEndSession: () => Promise<void>;
}

export function ImpersonationBannerWrapper({
  impersonationData,
  onEndSession,
}: ImpersonationBannerWrapperProps) {
  const [isEnding, setIsEnding] = useState(false);

  if (!impersonationData?.isImpersonating) {
    return null;
  }

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await onEndSession();
      // Redirect or refresh will happen from parent
    } catch (error) {
      console.error("Failed to end impersonation session:", error);
      setIsEnding(false);
    }
  };

  return (
    <ImpersonationBanner
      targetUserName={impersonationData.targetUserName ?? ""}
      targetUserEmail={impersonationData.targetUserEmail ?? ""}
      organizationName={impersonationData.organizationName ?? ""}
      startedAt={new Date(impersonationData.startedAt ?? Date.now())}
      expiresAt={new Date(impersonationData.expiresAt ?? Date.now())}
      onEndSession={handleEndSession}
      isEnding={isEnding}
    />
  );
}
