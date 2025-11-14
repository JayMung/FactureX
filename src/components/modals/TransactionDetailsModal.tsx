"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Edit, 
  Save, 
  Printer, 
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  DollarSign,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Receipt
} from 'lucide-react';
import type { Transaction } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDuplicate?: (transaction: Transaction) => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onUpdate,
  onDuplicate
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Transaction>>({});
  const [validatorName, setValidatorName] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      setEditedData({
        statut: transaction.statut,
        montant: transaction.montant,
        devise: transaction.devise,
        motif: transaction.motif,
        mode_paiement: transaction.mode_paiement,
        frais: transaction.frais,
        benefice: transaction.benefice,
        montant_cny: transaction.montant_cny,
        taux_usd_cny: transaction.taux_usd_cny
      });

      // Fetch validator name if exists
      if (transaction.valide_par) {
        fetchValidatorName(transaction.valide_par);
      }

      // Fetch creator name if exists
      if (transaction.created_by) {
        fetchCreatorName(transaction.created_by);
      }
    }
  }, [transaction]);

  const fetchValidatorName = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('nom, prenom')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setValidatorName(`${data.prenom} ${data.nom}`);
      }
    } catch (error) {
      console.error('Error fetching validator name:', error);
    }
  };

  const fetchCreatorName = async (userId: string) => {
    try {
      console.log('Fetching creator for userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      console.log('Creator data:', data, 'Error:', error);

      if (data && !error) {
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        console.log('Setting creator name:', fullName);
        setCreatorName(fullName || data.email || 'Utilisateur inconnu');
      } else {
        setCreatorName('Utilisateur inconnu');
      }
    } catch (error) {
      console.error('Error fetching creator name:', error);
      setCreatorName('Utilisateur inconnu');
    }
  };

  const formatCurrencyValue = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Servi":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "En attente":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "Remboursé":
        return <RotateCcw className="h-5 w-5 text-blue-600" />;
      case "Annulé":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Servi":
        return "bg-green-100 text-green-800";
      case "En attente":
        return "bg-yellow-100 text-yellow-800";
      case "Remboursé":
        return "bg-blue-100 text-blue-800";
      case "Annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = async () => {
    if (!transaction || !onUpdate) return;

    setIsSaving(true);
    try {
      await onUpdate(transaction.id, editedData);
      setIsEditMode(false);
      showSuccess('Transaction mise à jour avec succès');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!transaction) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu Transaction - ${transaction.id}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .bold {
              font-weight: bold;
            }
            .center {
              text-align: center;
            }
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px dashed #000;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>FACTUREX</h2>
            <p>Reçu de Transaction</p>
          </div>
          
          <div class="row">
            <span>Date:</span>
            <span>${new Date(transaction.created_at).toLocaleString('fr-FR')}</span>
          </div>
          
          <div class="row">
            <span>Client:</span>
            <span>${transaction.client?.nom || 'N/A'}</span>
          </div>
          
          <div class="row">
            <span>Montant:</span>
            <span class="bold">${formatCurrencyValue(transaction.montant, transaction.devise)}</span>
          </div>
          
          ${transaction.montant_cny ? `
            <div class="row">
              <span>Montant CNY:</span>
              <span class="bold">${formatCurrencyValue(transaction.montant_cny, 'CNY')}</span>
            </div>
            <div class="row">
              <span>Taux:</span>
              <span>${transaction.taux_usd_cny?.toFixed(4) || 'N/A'}</span>
            </div>
          ` : ''}
          
          <div class="row">
            <span>Motif:</span>
            <span>${transaction.motif}</span>
          </div>
          
          <div class="row">
            <span>Mode paiement:</span>
            <span>${transaction.mode_paiement}</span>
          </div>
          
          <div class="row">
            <span>Frais:</span>
            <span>${formatCurrencyValue(transaction.frais, 'USD')}</span>
          </div>
          
          <div class="row">
            <span>Statut:</span>
            <span class="bold">${transaction.statut}</span>
          </div>
          
          <div class="footer">
            <p>Merci de votre confiance!</p>
            <p class="center">www.facturex.com</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const handleDuplicate = () => {
    if (!transaction || !onDuplicate) return;
    onDuplicate(transaction);
    onClose();
    showSuccess('Transaction dupliquée - prête à être modifiée');
  };

  if (!transaction) return null;

  // Générer un ID lisible pour la transaction
  const generateReadableId = (id: string) => {
    const shortId = id.substring(0, 6).toUpperCase();
    return `TX001-${shortId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-base sm:text-2xl">{isEditMode ? 'Modifier la Transaction' : 'Détails de la Transaction'}</span>
            <span className="text-sm sm:text-lg font-mono text-blue-600">#{generateReadableId(transaction.id)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 mt-4">
          {/* Status Badge - Mobile Centered */}
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon(isEditMode ? editedData.statut! : transaction.statut)}
              <Badge className={getStatusColor(isEditMode ? editedData.statut! : transaction.statut)}>
                {isEditMode ? editedData.statut : transaction.statut}
              </Badge>
            </div>
            
            {!isEditMode && (
              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs sm:text-sm">
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Imprimer</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDuplicate} className="text-xs sm:text-sm">
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Dupliquer</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="text-xs sm:text-sm">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Transaction Information - Mobile Optimized */}
          <div className="space-y-4 sm:space-y-6">
            {/* Client Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Client
              </Label>
              <p className="text-base sm:text-lg font-medium">{transaction.client?.nom || 'Client inconnu'}</p>
            </div>

            {/* Montant - Centered on Mobile */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 text-center sm:text-left">
              <Label className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-2 mb-2">
                <DollarSign className="h-4 w-4" />
                Montant
              </Label>
              {isEditMode ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editedData.montant}
                    onChange={(e) => setEditedData({ ...editedData, montant: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <Select 
                    value={editedData.devise} 
                    onValueChange={(value) => setEditedData({ ...editedData, devise: value })}
                  >
                    <SelectTrigger className="w-24 sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrencyValue(transaction.montant, transaction.devise)}
                </p>
              )}
            </div>

            {/* Montant CNY */}
            {transaction.montant_cny && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <Label className="text-xs text-gray-500 mb-2 block">Montant CNY</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.montant_cny || ''}
                    onChange={(e) => setEditedData({ ...editedData, montant_cny: parseFloat(e.target.value) || undefined })}
                  />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {formatCurrencyValue(transaction.montant_cny, 'CNY')}
                  </p>
                )}
              </div>
            )}

            {/* Details Grid - 2 columns on mobile, responsive */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Motif */}
              <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  Motif
                </Label>
                {isEditMode ? (
                  <Select 
                    value={editedData.motif} 
                    onValueChange={(value) => setEditedData({ ...editedData, motif: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Commande">Commande</SelectItem>
                      <SelectItem value="Transfert">Transfert</SelectItem>
                      <SelectItem value="Achat">Achat</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm sm:text-base font-medium">{transaction.motif}</p>
                )}
              </div>

              {/* Mode de paiement */}
              <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Label className="text-xs text-gray-500 mb-2 block">Mode de paiement</Label>
                {isEditMode ? (
                  <Input
                    value={editedData.mode_paiement}
                    onChange={(e) => setEditedData({ ...editedData, mode_paiement: e.target.value })}
                  />
                ) : (
                  <p className="text-sm sm:text-base font-medium">{transaction.mode_paiement}</p>
                )}
              </div>

              {/* Date de création */}
              <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <p className="text-sm sm:text-base font-medium">
                  {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {/* Créé par */}
              <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Label className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  Créé par
                </Label>
                <p className="text-sm sm:text-base font-medium">{creatorName || '-'}</p>
              </div>

              {transaction.updated_at && (
                <div>
                  <Label className="text-xs text-gray-500">Dernière modification</Label>
                  <p className="text-base font-medium">
                    {new Date(transaction.updated_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}

              {transaction.date_validation && (
                <div>
                  <Label className="text-xs text-gray-500">Date de validation</Label>
                  <p className="text-base font-medium">
                    {new Date(transaction.date_validation).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}

              {transaction.valide_par && validatorName && (
                <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <Label className="text-xs text-gray-500 mb-2 block">Validé par</Label>
                  <p className="text-sm sm:text-base font-medium">{validatorName}</p>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Calculation Details - Mobile Optimized */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Détails de calcul
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Frais */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 sm:p-4 text-center">
                <Label className="text-xs text-gray-500 mb-1 sm:mb-2 block">Frais</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.frais}
                    onChange={(e) => setEditedData({ ...editedData, frais: parseFloat(e.target.value) })}
                    className="text-center"
                  />
                ) : (
                  <p className="text-base sm:text-lg font-bold text-orange-600">
                    {formatCurrencyValue(transaction.frais, 'USD')}
                  </p>
                )}
              </div>

              {/* Bénéfice */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 text-center">
                <Label className="text-xs text-gray-500 mb-1 sm:mb-2 block">Bénéfice</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedData.benefice}
                    onChange={(e) => setEditedData({ ...editedData, benefice: parseFloat(e.target.value) })}
                    className="text-center"
                  />
                ) : (
                  <p className="text-base sm:text-lg font-bold text-green-600">
                    {formatCurrencyValue(transaction.benefice, 'USD')}
                  </p>
                )}
              </div>

              {/* Taux USD/CNY */}
              {transaction.taux_usd_cny && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 text-center">
                  <Label className="text-xs text-gray-500 mb-1 sm:mb-2 block">Taux USD/CNY</Label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={editedData.taux_usd_cny || ''}
                      onChange={(e) => setEditedData({ ...editedData, taux_usd_cny: parseFloat(e.target.value) || undefined })}
                      className="text-center"
                    />
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-blue-600">
                      {transaction.taux_usd_cny.toFixed(4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons in Edit Mode - Mobile Optimized */}
          {isEditMode && (
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditMode(false);
                  setEditedData({
                    statut: transaction.statut,
                    montant: transaction.montant,
                    devise: transaction.devise,
                    motif: transaction.motif,
                    mode_paiement: transaction.mode_paiement,
                    frais: transaction.frais,
                    benefice: transaction.benefice,
                    montant_cny: transaction.montant_cny,
                    taux_usd_cny: transaction.taux_usd_cny
                  });
                }}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailsModal;
