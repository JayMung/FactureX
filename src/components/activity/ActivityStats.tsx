import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Plus, 
  Edit, 
  Trash2,
  Users,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityStatsProps {
  activities: any[];
  className?: string;
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const ActivityStats: React.FC<ActivityStatsProps> = ({ 
  activities,
  className 
}) => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Activités aujourd'hui
    const todayActivities = activities.filter(a => 
      new Date(a.created_at) >= today
    );

    // Activités hier
    const yesterdayActivities = activities.filter(a => {
      const activityDate = new Date(a.created_at);
      return activityDate >= yesterday && activityDate < today;
    });

    // Calcul des tendances
    const todayCount = todayActivities.length;
    const yesterdayCount = yesterdayActivities.length;
    const dailyTrend = yesterdayCount > 0 
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
      : todayCount > 0 ? 100 : 0;

    // Statistiques par type
    const creations = activities.filter(a => a.action.includes('Création')).length;
    const modifications = activities.filter(a => a.action.includes('Modification')).length;
    const deletions = activities.filter(a => a.action.includes('Suppression')).length;
    const uniqueUsers = new Set(activities.map(a => a.user_id)).size;

    // Activité moyenne par heure (dernières 24h)
    const avgPerHour = todayActivities.length > 0 
      ? (todayActivities.length / 24).toFixed(1) 
      : '0';

    const statItems: StatItem[] = [
      {
        label: "Total Activités",
        value: activities.length,
        icon: <Activity className="h-5 w-5" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        trend: {
          value: Math.abs(dailyTrend),
          isPositive: dailyTrend >= 0
        }
      },
      {
        label: "Aujourd'hui",
        value: todayCount,
        icon: <Clock className="h-5 w-5" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
        trend: {
          value: Math.abs(dailyTrend),
          isPositive: dailyTrend >= 0
        }
      },
      {
        label: "Créations",
        value: creations,
        icon: <Plus className="h-5 w-5" />,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50"
      },
      {
        label: "Modifications",
        value: modifications,
        icon: <Edit className="h-5 w-5" />,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50"
      },
      {
        label: "Suppressions",
        value: deletions,
        icon: <Trash2 className="h-5 w-5" />,
        color: "text-red-600",
        bgColor: "bg-red-50"
      },
      {
        label: "Utilisateurs Actifs",
        value: uniqueUsers,
        icon: <Users className="h-5 w-5" />,
        color: "text-purple-600",
        bgColor: "bg-purple-50"
      }
    ];

    return { statItems, avgPerHour };
  }, [activities]);

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
      {stats.statItems.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <div className="flex items-baseline space-x-2">
                  <p className={cn("text-2xl font-bold", stat.color)}>
                    {stat.value}
                  </p>
                  {stat.trend && (
                    <div className={cn(
                      "flex items-center text-xs font-medium",
                      stat.trend.isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {stat.trend.isPositive ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {stat.trend.value.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex-shrink-0 p-2 rounded-lg",
                stat.bgColor,
                stat.color
              )}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActivityStats;
