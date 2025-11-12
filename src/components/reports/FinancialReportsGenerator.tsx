import React, { useState } from 'react';
import { Calendar, Download, FileText, TrendingUp, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useReportGeneration } from '@/hooks/useFinancialReports';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportFormData {
  report_type: 'cash_flow' | 'profitability' | 'discrepancies';
  date_range_start: string;
  date_range_end: string;
}

export const FinancialReportsGenerator: React.FC = () => {
  const [formData, setFormData] = useState<ReportFormData>({
    report_type: 'cash_flow',
    date_range_start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 jours avant
    date_range_end: format(new Date(), 'yyyy-MM-dd'),
  });

  const { generateCashFlowReport, generateProfitabilityReport, generateDiscrepanciesReport, isGenerating } = useReportGeneration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      switch (formData.report_type) {
        case 'cash_flow':
          await generateCashFlowReport(formData.date_range_start, formData.date_range_end);
          break;
        case 'profitability':
          await generateProfitabilityReport(formData.date_range_start, formData.date_range_end);
          break;
        case 'discrepancies':
          await generateDiscrepanciesReport(formData.date_range_start, formData.date_range_end);
          break;
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'cash_flow':
        return <TrendingUp className="h-5 w-5" />;
      case 'profitability':
        return <FileText className="h-5 w-5" />;
      case 'discrepancies':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getReportDescription = (type: string) => {
    switch (type) {
      case 'cash_flow':
        return 'Analyse des entrées et sorties avec projections sur 30 jours';
      case 'profitability':
        return 'Analyse de la rentabilité par client et par type de transaction';
      case 'discrepancies':
        return 'Détection des écarts > 1% entre montants calculés et enregistrés';
      default:
        return '';
    }
  };

  const getReportFeatures = (type: string) => {
    switch (type) {
      case 'cash_flow':
        return [
          'Flux de trésorerie détaillé',
          'Projection 30 jours',
          'Analyse par période',
          'Watermark de sécurité'
        ];
      case 'profitability':
        return [
          'Top 10 clients rentables',
          'Rentabilité par type',
          'Moyennes par transaction',
          'Checksum SHA256'
        ];
      case 'discrepancies':
        return [
          'Détection automatique',
          'Écarts > 1% identifiés',
          'Taux de discrepancy',
          'Alertes prioritaires'
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Générateur de Rapports Financiers</h2>
          <p className="text-muted-foreground">
            Générez des rapports sécurisés avec watermark et checksum
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Download className="h-3 w-3 mr-1" />
          Phase 3 - Sécurisé
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type de Rapport */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Type de Rapport
            </CardTitle>
            <CardDescription>
              Sélectionnez le type de rapport financier à générer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={formData.report_type}
              onValueChange={(value: 'cash_flow' | 'profitability' | 'discrepancies') =>
                setFormData({ ...formData, report_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type de rapport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_flow">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Flux de Trésorerie</div>
                      <div className="text-sm text-muted-foreground">
                        Entrées/sorties + projections
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="profitability">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Rentabilité</div>
                      <div className="text-sm text-muted-foreground">
                        Analyse par client et type
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="discrepancies">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Écarts</div>
                      <div className="text-sm text-muted-foreground">
                        Détection anomalies > 1%
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {formData.report_type && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  {getReportIcon(formData.report_type)}
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      {formData.report_type === 'cash_flow' && 'Rapport de Flux de Trésorerie'}
                      {formData.report_type === 'profitability' && 'Rapport de Rentabilité'}
                      {formData.report_type === 'discrepancies' && 'Rapport des Écarts'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {getReportDescription(formData.report_type)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getReportFeatures(formData.report_type).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Période */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Période d'Analyse
            </CardTitle>
            <CardDescription>
              Définissez la période de temps pour le rapport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_start">Date de début</Label>
                <Input
                  id="date_start"
                  type="date"
                  value={formData.date_range_start}
                  onChange={(e) =>
                    setFormData({ ...formData, date_range_start: e.target.value })
                  }
                  max={formData.date_range_end}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_end">Date de fin</Label>
                <Input
                  id="date_end"
                  type="date"
                  value={formData.date_range_end}
                  onChange={(e) =>
                    setFormData({ ...formData, date_range_end: e.target.value })
                  }
                  min={formData.date_range_start}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
            </div>

            {/* Validation de la période */}
            {formData.date_range_start && formData.date_range_end && (
              <div className="text-sm text-muted-foreground">
                Période sélectionnée: {format(new Date(formData.date_range_start), 'dd MMMM yyyy', { locale: fr })} -{' '}
                {format(new Date(formData.date_range_end), 'dd MMMM yyyy', { locale: fr })}
                <br />
                Durée: {Math.ceil((new Date(formData.date_range_end).getTime() - new Date(formData.date_range_start).getTime()) / (1000 * 60 * 60 * 24))} jours
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Sécurité et Conformité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">🔒 Protection des données</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Isolation stricte par organisation</li>
                  <li>• Watermark dynamique avec email utilisateur</li>
                  <li>• Checksum SHA256 pour intégrité</li>
                  <li>• Expiration automatique 7 jours</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">📋 Audit et traçabilité</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Journalisation complète des accès</li>
                  <li>• Tracking des téléchargements</li>
                  <li>• Logs de sécurité intégrés</li>
                  <li>• Conformité GDPR/SOC2</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({
              report_type: 'cash_flow',
              date_range_start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              date_range_end: format(new Date(), 'yyyy-MM-dd'),
            })}
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            disabled={isGenerating || !formData.report_type}
            className="min-w-[140px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Générer le Rapport
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
