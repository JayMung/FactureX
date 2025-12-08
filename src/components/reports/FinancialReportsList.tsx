import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  User,
  HardDrive,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFinancialReports } from '@/hooks/useFinancialReports';
import { FinancialReport } from '@/types';
import { toast } from 'sonner';

interface FinancialReportsListProps {
  onReportSelect?: (report: FinancialReport) => void;
}

export const FinancialReportsList: React.FC<FinancialReportsListProps> = ({
  onReportSelect,
}) => {
  const { useReportsList, downloadReport, deleteReport } = useFinancialReports();
  const { data: reports = [], isLoading, error, refetch } = useReportsList();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<FinancialReport | null>(null);

  const handleDownload = async (reportId: string) => {
    try {
      await downloadReport.mutateAsync(reportId);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteReport.mutateAsync(reportToDelete.id);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'generating':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Complété</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'generating':
        return <Badge variant="default" className="bg-blue-500">Génération</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>;
      case 'expired':
        return <Badge variant="outline">Expiré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'cash_flow':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'profitability':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'discrepancies':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'cash_flow':
        return 'Flux de Trésorerie';
      case 'profitability':
        return 'Rentabilité';
      case 'discrepancies':
        return 'Écarts';
      default:
        return type;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-4">
              Impossible de charger les rapports financiers
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rapports Financiers</h2>
          <p className="text-muted-foreground">
            Historique des rapports générés et disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <FileText className="h-3 w-3 mr-1" />
            {reports.length} rapport{reports.length !== 1 ? 's' : ''}
          </Badge>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Liste des rapports */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Chargement des rapports...</span>
            </div>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun rapport</h3>
              <p className="text-muted-foreground">
                Générez votre premier rapport financier pour voir apparaître l'historique ici
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getReportTypeIcon(report.report_type)}
                      <h3 className="font-semibold text-lg">{report.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3">
                      {report.description}
                    </p>

                    {/* Métadonnées */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(report.date_range_start), 'dd MMM yyyy', { locale: fr })} -{' '}
                        {format(new Date(report.date_range_end), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {report.generated_by_email}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        {formatFileSize(report.file_size)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {report.download_count} téléchargement{report.download_count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Progression ou statut */}
                    {report.status === 'generating' && (
                      <div className="mt-3">
                        <Progress value={75} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Génération en cours...
                        </p>
                      </div>
                    )}

                    {/* Expiration */}
                    {report.status === 'completed' && !isExpired(report.expires_at) && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3 inline mr-1" />
                        Expire dans {getDaysUntilExpiration(report.expires_at)} jours
                      </div>
                    )}

                    {isExpired(report.expires_at) && (
                      <div className="mt-3 text-xs text-orange-600">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Rapport expiré - Régénérez si nécessaire
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {report.status === 'completed' && !isExpired(report.expires_at) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => handleDownload(report.id)}
                              disabled={downloadReport.isPending}
                              size="sm"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Télécharger le rapport</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {onReportSelect && report.status === 'completed' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onReportSelect(report)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Voir les détails</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info(`ID: ${report.id}`, { description: 'Copié dans le presse-papiers' })}
                        >
                          Copier l'ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setReportToDelete(report);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rapport</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le rapport "{reportToDelete?.title}" ?
              Cette action est irréversible et supprimera définitivement le fichier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
