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
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  className?: string;
  showViewAll?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  className,
  showViewAll = true 
}) => {
  const navigate = useNavigate();
  const { activities, unreadCount, markAsRead } = useRealTimeActivity(5);

  const getActivityIcon = (action: string, entity: string) => {
    // Icons basés sur le type d'action et d'entité
    if (action.includes('Création') || action.includes('créé')) {
      if (entity === 'Client') return <Users className="h-4 w-4 text-green-600" />;
      if (entity === 'Transaction') return <Receipt className="h-4 w-4 text-blue-600" />;
      return <Plus className="h-4 w-4 text-green-500" />;
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

  const formatActivityMessage = (activity: any) => {
    const userName = activity.user ? `${(activity.user as any).first_name} ${(activity.user as any).last_name}` : 'Utilisateur';
    const entity = activity.cible || 'élément';
    
    // Récupérer les détails spécifiques depuis activity.details
    const details = activity.details || {};
    const entityId = activity.cible_id;
    
    // Construire un identifiant descriptif
    let identifier = '';
    if (entity === 'Facture' || entity === 'factures') {
      identifier = details.facture_number || details.numero || (entityId ? `#${entityId.substring(0, 8)}` : '');
    } else if (entity === 'Transaction' || entity === 'transactions') {
      identifier = details.transaction_id || details.numero || (entityId ? `#${entityId.substring(0, 8)}` : '');
    } else if (entity === 'Client' || entity === 'clients') {
      identifier = details.client_name || details.nom || '';
    }
    
    // Formater le nom de l'entité
    let entityName = entity;
    if (entity === 'factures' || entity === 'Facture') entityName = 'une facture';
    else if (entity === 'transactions' || entity === 'Transaction') entityName = 'une transaction';
    else if (entity === 'clients' || entity === 'Client') entityName = 'un client';
    else if (entity === 'UserProfile') entityName = 'un utilisateur';
    else if (entity === 'PaymentMethod') entityName = 'un moyen de paiement';
    
    // Construire le message avec l'identifiant
    const fullEntity = identifier ? `${entityName} - ${identifier}` : entityName;
    
    if (activity.action.includes('Création') || activity.action.includes('créé') || activity.action.includes('CREATE')) {
      return `${userName} a créé ${fullEntity}`;
    } else if (activity.action.includes('Modification') || activity.action.includes('modifié') || activity.action.includes('UPDATE')) {
      return `${userName} a modifié ${fullEntity}`;
    } else if (activity.action.includes('Suppression') || activity.action.includes('supprimé') || activity.action.includes('DELETE')) {
      return `${userName} a supprimé ${fullEntity}`;
    } else if (activity.action.includes('Auth') || activity.action.includes('Connexion')) {
      return `${userName} s'est connecté`;
    } else if (activity.action.includes('Validation')) {
      return `${userName} a validé ${fullEntity}`;
    }
    
    return activity.action;
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
    <Card className={cn("animate-in fade-in duration-300 border border-slate-100 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Chronologie</p>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-emerald-500" />
              Activité récente
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="xs"
                onClick={markAsRead}
                className="text-xs"
              >
                Marquer comme lu
              </Button>
            )}
            {showViewAll && (
              <Button 
                variant="ghost" 
                size="xs" 
                className="text-xs"
                onClick={() => navigate('/activity-logs')}
              >
                <Eye className="mr-1 h-3 w-3" />
                Voir tout
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative pl-6">
              {/* Timeline connector */}
              {index !== activities.length - 1 && (
                <span className="absolute left-2 top-5 h-full w-px bg-slate-100" aria-hidden />
              )}
              <span
                className={cn(
                  "absolute left-0 top-3 h-4 w-4 rounded-full border-2 border-white",
                  activity.action.includes('Création') ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]' :
                  activity.action.includes('Modification') ? 'bg-amber-500 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' :
                  activity.action.includes('Suppression') ? 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.25)]' :
                  'bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.2)]'
                )}
              />

              <div className="rounded-xl border border-slate-100 bg-white/80 p-3.5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDateTime(activity.created_at)} — {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-50 p-2">
                    {getActivityIcon(activity.action, activity.cible || '')}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {activity.cible && (
                    <Badge variant="outline" className="text-[11px] uppercase tracking-wider text-slate-600">
                      {activity.cible}
                    </Badge>
                  )}
                  {activity.details?.changes && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[11px]">
                      Modifié
                    </Badge>
                  )}
                  {activity.details?.status && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[11px]">
                      {activity.details.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;