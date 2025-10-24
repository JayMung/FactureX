import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { activities, unreadCount, markAsRead } = useRealTimeActivity(10);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Convertir les activités en notifications
  useEffect(() => {
    const newNotifications = activities.slice(0, 10).map(activity => ({
      id: activity.id,
      title: activity.action,
      message: `${(activity.user as any)?.first_name} ${(activity.user as any)?.last_name} - ${activity.cible || 'Système'}`,
      type: getActivityType(activity.action),
      timestamp: new Date(activity.created_at),
      read: false
    }));

    setNotifications(prev => {
      // Garder les notifications existantes et ajouter les nouvelles
      const existingIds = new Set(prev.map(n => n.id));
      const newItems = newNotifications.filter(n => !existingIds.has(n.id));
      
      return [...newItems, ...prev].slice(0, 20); // Garder max 20 notifications
    });
  }, [activities]);

  const getActivityType = (action: string): 'info' | 'success' | 'warning' | 'error' => {
    if (action.includes('Création') || action.includes('créé')) return 'success';
    if (action.includes('Modification') || action.includes('modifié')) return 'info';
    if (action.includes('Suppression') || action.includes('supprimé')) return 'warning';
    if (action.includes('Auth') && action.includes('échec')) return 'error';
    return 'info';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <X className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffMs / 86400000);
    return `Il y a ${diffDays}j`;
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    // Si toutes sont lues, marquer comme lu globalement
    const allRead = notifications.every(n => n.read);
    if (allRead) {
      markAsRead();
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAsRead();
  };

  const handleClearAll = () => {
    setNotifications([]);
    markAsRead();
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className={cn("relative", className)}>
      {/* Bell icon with badge */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-gray-100 transition-colors"
          >
            <Bell className={cn(
              "h-4 w-4 transition-colors",
              unreadCount > 0 && "text-red-500"
            )} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Notifications</span>
              <div className="flex items-center space-x-2">
                {unreadNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs h-6 px-2"
                  >
                    Tout marquer comme lu
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-6 px-2"
                >
                  Effacer tout
                </Button>
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-gray-500">Aucune notification</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                        notification.read ? "opacity-60" : ""
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className={cn("p-2 rounded-full", getNotificationColor(notification.type))}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={cn("text-sm font-medium", getNotificationColor(notification.type))}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => {
                navigate('/activity-logs');
                setIsOpen(false);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              <span>Voir tous les logs d'activité</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NotificationCenter;