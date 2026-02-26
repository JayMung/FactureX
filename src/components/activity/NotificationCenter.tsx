import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Bell,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  Eye,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  
  // Simple local state for dropdown visibility - use ref for stability
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  
  // Local read state
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Convert activities to notifications - memoized with stable deps
  const notifications: NotificationItem[] = useMemo(() => {
    return activities.slice(0, 10).map(activity => {
      const type = activity.action.includes('Création') || activity.action.includes('créé') 
        ? 'success' 
        : activity.action.includes('Suppression') || activity.action.includes('supprimé')
        ? 'warning'
        : 'info';
      
      return {
        id: activity.id,
        title: activity.action,
        message: `${(activity.user as any)?.first_name || ''} ${(activity.user as any)?.last_name || ''} - ${activity.cible || 'Système'}`,
        type,
        timestamp: new Date(activity.created_at || activity.date),
        read: false
      };
    });
  }, [activities]);

  // Combine with read state
  const notificationsWithReadState = useMemo(() => {
    return notifications.map(n => ({ ...n, read: readIds.has(n.id) }));
  }, [notifications, readIds]);

  const unreadNotifications = useMemo(() => 
    notificationsWithReadState.filter(n => !n.read),
    [notificationsWithReadState]
  );

  // Stable toggle function
  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpenRef.current) {
      // Opening - mark all as read in global state
      markAsRead();
    }
  }, [markAsRead]);

  // Stable close function
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Mark individual as read
  const handleMarkAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set([...prev, id]));
  }, []);

  // Mark all as read locally
  const handleMarkAllAsRead = useCallback(() => {
    setReadIds(new Set(notifications.map(n => n.id)));
    markAsRead();
  }, [notifications, markAsRead]);

  // Clear all
  const handleClearAll = useCallback(() => {
    setReadIds(new Set());
    markAsRead();
  }, [markAsRead]);

  // Navigate to logs
  const handleViewAll = useCallback(() => {
    closeDropdown();
    navigate('/activity-logs');
  }, [closeDropdown, navigate]);

  // Helper functions
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'error': return <X className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-100 dark:bg-emerald-900/30';
      case 'warning': return 'bg-amber-100 dark:bg-amber-900/30';
      case 'error': return 'bg-red-100 dark:bg-red-900/30';
      default: return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffMs / 86400000);
    return `${diffDays}j`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Bell icon with badge - simple button, no complex state */}
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg focus:ring-2 focus:ring-emerald-500"
        onClick={toggleOpen}
        aria-label="Notifications"
      >
        <Bell className={cn(
          "h-5 w-5 sm:h-5 sm:w-5 transition-colors",
          unreadCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400"
        )} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
            <Badge
              className="relative h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white border-2 border-white dark:border-gray-900"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </span>
        )}
      </Button>

      {/* Simple dropdown - not using DropdownMenu to avoid infinite loop */}
      {isOpen && (
        <>
          {/* Backdrop to close on click outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeDropdown}
          />
          
          <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl overflow-hidden z-50">
            {/* Header */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-white" />
                  <span className="text-base font-semibold text-white">Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <Badge className="bg-white/20 text-white text-xs">
                      {unreadNotifications.length} nouveau{unreadNotifications.length > 1 ? 'x' : ''}
                    </Badge>
                  )}
                </div>
                <button 
                  onClick={closeDropdown}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Actions bar */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {notificationsWithReadState.length} notification{notificationsWithReadState.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                {unreadNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Tout lire</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-7 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Effacer</span>
                </Button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
              {notificationsWithReadState.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Tout est à jour !</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Vous n&apos;avez aucune notification
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {notificationsWithReadState.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                        notification.read ? "opacity-60" : "bg-emerald-50/30 dark:bg-emerald-900/10"
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className={cn("p-2 rounded-full flex-shrink-0", getBg(notification.type))}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                onClick={handleViewAll}
              >
                <Eye className="mr-2 h-4 w-4" />
                Voir tous les logs d&apos;activité
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;