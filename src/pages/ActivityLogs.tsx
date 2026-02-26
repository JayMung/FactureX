import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { usePermissions } from '../hooks/usePermissions';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Activity, 
  FileText,
  Plus,
  Edit,
  Trash2,
  Key,
  AlertTriangle,
  Eye,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../components/ui/pagination-custom';
import ActivityDetailsModal from '../components/activity/ActivityDetailsModal';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
  date: string;
  created_at?: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role?: string;
  };
}

const ActivityLogs: React.FC = () => {
  usePageSetup({
    title: 'Logs d\'activité',
    subtitle: 'Historique complet de toutes les actions dans l\'application'
  });

  const { isAdmin, checkPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const pageSize = 50;

  // Use secure hook for activity logs
  const { logs, isLoading, error, refetch, hasAccess } = useActivityLogs(currentPage, pageSize);

  // Fetch users for filter dropdown (admin only)
  const [users, setUsers] = useState<Array<{ id: string; email: string; first_name: string; last_name: string }>>([]);
  
  const fetchUsers = async () => {
    // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
    if (false && !hasAccess) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
    if (true || hasAccess) {
      fetchUsers();
    }
  }, [hasAccess]);

  const handleRefresh = () => {
    const filters = {
      action: actionFilter !== 'all' ? actionFilter : undefined,
      user: userFilter !== 'all' ? userFilter : undefined,
      date: dateFilter !== 'all' ? dateFilter : undefined
    };
    refetch(currentPage, pageSize, filters);
  };

  useEffect(() => {
    // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
    if (true || hasAccess) {
      handleRefresh();
    }
  }, [currentPage, actionFilter, userFilter, dateFilter, hasAccess]);

  const handleExport = async () => {
    // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
    if (false && !hasAccess) {
      showError('Permissions insuffisantes pour exporter les logs');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_activity_logs_secure', {
        page_num: 1,
        page_size: 10000, // Export all logs
        filter_action: actionFilter !== 'all' ? actionFilter : null,
        filter_user_id: userFilter !== 'all' ? userFilter : null,
        filter_date_range: dateFilter !== 'all' ? dateFilter : null
      });

      if (error) throw error;

      const csv = [
        ['Date', 'Utilisateur', 'Action', 'Cible', 'Détails'].join(','),
        ...(data || []).map(log => [
          new Date(log.date).toLocaleString('fr-FR'),
          `"${log.user_email}"`,
          `"${log.action}"`,
          `"${log.cible || ''}"`,
          `"${JSON.stringify(log.details || {})}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `activites-${actionFilter !== 'all' ? actionFilter.toLowerCase() + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess('Export CSV généré avec succès');
    } catch (error: any) {
      console.error('Export error:', error);
      showError('Erreur lors de l\'export des logs');
    }
  };

  // Show access denied UI if user doesn't have permissions
  // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
  if (false && !hasAccess) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Accès Restreint</span>
              </div>
              <p className="text-sm">
                Vous n'avez pas les permissions administrateur requises pour consulter les logs d'activité.
                Cette fonctionnalité est réservée aux administrateurs pour des raisons de sécurité.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs d'activité</h1>
            <p className="text-gray-600 mt-1">Historique complet de toutes les actions dans l'application</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Actualiser
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading || logs.data.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="CREATE">Création</SelectItem>
                    <SelectItem value="UPDATE">Modification</SelectItem>
                    <SelectItem value="DELETE">Suppression</SelectItem>
                    <SelectItem value="LOGIN">Connexion</SelectItem>
                    <SelectItem value="LOGOUT">Déconnexion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utilisateur
                </label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les périodes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les périodes</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                    <SelectItem value="month">30 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs d'activité ({logs.count} total)
              </span>
              <Badge variant="secondary">
                Page {currentPage} sur {logs.totalPages || 1}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Utilisateur</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cible</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-48" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : logs.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-lg">Aucune activité trouvée</p>
                        <p className="text-gray-400 text-sm mt-2">
                          Essayez d'ajuster les filtres ou effectuez des actions dans l'application
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.data.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(activity.date).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <div className={cn("inline-flex p-2 rounded-full", getActivityColor(activity.action))}>
                            {getActivityIcon(activity.action)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">
                            {activity.action}
                          </p>
                          {activity.cible && (
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.cible}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {(activity as any).user_first_name} {(activity as any).user_last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(activity as any).user_email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {(activity as any).target_name || activity.cible_id || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedActivity(activity);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {logs.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={logs.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de détails */}
        <ActivityDetailsModal
          activity={selectedActivity}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
        />
      </div>
    </Layout>
  );
};

// Helper functions
const getActivityColor = (action: string): string => {
  const colors: { [key: string]: string } = {
    'CREATE': 'bg-green-100 text-green-600',
    'UPDATE': 'bg-blue-100 text-blue-600',
    'DELETE': 'bg-red-100 text-red-600',
    'LOGIN': 'bg-purple-100 text-purple-600',
    'LOGOUT': 'bg-gray-100 text-gray-600',
    'VIEW': 'bg-yellow-100 text-yellow-600',
    'EXPORT': 'bg-indigo-100 text-indigo-600'
  };
  return colors[action] || 'bg-gray-100 text-gray-600';
};

const getActivityIcon = (action: string) => {
  const icons: { [key: string]: React.ReactNode } = {
    'CREATE': <Plus className="h-4 w-4" />,
    'UPDATE': <Edit className="h-4 w-4" />,
    'DELETE': <Trash2 className="h-4 w-4" />,
    'LOGIN': <Key className="h-4 w-4" />,
    'LOGOUT': <Key className="h-4 w-4" />,
    'VIEW': <Eye className="h-4 w-4" />,
    'EXPORT': <Download className="h-4 w-4" />
  };
  return icons[action] || <Activity className="h-4 w-4" />;
};

export default ActivityLogs;
