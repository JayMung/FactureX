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
  UserX,
  Eye,
  Trash2,
  Settings,
  FileText,
  Lock,
  Unlock,
  Users,
  Database,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import Pagination from '../ui/pagination-custom';
import { cn } from '@/lib/utils';
import { 
  logPermissionDenied,
  logSensitiveDataAccess,
  logDataDeleted,
  logAdminAccess,
  logSettingsChanged
} from '@/services/securityLogger';

interface AuditEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string;
  user_email?: string;
  details: any;
  created_at: string;
}

const AuditTrailTab: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const pageSize = 50;

  // Event types for audit trail
  const auditEventTypes = [
    'permission_denied',
    'sensitive_data_accessed',
    'data_deleted',
    'data_modified',
    'admin_access_granted',
    'role_changed',
    'user_created',
    'user_deleted',
    'organization_created',
    'organization_deleted',
    'settings_changed',
    'bulk_export'
  ];

  useEffect(() => {
    fetchAuditEvents();
  }, [eventTypeFilter, searchTerm]);

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_logs')
        .select('*')
        .in('event_type', auditEventTypes)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((event: any) => 
          event.event_type?.toLowerCase().includes(searchLower) ||
          event.user_email?.toLowerCase().includes(searchLower) ||
          JSON.stringify(event.details).toLowerCase().includes(searchLower)
        );
      }
      
      setEvents(filteredData);
    } catch (error) {
      console.error('Error fetching audit events:', error);
      showError('Erreur lors du chargement de l\'audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAuditEvents();
  };

  const handleExport = async () => {
    try {
      const headers = [
        'Date',
        'Heure',
        'Type d\'événement',
        'Email utilisateur',
        'Ressource',
        'Action',
        'Détails'
      ];

      const rows = events.map(event => [
        new Date(event.created_at).toLocaleDateString('fr-FR'),
        new Date(event.created_at).toLocaleTimeString('fr-FR'),
        event.event_type,
        event.user_email || 'N/A',
        event.details?.resource || event.details?.dataType || 'N/A',
        event.details?.action || 'N/A',
        JSON.stringify(event.details || {})
      ]);

      const csvContent = [
        headers.map(h => `\"${h}\"`).join(','),
        ...rows.map(row => row.map(cell => `\"${String(cell).replace(/\"/g, '\"\"')}\"`).join(','))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`${events.length} événements exportés avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      showError('Erreur lors de l\'export de l\'audit trail');
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('permission_denied')) return <UserX className="h-4 w-4 text-red-600" />;
    if (eventType.includes('sensitive_data')) return <Eye className="h-4 w-4 text-orange-600" />;
    if (eventType.includes('deleted')) return <Trash2 className="h-4 w-4 text-red-600" />;
    if (eventType.includes('admin')) return <Shield className="h-4 w-4 text-purple-600" />;
    if (eventType.includes('settings')) return <Settings className="h-4 w-4 text-blue-600" />;
    if (eventType.includes('user')) return <Users className="h-4 w-4 text-green-600" />;
    if (eventType.includes('export')) return <Download className="h-4 w-4 text-yellow-600" />;
    return <FileText className="h-4 w-4 text-gray-600" />;
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('permission_denied')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20';
    if (eventType.includes('sensitive_data')) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20';
    if (eventType.includes('deleted')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20';
    if (eventType.includes('admin')) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20';
    if (eventType.includes('settings')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20';
    if (eventType.includes('export')) return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20';
    return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800';
  };

  const formatEventType = (eventType: string) => {
    const translations: Record<string, string> = {
      'permission_denied': 'Permission refusée',
      'sensitive_data_accessed': 'Données sensibles consultées',
      'data_deleted': 'Données supprimées',
      'data_modified': 'Données modifiées',
      'admin_access_granted': 'Accès admin accordé',
      'role_changed': 'Rôle modifié',
      'user_created': 'Utilisateur créé',
      'user_deleted': 'Utilisateur supprimé',
      'organization_created': 'Organisation créée',
      'organization_deleted': 'Organisation supprimée',
      'settings_changed': 'Paramètres modifiés',
      'bulk_export': 'Export en masse'
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
    const permissionDenied = events.filter(e => e.event_type === 'permission_denied').length;
    const dataAccess = events.filter(e => e.event_type === 'sensitive_data_accessed').length;
    const adminActions = events.filter(e => e.event_type.includes('admin') || e.event_type.includes('role')).length;
    const dataChanges = events.filter(e => e.event_type.includes('deleted') || e.event_type.includes('modified')).length;

    return { permissionDenied, dataAccess, adminActions, dataChanges, total: events.length };
  };

  const stats = calculateStats();

  const paginatedEvents = events.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(events.length / pageSize);

  // Demo function to test logging
  const handleTestLogging = async () => {
    await logPermissionDenied('clients', 'delete');
    await logSensitiveDataAccess('factures', 'facture-123');
    await logAdminAccess('view_security_logs');
    showSuccess('Événements de test créés');
    setTimeout(() => fetchAuditEvents(), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleTestLogging} size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Tester le logging
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm">
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Permissions refusées</p>
                <p className="text-2xl font-bold text-red-600">{stats.permissionDenied}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accès aux données</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dataAccess}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Actions admin</p>
                <p className="text-2xl font-bold text-purple-600">{stats.adminActions}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
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
              <Database className="h-8 w-8 text-gray-900 dark:text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par type, utilisateur ou ressource..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="permission_denied">Permissions refusées</SelectItem>
                <SelectItem value="sensitive_data_accessed">Accès aux données</SelectItem>
                <SelectItem value="data_deleted">Suppressions</SelectItem>
                <SelectItem value="admin_access_granted">Accès admin</SelectItem>
                <SelectItem value="settings_changed">Modifications paramètres</SelectItem>
                <SelectItem value="bulk_export">Exports en masse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Trail</span>
            <Badge variant="outline">{events.length} événements</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date & Heure</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Ressource</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Détails</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">Aucun événement d'audit</p>
                      <p className="text-gray-400 text-sm mt-2">
                        Les événements d'audit apparaîtront ici
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(event.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium", getEventTypeColor(event.event_type))}>
                          {getEventTypeIcon(event.event_type)}
                          {formatEventType(event.event_type)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {event.user_email || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {event.details?.resource || event.details?.dataType || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {event.details?.action || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {event.details && Object.keys(event.details).length > 0 && (
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
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

export default AuditTrailTab;
