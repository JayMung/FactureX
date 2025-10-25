import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, TrendingUp } from 'lucide-react';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { cn } from '@/lib/utils';

interface TopActiveUsersProps {
  className?: string;
  limit?: number;
}

interface UserActivity {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  activityCount: number;
  lastActivity: string;
}

const TopActiveUsers: React.FC<TopActiveUsersProps> = ({ 
  className,
  limit = 5 
}) => {
  const { activities } = useRealTimeActivity(100);

  // Calculer les utilisateurs les plus actifs
  const topUsers = useMemo(() => {
    const userActivityMap = new Map<string, UserActivity>();

    activities.forEach(activity => {
      if (!activity.user_id || !activity.user) return;

      const user = activity.user as any;
      const existing = userActivityMap.get(activity.user_id);

      if (existing) {
        existing.activityCount += 1;
        if (new Date(activity.created_at) > new Date(existing.lastActivity)) {
          existing.lastActivity = activity.created_at;
        }
      } else {
        userActivityMap.set(activity.user_id, {
          userId: activity.user_id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          activityCount: 1,
          lastActivity: activity.created_at
        });
      }
    });

    return Array.from(userActivityMap.values())
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, limit);
  }, [activities, limit]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500'
    ];
    return colors[index % colors.length];
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffMs / 86400000);
    return `Il y a ${diffDays}j`;
  };

  if (topUsers.length === 0) {
    return (
      <Card className={cn("animate-in fade-in duration-300", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Utilisateurs Actifs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune activité récente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("animate-in fade-in duration-300", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Top Utilisateurs Actifs</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {topUsers.length} utilisateur{topUsers.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div 
              key={user.userId} 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Ranking badge */}
              <div className="flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                  index === 0 && "bg-yellow-500",
                  index === 1 && "bg-gray-400",
                  index === 2 && "bg-orange-600",
                  index > 2 && "bg-gray-300"
                )}>
                  {index + 1}
                </div>
              </div>

              {/* Avatar */}
              <Avatar className={getAvatarColor(index)}>
                <AvatarFallback className="text-white">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                  <span className="text-xs text-gray-400">•</span>
                  <p className="text-xs text-gray-400">
                    {formatRelativeTime(user.lastActivity)}
                  </p>
                </div>
              </div>

              {/* Activity count */}
              <div className="flex-shrink-0 text-right">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-semibold",
                    index === 0 && "bg-yellow-50 text-yellow-700 border-yellow-200",
                    index === 1 && "bg-gray-50 text-gray-700 border-gray-200",
                    index === 2 && "bg-orange-50 text-orange-700 border-orange-200"
                  )}
                >
                  {user.activityCount} {user.activityCount === 1 ? 'action' : 'actions'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopActiveUsers;
