import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Activity, 
  Users, 
  Receipt, 
  Settings, 
  FileText,
  Plus,
  Edit,
  Trash2,
  Key,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Calendar
} from 'lucide-react';
import { useRealTimeActivity } from '../hooks/useRealTimeActivity';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../components/ui/pagination-custom';
import ActivityStats from '../components/activity/ActivityStats';
import ActivityChart from '../components/activity/ActivityChart';
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
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ActivityLogs: React.FC = () => {
  usePageSetup({
    title: 'Logs d\'activité',
    subtitle: 'Historique complet de toutes les actions dans l\'application'
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 50;

  // Charger les activités initiales
  const fetchActivities = async (page: number = 1, filters: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles!inner(
            id,
            first_name,
            last_name,
            email,
            role
          )
        `);

      // Appliquer les filtres
      if (filters.search) {
        query = query.or(`
          action.ilike.%${filters.search}%
          ,cible.ilike.%${filters.search}%
          ,profiles.first_name.ilike.%${filters.search}%
          ,profiles.last_name.ilike.%${filters.search}%
          ,profiles.email.ilike.%${filters.search}%
        `);
      }

      if (filters.action && filters.action !== 'all') {
        query = query.ilike('action', `%${filters.action}%`);
      }

      if (filters.user && filters.user !== 'all') {
        query = query.eq('user_id', filters.user);
      }

      if (filters.date && filters.date !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        if (filters.date === 'today') {
          query = query.gte('date', today);
        } else if (filters.date === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          query = query.gte('date', weekAgo.toISOString());
        } else if (filters.date === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          query = query.gte('date', monthAgo.toISOString());
        }
      }

      // Compter le total
      const { count } = await query;

      // Pagination
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const activitiesWithUsers = data?.map(log => ({
        ...log,
        user: log.profiles
      })) || [];

      setActivities(activitiesWithUsers);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching activities:', error);
      showError('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  // Charger les utilisateurs pour le filtre
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .order('first_name');
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Charger les activités initiales
  useEffect(() => {
    fetchActivities(currentPage, {
      search: searchTerm,
      action: actionFilter,
      user: userFilter,
      date: dateFilter
    });
  }, [currentPage, searchTerm, actionFilter, userFilter, dateFilter]);

  const handleRefresh = () => {
    fetchActivities(1, {
      search: searchTerm,
      action: actionFilter,
      user: userFilter,
      date: dateFilter
    });
  };

  const handleExport = async () => {
    try {
      // Informations d'en-tête avec filtres appliqués
      const filterInfo = [
        ['Exporté le:', new Date().toLocaleString('fr-FR')],
        ['Filtres appliqués:'],
        ['- Recherche:', searchTerm || 'Aucune'],
        ['- Action:', actionFilter !== 'all' ? actionFilter : 'Toutes'],
        ['- Utilisateur:', userFilter !== 'all' ? users.find(u => u.id === userFilter)?.email || userFilter : 'Tous'],
        ['- Période:', dateFilter !== 'all' ? dateFilter : 'Toutes'],
        ['- Total activités:', totalCount.toString()],
        [''],
        []
      ];

      // En-têtes de colonnes
      const headers = [
        'Date',
        'Heure',
        'Prénom',
        'Nom',
        'Email',
        'Rôle',
        'Action',
        'Type d\'entité',
        'ID Entité',
        'Page',
        'Navigateur',
        'Changements (Avant)',
        'Changements (Après)',
        'Détails Supplémentaires'
      ];

      // Données
      const rows = activities.map(activity => [
        new Date(activity.created_at).toLocaleDateString('fr-FR'),
        new Date(activity.created_at).toLocaleTimeString('fr-FR'),
        activity.user?.first_name || '',
        activity.user?.last_name || '',
        activity.user?.email || '',
        (activity.user as any)?.role || '',
        activity.action,
        activity.cible || '',
        activity.cible_id || '',
        activity.details?.page || '',
        activity.details?.userAgent ? activity.details.userAgent.substring(0, 50) + '...' : '',
        activity.details?.changes?.before ? JSON.stringify(activity.details.changes.before) : '',
        activity.details?.changes?.after ? JSON.stringify(activity.details.changes.after) : '',
        activity.details?.entityName || ''
      ]);

      // Construire le CSV
      const csvContent = [
        ...filterInfo.map(row => row.join(',')),
        headers.map(h => `\"${h}\"`).join(','),
        ...rows.map(row => row.map(cell => `\"${String(cell).replace(/\"/g, '\"\"')}\"`).join(','))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `activity-logs-${actionFilter !== 'all' ? actionFilter + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`${activities.length} logs exportés avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      showError('Erreur lors de l\'export des logs');
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('Création') || action.includes('créé')) return <Plus className="h-4 w-4 text-green-600" />;
    if (action.includes('Modification') || action.includes('modifié')) return <Edit className="h-4 w-4 text-yellow-600" />;
    if (action.includes('Suppression') || action.includes('supprimé')) return <Trash2 className="h-4 w-4 text-red-600" />;
    if (action.includes('Auth')) return <Key className="h-4 w-4 text-purple-600" />;
    if (action.includes('Settings') || action.includes('Paramètres')) return <Settings className="h-4 w-4 text-gray-600" />;
    return <Activity className="h-4 w-4 text-blue-600" />;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('Création') || action.includes('créé')) return 'bg-green-50 text-green-700 border-green-200';
    if (action.includes('Modification') || action.includes('modifié')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (action.includes('Suppression') || action.includes('supprimé')) return 'bg-red-50 text-red-700 border-red-200';
    if (action.includes('Auth')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Logs d'activité</h1>
              <p className="text-gray-500">Historique complet des actions</p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs d'activité</h1>
            <p className="text-gray-500">
              {totalCount} activité{totalCount > 1 ? 's' : ''} enregistrée{totalCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <ActivityStats activities={activities} className="mb-6" />

        {/* Graphiques */}
        <ActivityChart activities={activities} className="mb-6" />

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par action, utilisateur ou entité..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="Création">Créations</SelectItem>
                  <SelectItem value="Modification">Modifications</SelectItem>
                  <SelectItem value="Suppression">Suppressions</SelectItem>
                  <SelectItem value="Auth">Authentification</SelectItem>
                  <SelectItem value="Settings">Paramètres</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Toutes les dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activités */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Liste des activités</span>
              <Badge variant="outline" className="text-xs">
                {totalCount} activités
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">Aucune activité trouvée</p>
                <p className="text-gray-400 text-sm mt-2">
                  Essayez d'ajuster les filtres ou effectuez des actions dans l'application
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn("flex-shrink-0 mt-1 p-2 rounded-full", getActivityColor(activity.action))}>
                      {getActivityIcon(activity.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className={cn("font-medium text-gray-900", getActivityColor(activity.action))}>
                          {activity.action}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-2">
                        {activity.cible && (
                          <Badge variant="outline" className="text-xs">
                            {activity.cible}
                          </Badge>
                        )}
                        {activity.cible_id && (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {activity.cible_id.slice(0, 8)}...
                          </code>
                        )}
                        {activity.user && (
                          <Badge variant="outline" className="text-xs">
                            {(activity.user as any).role}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        par <span className="font-medium">
                          {activity.user?.first_name} {activity.user?.last_name}
                        </span>
                        {activity.user?.email && (
                          <span className="text-gray-400">({activity.user.email})</span>
                        )}
                      </p>
                      
                      {activity.details?.changes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Détails des changements:</p>
                          <div className="space-y-1 text-xs">
                            {activity.details.changes.before && (
                              <div>
                                <span className="text-gray-600">Avant:</span>
                                <pre className="text-gray-800 bg-white p-2 rounded mt-1">
                                  {JSON.stringify(activity.details.changes.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {activity.details.changes.after && (
                              <div>
                                <span className="text-gray-600">Après:</span>
                                <pre className="text-gray-800 bg-white p-2 rounded mt-1">
                                  {JSON.stringify(activity.details.changes.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {activity.details?.page && (
                        <p className="text-xs text-gray-500 mt-2">
                          Page: {activity.details.page}
                        </p>
                      )}
                      
                      {activity.details?.userAgent && (
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.details.userAgent}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ActivityLogs;