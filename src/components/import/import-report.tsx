"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download,
  Eye,
  X
} from 'lucide-react';

interface ImportReportProps {
  isOpen: boolean;
  onClose: () => void;
  results: {
    total: number;
    success: number;
    errors: string[];
    warnings: string[];
    successfulItems: any[];
  };
  onExportErrors?: () => void;
  onExportSuccess?: () => void;
}

const ImportReport: React.FC<ImportReportProps> = ({
  isOpen,
  onClose,
  results,
  onExportErrors,
  onExportSuccess
}) => {
  if (!isOpen) return null;

  const successRate = results.total > 0 ? (results.success / results.total) * 100 : 0;
  const hasErrors = results.errors.length > 0;
  const hasWarnings = results.warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              {hasErrors ? (
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              )}
              Rapport d'Importation
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{results.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{results.success}</p>
              <p className="text-sm text-green-600">Succès</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{results.errors.length}</p>
              <p className="text-sm text-red-600">Erreurs</p>
            </div>
          </div>

          {/* Progression */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taux de réussite</span>
              <span className="text-sm text-gray-500">{successRate.toFixed(1)}%</span>
            </div>
            <Progress 
              value={successRate} 
              className={cn(
                "w-full",
                successRate >= 90 ? "text-green-600" : 
                successRate >= 70 ? "text-yellow-600" : "text-red-600"
              )}
            />
          </div>

          {/* Messages */}
          {hasErrors && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-red-800">
                    {results.errors.length} erreur(s) détectée(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {results.errors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-sm text-red-700">
                        • {error}
                      </p>
                    ))}
                    {results.errors.length > 5 && (
                      <p className="text-sm text-red-600 italic">
                        ... et {results.errors.length - 5} autres erreurs
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {hasWarnings && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-yellow-800">
                    {results.warnings.length} avertissement(s)
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {results.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-yellow-700">
                        • {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!hasErrors && !hasWarnings && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                Importation terminée avec succès ! Tous les {results.success} enregistrements ont été traités.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-2">
              {hasErrors && onExportErrors && (
                <Button variant="outline" size="sm" onClick={onExportErrors}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter les erreurs
                </Button>
              )}
              {results.success > 0 && onExportSuccess && (
                <Button variant="outline" size="sm" onClick={onExportSuccess}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter les succès
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              {!hasErrors && (
                <Button className="bg-green-600 hover:bg-green-700" onClick={onClose}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Terminé
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportReport;