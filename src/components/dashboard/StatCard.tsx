"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
  color?: string;
  borderColor?: string;
  hero?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  className,
  color,
  borderColor,
  hero = false,
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  };

  return (
    <Card className={cn("stat-card", borderColor && `border-l-4 ${borderColor}`, className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className={cn(hero ? "body-text font-medium" : "small-text font-medium")}>{title}</p>
            <p className={cn("font-bold text-foreground truncate text-mono", hero ? "heading-1" : "heading-2")}>
              {formatValue(value)}
            </p>
            {change && (
              <div className={change.isPositive ? "trend-positive" : "trend-negative"}>
                {change.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(change.value)}%</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn("flex-shrink-0", color ? `p-2.5 rounded-xl ${color}` : "text-muted-foreground")}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;