import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar,
  TrendingUp,
  Database
} from 'lucide-react';
import { useRealTimeActivity } from '../hooks/useRealTimeActivity';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../components/ui/pagination-custom';
import ActivityStats from '../components/activity/ActivityStats';
import ActivityChart from '../components/activity/ActivityChart';
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
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const pageSize = 50;

  // Charger les activités initiales
  const fetchActivities = async (page: number = 1, filters: any = {}) => {
    setLoading(true);
    try {
      // Build query for activity_logs only
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' });

      // Apply basic filters (action, user, date)
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

      // Fetch activities with pagination
      const { data: activityData, error, count } = await query
        .order('date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(activityData?.map(log => log.user_id) || [])];
      
      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);

      // Create a map for quick lookup
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine data
      let activitiesWithUsers = activityData?.map(log => ({
        ...log,
        created_at: log.created_at || log.date,
        user: profilesMap.get(log.user_id) || null
      })) || [];

      // Apply search filter on combined data if needed
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        activitiesWithUsers = activitiesWithUsers.filter(activity => 
          activity.action?.toLowerCase().includes(searchLower) ||
          activity.cible?.toLowerCase().includes(searchLower) ||
          activity.user?.first_name?.toLowerCase().includes(searchLower) ||
          activity.user?.last_name?.toLowerCase().includes(searchLower) ||
          activity.user?.email?.toLowerCase().includes(searchLower)
        );
      }

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
        ['- Total activités exportées:', activities.length.toString()],
        ['- Total activités (filtrées):', totalCount.toString()],
        [''],
        []
      ];

      // En-têtes de colonnes
      const headers = [
        'Date',
        'Heure',
        'Action (lisible)',
        'Prénom',
        'Nom',
        'Email',
        'Rôle',
        'Action brute',
        'Type d\'entité',
        'Nom de l\'entité',
        'ID Entité',
        'Page',
        'A des modifications',
        'Changements (JSON)',
        'Navigateur (court)'
      ];

      // Données
      const rows = activities.map(activity => [
        new Date(activity.created_at || activity.date).toLocaleDateString('fr-FR'),
        new Date(activity.created_at || activity.date).toLocaleTimeString('fr-FR'),
        formatActivityMessage(activity),
        activity.user?.first_name || '',
        activity.user?.last_name || '',
        activity.user?.email || '',
        (activity.user as any)?.role || '',
        activity.action,
        activity.cible || '',
        activity.details?.entityName || '',
        activity.cible_id ? activity.cible_id.slice(0, 12) + '...' : '',
        activity.details?.page || '',
        activity.details?.changes ? 'Oui' : 'Non',
        activity.details?.changes ? JSON.stringify(activity.details.changes) : '',
        activity.details?.userAgent ? activity.details.userAgent.substring(0, 60) + '...' : ''
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
      const fileName = `activites-${actionFilter !== 'all' ? actionFilter.toLowerCase() + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`${activities.length} activités exportées avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      showError('Erreur lors de l\'export des activités');
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

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatActivityMessage = (activity: ActivityLog) => {
    const userName = `${activity.user?.first_name} ${activity.user?.last_name}`;
    const entity = activity.details?.entityName || activity.cible || 'élément';
    
    if (activity.action.includes('Création')) {
      return `${userName} a créé ${entity}`;
    } else if (activity.action.includes('Modification')) {
      return `${userName} a modifié ${entity}`;
    } else if (activity.action.includes('Suppression')) {
      return `${userName} a supprimé ${entity}`;
    } else if (activity.action.includes('Auth')) {
      return `${userName} s'est connecté`;
    }
    return activity.action;
  };

  const handleViewDetails = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setIsDetailsModalOpen(true);
  };

  const calculateActivityStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.created_at || a.date).toISOString().split('T')[0];
      return activityDate === today;
    });
    
    const creations = activities.filter(a => a.action.includes('Création')).length;
    const modifications = activities.filter(a => a.action.includes('Modification')).length;
    const suppressions = activities.filter(a => a.action.includes('Suppression')).length;
    
    return {
      today: todayActivities.length,
      total: totalCount,
      creations,
      modifications,
      suppressions
    };
  };

  const stats = calculateActivityStats();

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aujourd'hui</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.today}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">activités</p>
                </div>
                <div className="text-blue-600">
                  <Calendar className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Créations</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.creations}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">total</p>
                </div>
                <div className="text-green-600">
                  <Plus className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Modifications</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.modifications}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">total</p>
                </div>
                <div className="text-yellow-600">
                  <Edit className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">activités</p>
                </div>
                <div className="text-gray-900">
                  <Database className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Activités - Tableau */}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date & Heure</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Utilisateur</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Entité</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-48" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : activities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-lg">Aucune activité trouvée</p>
                        <p className="text-gray-400 text-sm mt-2">
                          Essayez d'ajuster les filtres ou effectuez des actions dans l'application
                        </p>
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDateTime(activity.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className={cn("inline-flex p-2 rounded-full", getActivityColor(activity.action))}>
                            {getActivityIcon(activity.action)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">
                            {formatActivityMessage(activity)}
                          </p>
                          {activity.details?.entityName && (
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.details.entityName}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.user?.first_name} {activity.user?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{activity.user?.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {activity.cible && (
                            <Badge variant="outline" className="text-xs">
                              {activity.cible}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {activity.details?.changes ? (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              Avec modifications
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Simple
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewDetails(activity)}
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

export default ActivityLogs;
