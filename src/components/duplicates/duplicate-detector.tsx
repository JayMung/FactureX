"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Trash2, 
  Merge,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

interface DuplicateGroup {
  id: string;
  clients: Client[];
  duplicateType: 'exact' | 'phone' | 'name';
  confidence: number;
}

interface DuplicateDetectorProps {
  clients: Client[];
  onMergeDuplicates: (duplicates: DuplicateGroup[]) => Promise<void>;
  onDeleteDuplicates: (clientIds: string[]) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

const DuplicateDetector: React.FC<DuplicateDetectorProps> = ({
  clients,
  onMergeDuplicates,
  onDeleteDuplicates,
  isOpen,
  onClose
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && clients.length > 0) {
      scanForDuplicates();
    }
  }, [isOpen, clients]);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDuplicateGroups([]);

    const groups: DuplicateGroup[] = [];
    const phoneMap = new Map<string, Client[]>();
    const nameMap = new Map<string, Client[]>();

    // Phase 1: Regrouper par téléphone
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const normalizedPhone = normalizePhone(client.telephone);
      
      if (!phoneMap.has(normalizedPhone)) {
        phoneMap.set(normalizedPhone, []);
      }
      phoneMap.get(normalizedPhone)!.push(client);
      
      setScanProgress(Math.round((i / clients.length) * 50));
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Phase 2: Regrouper par nom (similarité)
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const normalizedName = normalizeName(client.nom);
      
      // Vérifier les noms similaires
      for (const [existingName, existingClients] of nameMap.entries()) {
        if (calculateSimilarity(normalizedName, existingName) > 0.8) {
          existingClients.push(client);
          break;
        }
      }
      
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, [client]);
      }
      
      setScanProgress(Math.round(50 + (i / clients.length) * 50));
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Phase 3: Identifier les doublons
    let groupId = 1;
    
    // Doublons exacts (même téléphone)
    for (const [phone, phoneClients] of phoneMap.entries()) {
      if (phoneClients.length > 1) {
        groups.push({
          id: `dup-${groupId++}`,
          clients: phoneClients,
          duplicateType: 'exact',
          confidence: 100
        });
      }
    }

    // Doublons par nom similaire
    for (const [name, nameClients] of nameMap.entries()) {
      if (nameClients.length > 1) {
        // Vérifier que ce n'est pas déjà un doublon exact
        const alreadyGrouped = nameClients.some(client => 
          groups.some(group => group.clients.some(c => c.id === client.id))
        );
        
        if (!alreadyGrouped) {
          groups.push({
            id: `dup-${groupId++}`,
            clients: nameClients,
            duplicateType: 'name',
            confidence: 85
          });
        }
      }
    }

    setDuplicateGroups(groups);
    setIsScanning(false);
    setScanProgress(100);
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[^0-9+]/g, '').replace(/^0+/, '+243');
  };

  const normalizeName = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z]/g, '');
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return ((longer.length - distance) / longer.length) * 100;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const handleGroupSelection = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev => 
      checked 
        ? [...prev, groupId]
        : prev.filter(id => id !== groupId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedGroups(checked ? duplicateGroups.map(g => g.id) : []);
  };

  const handleMergeSelected = async () => {
    if (selectedGroups.length === 0) return;
    
    setIsProcessing(true);
    try {
      const groupsToMerge = duplicateGroups.filter(g => selectedGroups.includes(g.id));
      await onMergeDuplicates(groupsToMerge);
      showSuccess(`${groupsToMerge.length} groupe(s) de doublons fusionné(s)`);
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDuplicateTypeInfo = (type: string) => {
    switch (type) {
      case 'exact':
        return { label: 'Doublon exact', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      case 'phone':
        return { label: 'Même téléphone', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      case 'name':
        return { label: 'Nom similaire', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
      default:
        return { label: 'Doublon', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Détection des Doublons
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={scanForDuplicates}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Scanner
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isScanning && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Analyse des doublons...</span>
                <span className="text-sm text-gray-500">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="w-full" />
            </div>
          )}

          {!isScanning && duplicateGroups.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun doublon détecté parmi {clients.length} clients.
              </AlertDescription>
            </Alert>
          )}

          {!isScanning && duplicateGroups.length > 0 && (
            <>
              {/* Sélection */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedGroups.length === duplicateGroups.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedGroups.length} / {duplicateGroups.length} groupe(s) sélectionné(s)
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMergeSelected()}
                    disabled={selectedGroups.length === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Merge className="mr-2 h-4 w-4" />
                    )}
                    Fusionner la sélection
                  </Button>
                </div>
              </div>

              {/* Liste des doublons */}
              <div className="space-y-4">
                {duplicateGroups.map((group) => {
                  const typeInfo = getDuplicateTypeInfo(group.duplicateType);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <div key={group.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedGroups.includes(group.id)}
                            onCheckedChange={(checked) => handleGroupSelection(group.id, checked as boolean)}
                          />
                          <Badge className={typeInfo.color}>
                            <Icon className="mr-1 h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            Confiance: {group.confidence}%
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.clients.map((client, index) => (
                          <div
                            key={client.id}
                            className={cn(
                              "p-3 border rounded-lg",
                              index === 0 ? "border-green-200 bg-green-50" : "border-gray-200"
                            )}
                          >
                            {index === 0 && (
                              <Badge className="mb-2 bg-green-100 text-green-800">
                                Conserver
                              </Badge>
                            )}
                            <div className="text-sm">
                              <p className="font-medium">{client.nom}</p>
                              <p className="text-gray-600">{client.telephone}</p>
                              <p className="text-gray-500">{client.ville}</p>
                              <p className="text-xs text-gray-400">
                                Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Fermer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DuplicateDetector;