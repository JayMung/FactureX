import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityChartProps {
  activities: any[];
  className?: string;
}

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const ActivityChart: React.FC<ActivityChartProps> = ({ 
  activities,
  className 
}) => {
  const chartData = useMemo(() => {
    if (activities.length === 0) return [];

    // Compter les activités par type
    const typeCounts = {
      'Création': activities.filter(a => a.action.includes('Création')).length,
      'Modification': activities.filter(a => a.action.includes('Modification')).length,
      'Suppression': activities.filter(a => a.action.includes('Suppression')).length,
      'Auth': activities.filter(a => a.action.includes('Auth')).length,
      'Settings': activities.filter(a => a.action.includes('Settings') || a.action.includes('Paramètres')).length,
    };

    const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
    const maxValue = Math.max(...Object.values(typeCounts));

    const colors = {
      'Création': 'bg-green-500',
      'Modification': 'bg-yellow-500',
      'Suppression': 'bg-red-500',
      'Auth': 'bg-purple-500',
      'Settings': 'bg-blue-500'
    };

    return Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        label: type,
        value: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: colors[type as keyof typeof colors],
        heightPercentage: maxValue > 0 ? (count / maxValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [activities]);

  // Calculer les activités par jour (7 derniers jours)
  const dailyData = useMemo(() => {
    const days = 7;
    const now = new Date();
    const dailyCounts: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = activities.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= date && activityDate < nextDate;
      }).length;

      dailyCounts.push({
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        count
      });
    }

    const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);
    return dailyCounts.map(d => ({
      ...d,
      heightPercentage: (d.count / maxCount) * 100
    }));
  }, [activities]);

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Distribution par type */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Distribution par Type</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {chartData.length} types
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{item.value}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", item.color)}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activités par jour (7 derniers jours) */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>7 Derniers Jours</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {dailyData.reduce((sum, d) => sum + d.count, 0)} activités
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between space-x-2 h-48">
            {dailyData.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full flex items-end justify-center h-40">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500 cursor-pointer group relative"
                    style={{ height: `${day.heightPercentage}%` }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge variant="default" className="text-xs whitespace-nowrap">
                        {day.count} {day.count === 1 ? 'activité' : 'activités'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium">{day.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityChart;
