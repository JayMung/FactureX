import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  Receipt, 
  Settings, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  UserMinus,
  Key,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  className?: string;
  showViewAll?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  className,
  showViewAll = true 
}) => {
  const { activities, unreadCount, markAsRead } = useRealTimeActivity(5);

  const getActivityIcon = (action: string, entity: string) => {
    // Icons basés sur le type d'action et d'entité
    if (action.includes('Création') || action.includes('créé')) {
      if (entity === 'Client') return <Users className="h-4 w-4 text-green-600" />;
      if (entity === 'Transaction') return <Receipt className="h-4 w-4 text-blue-600" />;
      return <Plus className="h-4 w-4 text-emerald-600" />;
    }
    
    if (action.includes('Modification') || action.includes('modifié')) {
      if (entity === 'Client') return <Edit className="h-4 w-4 text-yellow-600" />;
      if (entity === 'Transaction') return <Edit className="h-4 w-4 text-blue-600" />;
      return <Edit className="h-4 w-4 text-orange-600" />;
    }
    
    if (action.includes('Suppression') || action.includes('supprimé')) {
      return <Trash2 className="h-4 w-4 text-red-600" />;
    }
    
    if (action.includes('Auth')) {
      return <Key className="h-4 w-4 text-purple-600" />;
    }
    
    if (action.includes('Settings') || action.includes('Paramètres')) {
      return <Settings className="h-4 w-4 text-gray-600" />;
    }
    
    if (action.includes('Permissions') || action.includes('Permissions')) {
      return <Key className="h-4 w-4 text-indigo-600" />;
    }
    
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('Création') || action.includes('créé')) return 'text-green-600';
    if (action.includes('Modification') || action.includes('modifié')) return 'text-yellow-600';
    if (action.includes('Suppression') || action.includes('supprimé')) return 'text-red-600';
    if (action.includes('Auth')) return 'text-purple-600';
    if (action.includes('Settings') || action.includes('Paramètres')) return 'text-gray-600';
    return 'text-blue-600';
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (activities.length === 0) {
    return (
      <Card className={cn("animate-in fade-in duration-300", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Activité Récente</span>
            </div>
            <Badge variant="outline" className="text-xs">
              0 activité
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune activité récente</p>
            <p className="text-sm text-gray-400 mt-2">
              Les activités apparaîtront ici dès qu'elles se produiront
            </p>
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
            <Activity className="h-5 w-5" />
            <span>Activité Récente</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAsRead}
                className="text-xs"
              >
                Marquer comme lu
              </Button>
            )}
            {showViewAll && (
              <Button variant="ghost" size="sm" className="text-xs">
                <Eye className="mr-1 h-3 w-3" />
                Voir tout
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors animate-in slide-in-from-right duration-300"
              >
                <div className={cn("flex-shrink-0 mt-1", getActivityColor(activity.action))}>
                  {getActivityIcon(activity.action, activity.cible || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn("text-sm font-medium text-gray-900", getActivityColor(activity.action))}>
                      {activity.action}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-1">
                    {activity.cible && (
                      <Badge variant="outline" className="text-xs">
                        {activity.cible}
                      </Badge>
                    )}
                    {activity.user && (
                      <span className="text-xs text-gray-500">
                        par {activity.user.first_name} {activity.user.last_name}
                      </span>
                    )}
                  </div>
                  
                  {activity.details?.entityName && (
                    <p className="text-xs text-gray-600">
                      Entité: {activity.details.entityName}
                    </p>
                  )}
                  
                  {activity.details?.changes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium text-gray-700 mb-1">Changements:</p>
                      {activity.details.changes.before && (
                        <p className="text-gray-600">Avant: {JSON.stringify(activity.details.changes.before)}</p>
                      )}
                      {activity.details.changes.after && (
                        <p className="text-gray-600">Après: {JSON.stringify(activity.details.changes.after)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
};

export default ActivityFeed;