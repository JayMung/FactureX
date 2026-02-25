import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "./skeleton";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  subtitle,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("stat-card", className)}>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null;

  const trendClass = trend
    ? trend.value > 0
      ? "trend-positive"
      : trend.value < 0
        ? "trend-negative"
        : "trend-neutral"
    : "";

  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10", iconColor.includes("text-") ? "" : "")}>
            <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {trend && TrendIcon && (
          <span className={trendClass}>
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {Math.abs(trend.value)}%
          </span>
        )}
        {(subtitle || trend?.label) && (
          <span className="text-xs text-muted-foreground">{trend?.label || subtitle}</span>
        )}
      </div>
    </div>
  );
}

export { StatCard };
