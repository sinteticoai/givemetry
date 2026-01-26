// T110: Health score card component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  score: number;
  title?: string;
  subtitle?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-yellow-500";
  if (score >= 0.4) return "text-orange-500";
  return "text-red-500";
}

function getScoreGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

function getScoreDescription(score: number): string {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.8) return "Good";
  if (score >= 0.7) return "Fair";
  if (score >= 0.6) return "Needs work";
  return "Poor";
}

function getScoreRingColor(score: number): string {
  if (score >= 0.8) return "stroke-green-500";
  if (score >= 0.6) return "stroke-yellow-500";
  if (score >= 0.4) return "stroke-orange-500";
  return "stroke-red-500";
}

export function HealthScoreCard({
  score,
  title = "Data Health",
  subtitle = "Overall data quality score",
  className,
  size = "md",
}: HealthScoreCardProps) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score * circumference);

  const sizeClasses = {
    sm: { card: "p-4", circle: "w-24 h-24", text: "text-2xl" },
    md: { card: "p-6", circle: "w-32 h-32", text: "text-3xl" },
    lg: { card: "p-8", circle: "w-40 h-40", text: "text-4xl" },
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className={cn("pb-2", size === "sm" && "pb-1")}>
        <CardTitle className={cn("text-lg", size === "sm" && "text-base")}>
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className={cn("flex flex-col items-center", sizeClasses[size].card)}>
        <div className={cn("relative", sizeClasses[size].circle)}>
          {/* Background circle */}
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn("transition-all duration-500", getScoreRingColor(score))}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-bold", sizeClasses[size].text, getScoreColor(score))}>
              {percentage}%
            </span>
            <span className="text-xs text-muted-foreground">
              Grade: {getScoreGrade(score)}
            </span>
          </div>
        </div>
        <p className={cn("mt-2 text-sm text-muted-foreground", getScoreColor(score))}>
          {getScoreDescription(score)}
        </p>
      </CardContent>
    </Card>
  );
}

export function HealthScoreCompact({
  score,
  label,
  className,
}: {
  score: number;
  label: string;
  className?: string;
}) {
  const percentage = Math.round(score * 100);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              score >= 0.8 ? "bg-green-500" :
              score >= 0.6 ? "bg-yellow-500" :
              score >= 0.4 ? "bg-orange-500" : "bg-red-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn("text-sm font-medium w-10 text-right", getScoreColor(score))}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
