import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialReportsGenerator } from '@/components/reports/FinancialReportsGenerator';
import { FinancialReportsList } from '@/components/reports/FinancialReportsList';
import { useFinancialReports } from '@/hooks/useFinancialReports';
import { FinancialReport } from '@/types';
import {
  FileText,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Download,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const FinancialReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<FinancialReport | null>(null);
  const { useReportsStats } = useFinancialReports();
  const { data: stats, isLoading: statsLoading } = useReportsStats();

  const handleReportSelect = (report: FinancialReport) => {
    setSelectedReport(report);
  };

  const getReportTypeStats = () => {
    if (!stats) return [];
    
    return [
      {
        type: 'cash_flow',
        label: 'Flux de Trésorerie',
        icon: <TrendingUp className="h-5 w-5" />,
        count: stats.byType.cash_flow,
        color: 'text-blue-500'
      },
      {
        type: 'profitability',
        label: 'Rentabilité',
        icon: <BarChart3 className="h-5 w-5" />,
        count: stats.byType.profitability,
        color: 'text-green-500'
      },
      {
        type: 'discrepancies',
        label: 'Écarts',
        icon: <AlertTriangle className="h-5 w-5" />,
        count: stats.byType.discrepancies,
        color: 'text-orange-500'
      }
    ];
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports Financiers Sécurisés</h1>
          <p className="text-muted-foreground">
            Générez et gérez des rapports financiers avec watermark et checksum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Shield className="h-3 w-3 mr-1" />
            Phase 3 - Sécurisé
          </Badge>
        </div>
      </div>

      {/* Statistiques */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rapports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completed} complété{stats.completed !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Téléchargements</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSize > 0 && `${(stats.totalSize / 1024 / 1024).toFixed(1)} MB total`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Cours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {stats.failed} échoué{stats.failed !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Succès</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Taux de réussite
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Types de rapports */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getReportTypeStats().map((typeStat) => (
            <Card key={typeStat.type} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={typeStat.color}>
                      {typeStat.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{typeStat.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {typeStat.count} rapport{typeStat.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {typeStat.count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Générer
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <FinancialReportsGenerator />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <FinancialReportsList onReportSelect={handleReportSelect} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité des Rapports Financiers
              </CardTitle>
              <CardDescription>
                Mesures de sécurité intégrées pour protéger vos données financières
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Protection des Données
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Isolation stricte par organisation (RLS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Watermark dynamique avec email et date</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Checksum SHA256 pour vérification intégrité</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Expiration automatique après 7 jours</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Audit et Traçabilité
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Journalisation complète des accès</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Tracking des téléchargements avec timestamp</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Logs de sécurité dans financial_audit_logs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Conformité GDPR et SOC2</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Alertes de Sécurité</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-orange-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">Accès non autorisé</span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        Tentative d'accès cross-organization
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">Volume élevé</span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Export de plus de 10K transactions
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">Checksum mismatch</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Fichier corrompu ou modifié
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
