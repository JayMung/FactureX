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
      <div className={cn("bg-card p-6 rounded-2xl border border-border shadow-sm", className)}>
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;
  
  const TrendIcon = trend
    ? isPositive
      ? TrendingUp
      : isNegative
        ? TrendingDown
        : Minus
    : null;

  // Déterminer la couleur de fond de l'icône — utilise primary/10 par défaut
  let iconBgClass = "bg-primary/10";

  return (
    <div className={cn("bg-card p-6 rounded-2xl border border-border shadow-sm transition-all hover:shadow-md", className)}>
      <div className="flex justify-between items-start mb-4">
        {Icon && (
          <div className={cn("p-2 rounded-lg", iconBgClass)}>
            <Icon className={cn("h-6 w-6", iconColor)} aria-hidden="true" />
          </div>
        )}
        
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1",
            isPositive ? "text-success bg-success/10" : 
            isNegative ? "text-destructive bg-destructive/10" : 
            "text-muted-foreground bg-muted"
          )}>
            {isPositive ? "+" : ""}{trend.value}%
            {trend.label && <span className="font-normal opacity-80 ml-1 hidden sm:inline">{trend.label}</span>}
          </span>
        )}
        {!trend && subtitle && (
           <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
             {subtitle}
           </span>
        )}
      </div>
      
      <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export { StatCard };
