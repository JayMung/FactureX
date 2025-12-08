import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Download, 
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Key,
  Settings, 
  FileText,
  Eye,
  Activity,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../ui/pagination-custom';
import ActivityStats from '../activity/ActivityStats';
import ActivityChart from '../activity/ActivityChart';
import ActivityDetailsModal from '../activity/ActivityDetailsModal';
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

const ActivityLogsTab: React.FC = () => {
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
  const [users, setUsers] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState(10);

  // Fonction pour formater les messages d'activité
  const formatActivityMessage = (activity: ActivityLog) => {
    const userName = activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'Utilisateur';
    const entity = activity.cible || 'élément';
    
    // Récupérer les détails spécifiques
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

  const fetchActivities = async (page: number = 1, filters: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' });

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

      const { data: activityData, error, count } = await query
        .order('date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const userIds = [...new Set(activityData?.map(log => log.user_id) || [])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      let activitiesWithUsers = activityData?.map(log => ({
        ...log,
        created_at: log.created_at || log.date,
        user: profilesMap.get(log.user_id) || null
      })) || [];

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

  useEffect(() => {
    fetchActivities(currentPage, {
      action: actionFilter,
      user: userFilter,
      date: dateFilter,
      search: searchTerm
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, actionFilter, userFilter, dateFilter, searchTerm, pageSize]);

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
      const filterInfo = [
        ['Exporté le:', new Date().toLocaleString('fr-FR')],
        ['Type:', 'Logs d\'activité'],
        ['Filtres appliqués:'],
        ['- Recherche:', searchTerm || 'Aucune'],
        ['- Action:', actionFilter !== 'all' ? actionFilter : 'Toutes'],
        ['- Utilisateur:', userFilter !== 'all' ? users.find(u => u.id === userFilter)?.email || userFilter : 'Tous'],
        ['- Période:', dateFilter !== 'all' ? dateFilter : 'Toutes'],
        ['- Total activités exportées:', activities.length.toString()],
        [''],
        []
      ];

      const headers = [
        'Date',
        'Heure',
        'Action',
        'Prénom',
        'Nom',
        'Email',
        'Type d\'entité',
        'Nom de l\'entité',
        'Détails'
      ];

      const rows = activities.map(activity => [
        new Date(activity.created_at || activity.date).toLocaleDateString('fr-FR'),
        new Date(activity.created_at || activity.date).toLocaleTimeString('fr-FR'),
        activity.action,
        activity.user?.first_name || '',
        activity.user?.last_name || '',
        activity.user?.email || '',
        activity.cible || '',
        activity.details?.entityName || '',
        JSON.stringify(activity.details || {})
      ]);

      const csvContent = [
        ...filterInfo.map(row => row.join(',')),
        headers.map(h => `\"${h}\"`).join(','),
        ...rows.map(row => row.map(cell => `\"${String(cell).replace(/\"/g, '\"\"')}\"`).join(','))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
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

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Charts */}
      <ActivityStats activities={activities} />
      <ActivityChart activities={activities} />

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

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des activités</span>
            <Badge variant="outline">{totalCount} activités</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date & Heure</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Entité</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
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
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">Aucune activité trouvée</p>
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr key={activity.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(activity.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={cn("inline-flex p-2 rounded-full", getActivityColor(activity.action))}>
                          {getActivityIcon(activity.action)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">
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
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
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

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Liste des activités</h3>
          <Badge variant="outline">{totalCount} activités</Badge>
        </div>
        
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Aucune activité trouvée</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={cn("inline-flex p-1.5 rounded-full", getActivityColor(activity.action))}>
                        {getActivityIcon(activity.action)}
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(activity.created_at)}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleViewDetails(activity)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-1 text-sm">
                  {activity.user && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <User className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{activity.user.first_name} {activity.user.last_name}</span>
                    </div>
                  )}
                  {activity.cible && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                      <Badge variant="outline" className="text-xs">
                        {activity.cible}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination avec sélecteur de taille */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 hidden sm:inline">Afficher</span>
          <Select value={pageSize.toString()} onValueChange={(value) => {
            setPageSize(parseInt(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600 hidden sm:inline">par page</span>
        </div>
        
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
      
      {/* Modal */}
      <ActivityDetailsModal
        activity={selectedActivity}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
    </div>
  );
};

export default ActivityLogsTab;
