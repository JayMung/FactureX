"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface CSVImporterProps {
  title: string;
  description: string;
  onImport: (data: any[]) => Promise<{ success: number; errors: string[] }>;
  isOpen: boolean;
  onClose: () => void;
  acceptedColumns?: string[];
  sampleData?: string[][];
  requiredColumns?: string[];
}

const CSVImporter: React.FC<CSVImporterProps> = ({
  title,
  description,
  onImport,
  isOpen,
  onClose,
  acceptedColumns,
  sampleData,
  requiredColumns = []
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      showError('Veuillez sélectionner un fichier CSV valide');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        showError('Le fichier CSV est vide');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setColumns(headers);

      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setPreview(data);
      
      // Auto-mapping for common columns
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (acceptedColumns) {
          const match = acceptedColumns.find(col => 
            col.toLowerCase() === lowerHeader ||
            col.toLowerCase().includes(lowerHeader) ||
            lowerHeader.includes(col.toLowerCase())
          );
          if (match) {
            autoMapping[header] = match;
          }
        }
      });
      setMapping(autoMapping);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvColumn: string, dbColumn: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: dbColumn
    }));
  };

  const handleImport = async () => {
    if (!file) return;

    // Check if all required columns are mapped
    const missingRequired = requiredColumns.filter(reqCol => 
      !Object.values(mapping).includes(reqCol)
    );

    if (missingRequired.length > 0) {
      showError(`Veuillez mapper les colonnes requises: ${missingRequired.join(', ')}`);
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const allData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            const mappedColumn = mapping[header];
            if (mappedColumn) {
              row[mappedColumn] = values[index] || '';
            }
          });
          return row;
        });

        // Import in batches to show progress
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < allData.length; i += batchSize) {
          batches.push(allData.slice(i, i + batchSize));
        }

        let totalSuccess = 0;
        const allErrors: string[] = [];

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          try {
            const result = await onImport(batch);
            totalSuccess += result.success;
            allErrors.push(...result.errors);
          } catch (error: any) {
            allErrors.push(`Erreur dans le lot ${i + 1}: ${error.message}`);
          }
          
          setImportProgress(((i + 1) / batches.length) * 100);
          
          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setImportResult({ success: totalSuccess, errors: allErrors });
        showSuccess(`${totalSuccess} enregistrements importés avec succès`);
      };
      reader.readAsText(file);
    } catch (error: any) {
      showError(`Erreur lors de l'importation: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    if (sampleData) {
      const csv = sampleData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              {title}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setColumns([]);
                    setMapping({});
                    setImportResult(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Glissez votre fichier CSV ici
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  ou cliquez pour sélectionner un fichier
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Sélectionner un fichier
                </Button>
              </div>
            )}
          </div>

          {/* Template Download */}
          {sampleData && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Téléchargez le modèle CSV
                </p>
                <p className="text-xs text-blue-700">
                  Utilisez ce modèle pour vous assurer que vos données sont correctement formatées
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          )}

          {/* Column Mapping */}
          {columns.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Mappage des colonnes</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colonne CSV</TableHead>
                      <TableHead>Aperçu</TableHead>
                      <TableHead>Correspondance BD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((column, index) => (
                      <TableRow key={column}>
                        <TableCell className="font-medium">{column}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {preview[0]?.[column] || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <select
                            value={mapping[column] || ''}
                            onChange={(e) => handleMappingChange(column, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Ignorer cette colonne</option>
                            {acceptedColumns?.map(col => (
                              <option key={col} value={col}>
                                {col} {requiredColumns.includes(col) && '*'}</option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Champs obligatoires
              </p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                Aperçu des données
              </h3>
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(mapping).filter(col => mapping[col]).map(col => (
                        <TableHead key={col}>{mapping[col]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Object.keys(mapping).filter(col => mapping[col]).map(col => (
                          <TableCell key={col}>{row[col]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Importation en cours...</span>
                <span className="text-sm text-gray-500">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert className={importResult.errors.length > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              <div className="flex items-start">
                {importResult.errors.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                )}
                <div className="ml-2 flex-1">
                  <AlertDescription>
                    <p className="font-medium">
                      {importResult.success} enregistrements importés avec succès
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-yellow-800">Erreurs:</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside mt-1 max-h-20 overflow-y-auto">
                          {importResult.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {importResult.errors.length > 5 && (
                            <li>... et {importResult.errors.length - 5} autres erreurs</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              Fermer
            </Button>
            {file && !importResult && (
              <Button 
                onClick={handleImport} 
                disabled={isImporting || Object.keys(mapping).length === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer les données
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CSVImporter;