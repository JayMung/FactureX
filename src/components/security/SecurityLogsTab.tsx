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
  Shield,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Eye,
  Calendar,
  TrendingUp,
  Lock,
  Unlock,
  UserX,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../ui/pagination-custom';
import { cn } from '@/lib/utils';
import { getRecentSecurityEvents, getSecurityDashboard } from '@/services/securityLogger';

interface SecurityLog {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_id?: string;
  user_email?: string;
  organization_id?: string;
  ip_address?: string;
  details: any;
  created_at: string;
}

const SecurityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  
  const pageSize = 50;

  const fetchSecurityLogs = async () => {
    setLoading(true);
    try {
      const data = await getRecentSecurityEvents(
        100,
        severityFilter !== 'all' ? severityFilter as any : undefined,
        eventTypeFilter !== 'all' ? eventTypeFilter as any : undefined
      );
      
      let filteredData = data;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = data.filter((log: any) => 
          log.event_type?.toLowerCase().includes(searchLower) ||
          log.user_email?.toLowerCase().includes(searchLower) ||
          log.ip_address?.toLowerCase().includes(searchLower)
        );
      }
      
      setLogs(filteredData);
    } catch (error) {
      console.error('Error fetching security logs:', error);
      showError('Erreur lors du chargement des logs de sécurité');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const stats = await getSecurityDashboard();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
    fetchDashboardStats();
  }, [severityFilter, eventTypeFilter, searchTerm]);

  const handleRefresh = () => {
    fetchSecurityLogs();
    fetchDashboardStats();
  };

  const handleExport = async () => {
    try {
      const headers = [
        'Date',
        'Heure',
        'Type d\'événement',
        'Sévérité',
        'Email utilisateur',
        'Adresse IP',
        'Détails'
      ];

      const rows = logs.map(log => [
        new Date(log.created_at).toLocaleDateString('fr-FR'),
        new Date(log.created_at).toLocaleTimeString('fr-FR'),
        log.event_type,
        log.severity,
        log.user_email || 'N/A',
        log.ip_address || 'N/A',
        JSON.stringify(log.details || {})
      ]);

      const csvContent = [
        headers.map(h => `\"${h}\"`).join(','),
        ...rows.map(row => row.map(cell => `\"${String(cell).replace(/\"/g, '\"\"')}\"`).join(','))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`${logs.length} événements exportés avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      showError('Erreur lors de l\'export des logs');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('login')) return <Lock className="h-4 w-4" />;
    if (eventType.includes('logout')) return <Unlock className="h-4 w-4" />;
    if (eventType.includes('permission_denied')) return <UserX className="h-4 w-4" />;
    if (eventType.includes('rate_limit')) return <TrendingUp className="h-4 w-4" />;
    if (eventType.includes('suspicious')) return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const formatEventType = (eventType: string) => {
    const translations: Record<string, string> = {
      'login_success': 'Connexion réussie',
      'login_failed': 'Échec de connexion',
      'logout': 'Déconnexion',
      'signup_success': 'Inscription réussie',
      'signup_failed': 'Échec d\'inscription',
      'permission_denied': 'Permission refusée',
      'rate_limit_exceeded': 'Limite de taux dépassée',
      'csrf_token_invalid': 'Token CSRF invalide',
      'suspicious_activity': 'Activité suspecte',
      'admin_access_granted': 'Accès admin accordé',
      'sensitive_data_accessed': 'Données sensibles consultées',
      'data_deleted': 'Données supprimées',
      'settings_changed': 'Paramètres modifiés'
    };
    return translations[eventType] || eventType;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateStats = () => {
    const critical = logs.filter(l => l.severity === 'critical').length;
    const warning = logs.filter(l => l.severity === 'warning').length;
    const info = logs.filter(l => l.severity === 'info').length;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.created_at.startsWith(today)).length;

    return { critical, warning, info, today, total: logs.length };
  };

  const stats = calculateStats();

  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aujourd'hui</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
                <p className="text-xs text-gray-500 mt-1">événements</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critiques</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avertissements</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">événements</p>
              </div>
              <Shield className="h-8 w-8 text-gray-900 dark:text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé des dernières 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardStats.slice(0, 6).map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(stat.severity)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatEventType(stat.event_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stat.unique_users} utilisateur{stat.unique_users > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{stat.event_count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par type, utilisateur ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Toutes les sévérités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sévérités</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="info">Information</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="login_failed">Échecs de connexion</SelectItem>
                <SelectItem value="login_success">Connexions réussies</SelectItem>
                <SelectItem value="suspicious_activity">Activités suspectes</SelectItem>
                <SelectItem value="permission_denied">Permissions refusées</SelectItem>
                <SelectItem value="rate_limit_exceeded">Limites dépassées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Événements de sécurité</span>
            <Badge variant="outline">{logs.length} événements</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date & Heure</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Sévérité</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">IP</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Détails</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">Aucun événement de sécurité</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium", getSeverityColor(log.severity))}>
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getEventTypeIcon(log.event_type)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatEventType(log.event_type)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {log.user_email || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {log.ip_address || 'N/A'}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        {log.details && Object.keys(log.details).length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {Object.keys(log.details).length} détail{Object.keys(log.details).length > 1 ? 's' : ''}
                          </Badge>
                        )}
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default SecurityLogsTab;
