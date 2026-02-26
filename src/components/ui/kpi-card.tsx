import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  className?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, icon: Icon, iconColor, iconBg, className, loading }: KpiCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-2xl p-4 md:p-5 border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-xl p-2.5" style={{ background: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded mb-1" />
      ) : (
        <p className="text-2xl md:text-3xl font-bold text-foreground truncate tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-xs md:text-sm text-muted-foreground font-medium">{title}</p>
    </div>
  );
}
