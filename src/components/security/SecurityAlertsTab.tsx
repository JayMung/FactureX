import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  Users,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  users_affected: number;
  first_seen: string;
  last_seen: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

const SecurityAlertsTab: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [slackAlertsEnabled, setSlackAlertsEnabled] = useState(false);

  useEffect(() => {
    fetchAlerts();
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('security_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_logs',
        filter: 'severity=eq.critical'
      }, (payload) => {
        console.log('New critical security event:', payload);
        fetchAlerts();
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Alerte de sécurité critique', {
            body: `Nouvel événement de sécurité détecté`,
            icon: '/favicon.ico'
          });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Fetch critical and warning events from last 24h
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .in('severity', ['critical', 'warning'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by event type and create alerts
      const alertsMap = new Map<string, SecurityAlert>();
      
      data?.forEach((log) => {
        const key = `${log.event_type}_${log.severity}`;
        if (alertsMap.has(key)) {
          const alert = alertsMap.get(key)!;
          alert.count++;
          alert.last_seen = log.created_at;
          if (log.user_id) alert.users_affected++;
        } else {
          alertsMap.set(key, {
            id: log.id,
            type: log.event_type,
            severity: log.severity,
            title: getAlertTitle(log.event_type),
            description: getAlertDescription(log.event_type, log.details),
            count: 1,
            users_affected: log.user_id ? 1 : 0,
            first_seen: log.created_at,
            last_seen: log.created_at,
            status: 'active'
          });
        }
      });

      setAlerts(Array.from(alertsMap.values()));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      showError('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const getAlertTitle = (eventType: string): string => {
    const titles: Record<string, string> = {
      'login_failed': 'Tentatives de connexion échouées',
      'suspicious_activity': 'Activité suspecte détectée',
      'rate_limit_exceeded': 'Limite de taux dépassée',
      'csrf_token_invalid': 'Tentative CSRF détectée',
      'permission_denied': 'Accès non autorisé',
      'data_deleted': 'Suppression de données',
      'admin_access_granted': 'Accès administrateur accordé'
    };
    return titles[eventType] || eventType;
  };

  const getAlertDescription = (eventType: string, details: any): string => {
    const descriptions: Record<string, string> = {
      'login_failed': 'Plusieurs tentatives de connexion ont échoué',
      'suspicious_activity': 'Un comportement suspect a été détecté',
      'rate_limit_exceeded': 'Un utilisateur a dépassé la limite de requêtes',
      'csrf_token_invalid': 'Une tentative d\'attaque CSRF a été bloquée',
      'permission_denied': 'Tentative d\'accès à des ressources non autorisées',
      'data_deleted': 'Des données ont été supprimées',
      'admin_access_granted': 'Un accès administrateur a été accordé'
    };
    return descriptions[eventType] || 'Événement de sécurité détecté';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showSuccess('Notifications activées');
      }
    }
  };

  const toggleEmailAlerts = () => {
    setEmailAlertsEnabled(!emailAlertsEnabled);
    showSuccess(emailAlertsEnabled ? 'Alertes email désactivées' : 'Alertes email activées');
  };

  const toggleSlackAlerts = () => {
    setSlackAlertsEnabled(!slackAlertsEnabled);
    showSuccess(slackAlertsEnabled ? 'Alertes Slack désactivées' : 'Alertes Slack activées');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const calculateStats = () => {
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning = alerts.filter(a => a.severity === 'warning').length;
    const totalEvents = alerts.reduce((sum, a) => sum + a.count, 0);
    const totalUsers = alerts.reduce((sum, a) => sum + a.users_affected, 0);

    return { critical, warning, totalEvents, totalUsers };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant={emailAlertsEnabled ? "default" : "outline"}
            onClick={toggleEmailAlerts}
            size="sm"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email {emailAlertsEnabled ? 'activé' : 'désactivé'}
          </Button>
          <Button 
            variant={slackAlertsEnabled ? "default" : "outline"}
            onClick={toggleSlackAlerts}
            size="sm"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Slack {slackAlertsEnabled ? 'activé' : 'désactivé'}
          </Button>
          <Button 
            variant="outline"
            onClick={requestNotificationPermission}
            size="sm"
          >
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>
        </div>
        <Button variant="outline" onClick={fetchAlerts} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Info Banner */}
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          Les alertes critiques sont surveillées en temps réel. Vous recevrez une notification instantanée pour tout événement de sécurité majeur.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alertes actives</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
                <p className="text-xs text-gray-500 mt-1">dernières 24h</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-900 dark:text-white" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-xs text-gray-500 mt-1">à traiter</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Événements</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">affectés</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Aucune alerte active
              </h3>
              <p className="text-gray-500">
                Tout est normal. Aucun événement de sécurité critique détecté dans les dernières 24 heures.
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={cn("border-l-4", getSeverityColor(alert.severity))}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {alert.title}
                        </h3>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">
                          {alert.count} occurrence{alert.count > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{alert.users_affected} utilisateur{alert.users_affected > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Dernière: {formatTimeAgo(alert.last_seen)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Type: {alert.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Voir détails
                    </Button>
                    <Button variant="ghost" size="sm">
                      Marquer résolu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration des alertes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Alertes par email</p>
                <p className="text-sm text-gray-500">Recevoir les alertes critiques par email</p>
              </div>
            </div>
            <Button 
              variant={emailAlertsEnabled ? "default" : "outline"}
              onClick={toggleEmailAlerts}
            >
              {emailAlertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Alertes Slack</p>
                <p className="text-sm text-gray-500">Envoyer les alertes dans un canal Slack</p>
              </div>
            </div>
            <Button 
              variant={slackAlertsEnabled ? "default" : "outline"}
              onClick={toggleSlackAlerts}
            >
              {slackAlertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications navigateur</p>
                <p className="text-sm text-gray-500">Recevoir des notifications en temps réel</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={requestNotificationPermission}
            >
              Activer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAlertsTab;
