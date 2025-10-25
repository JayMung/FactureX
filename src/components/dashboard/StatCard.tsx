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
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  className 
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') {
      return val;
    }
    return val.toString();
  };

  return (
    <Card className={cn("card-base transition-shadow-hover", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {formatValue(value)}
            </p>
            {change && (
              <p className={cn(
                "text-xs font-medium flex items-center gap-1",
                change.isPositive ? "text-success" : "text-error"
              )}>
                {change.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(change.value)}% par rapport au mois dernier
              </p>
            )}
          </div>
          {icon && (
            <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;