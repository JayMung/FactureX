"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Calendar } from 'lucide-react';
import type { CreateTransactionData, Client, ExchangeRates, Fees } from '@/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useClients } from '@/hooks/useClients';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useSettings } from '@/hooks/useSettings';
import { showSuccess, showError } from '@/utils/toast';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<CreateTransactionData>({
    reference: '',
    client_id: '',
    montant: 0,
    devise: 'USD',
    motif: 'Transfert',
    mode_paiement: '',
    date_paiement: new Date().toISOString().split('T')[0],
    statut: 'En attente'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    frais: 0,
    benefice: 0,
    montantCny: 0
  });

  const { createTransaction, isCreating } = useTransactions();
  const { clients } = useClients(1, { search: '' });
  const { paymentMethods } = usePaymentMethods();
  const { rates: exchangeRates, isLoading: ratesLoading } = useSettings() as any;
  const { fees, isLoading: feesLoading } = useSettings() as any;
  
  const isLoading = isCreating;

  // Utiliser useMemo pour éviter la recréation d'objets à chaque render
  const currentRates = useMemo(() => 
    exchangeRates || { usdToCny: 7.25, usdToCdf: 2850 }, 
    [exchangeRates]
  );
  
  const currentFees = useMemo(() => 
    fees || { transfert: 5, commande: 10, partenaire: 3 }, 
    [fees]
  );

  // Calcul des montants en temps réel
  useEffect(() => {
    if (!ratesLoading && !feesLoading) {
      calculateAmounts();
    }
  }, [
    formData.montant, 
    formData.devise, 
    formData.motif, 
    currentRates.usdToCny, 
    currentRates.usdToCdf,
    currentFees.transfert,
    currentFees.commande,
    currentFees.partenaire
  ]);

  const calculateAmounts = () => {
    const montant = parseFloat(formData.montant.toString()) || 0;
    
    if (montant <= 0) {
      setCalculatedAmounts({ frais: 0, benefice: 0, montantCny: 0 });
      return;
    }

    // Utiliser les taux de change configurés
    const tauxUsdCny = currentRates.usdToCny || 7.25;
    const tauxUsdCdf = currentRates.usdToCdf || 2850;
    
    // Convertir le montant en USD si nécessaire
    let montantEnUsd = montant;
    if (formData.devise === 'CDF') {
      montantEnUsd = montant / tauxUsdCdf;
    } else if (formData.devise === 'CNY') {
      montantEnUsd = montant / tauxUsdCny;
    }
    
    // Utiliser les frais configurés selon le motif
    const fraisPercentage = formData.motif === 'Commande' 
      ? (currentFees.commande / 100) 
      : (currentFees.transfert / 100);
    const frais = montantEnUsd * fraisPercentage;
    
    // Calculer le bénéfice selon la commission partenaire configurée
    const beneficePercentage = (currentFees.partenaire / 100);
    const benefice = frais * (1 - beneficePercentage); // Part de l'entreprise
    
    // Calculer le montant net en CNY (montant - frais)
    const montantNetEnUsd = montantEnUsd - frais;
    const montantCny = montantNetEnUsd * tauxUsdCny;

    setCalculatedAmounts({
      frais: parseFloat(frais.toFixed(2)),
      benefice: parseFloat(benefice.toFixed(2)),
      montantCny: parseFloat(montantCny.toFixed(2))
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) {
      newErrors.client_id = 'Veuillez sélectionner un client';
    }

    if (!formData.montant || formData.montant <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }

    if (!formData.mode_paiement.trim()) {
      newErrors.mode_paiement = 'Le mode de paiement est requis';
    }

    if (!formData.devise) {
      newErrors.devise = 'Veuillez sélectionner une devise';
    }

    if (!formData.motif) {
      newErrors.motif = 'Veuillez sélectionner un motif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      // S'assurer que tous les champs requis sont présents
      const finalData: CreateTransactionData = {
        reference: formData.reference || `TRX-${Date.now()}`,
        client_id: formData.client_id,
        montant: formData.montant,
        devise: formData.devise as 'USD' | 'CDF' | 'CNY',
        motif: formData.motif as 'Commande' | 'Transfert',
        mode_paiement: formData.mode_paiement,
        date_paiement: formData.date_paiement || new Date().toISOString().split('T')[0],
        statut: formData.statut || 'En attente'
      };

      console.log('Données envoyées:', finalData); // Debug

      createTransaction(finalData);
      
      showSuccess('Transaction créée avec succès');
      
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        reference: '',
        client_id: '',
        montant: 0,
        devise: 'USD',
        motif: 'Transfert',
        mode_paiement: '',
        date_paiement: new Date().toISOString().split('T')[0],
        statut: 'En attente'
      });
      setErrors({});
    } catch (error: any) {
      console.error('Erreur lors de la création:', error); // Debug
      showError(error.message || 'Une erreur est survenue lors de la création de la transaction');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'montant' ? parseFloat(value) || 0 : value 
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90hv] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold text-gray-900">Nouvelle transaction</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client_id" className="text-sm font-medium text-gray-700">
                Client <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleSelectChange('client_id', value)}
              >
                <SelectTrigger className={`h-11 ${errors.client_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} - {client.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-red-600">{errors.client_id}</p>
              )}
            </div>

            {/* Date de paiement */}
            <div className="space-y-2">
              <Label htmlFor="date_paiement" className="text-sm font-medium text-gray-700">
                Date de paiement <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="date_paiement"
                  name="date_paiement"
                  type="date"
                  value={formData.date_paiement}
                  onChange={handleChange}
                  className="h-11 pl-4 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Montant et Devise */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant" className="text-sm font-medium text-gray-700">
                  Montant <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  value={formData.montant || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`h-11 ${errors.montant ? 'border-red-500' : ''}`}
                />
                {errors.montant && (
                  <p className="text-sm text-red-600">{errors.montant}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="devise" className="text-sm font-medium text-gray-700">
                  Devise <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.devise}
                  onValueChange={(value) => handleSelectChange('devise', value)}
                >
                  <SelectTrigger className={`h-11 ${errors.devise ? 'border-red-500' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
                {errors.devise && (
                  <p className="text-sm text-red-600">{errors.devise}</p>
                )}
              </div>
            </div>

            {/* Motif et Mode de paiement */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motif" className="text-sm font-medium text-gray-700">
                  Motif <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.motif}
                  onValueChange={(value) => handleSelectChange('motif', value)}
                >
                  <SelectTrigger className={`h-11 ${errors.motif ? 'border-red-500' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfert">Transfert</SelectItem>
                    <SelectItem value="Commande">Commande</SelectItem>
                  </SelectContent>
                </Select>
                {errors.motif && (
                  <p className="text-sm text-red-600">{errors.motif}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode_paiement" className="text-sm font-medium text-gray-700">
                  Mode de paiement <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.mode_paiement}
                  onValueChange={(value) => handleSelectChange('mode_paiement', value)}
                >
                  <SelectTrigger className={`h-11 ${errors.mode_paiement ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.filter(m => m.is_active).map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mode_paiement && (
                  <p className="text-sm text-red-600">{errors.mode_paiement}</p>
                )}
              </div>
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label htmlFor="statut" className="text-sm font-medium text-gray-700">
                Statut
              </Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => handleSelectChange('statut', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Servi">Servi</SelectItem>
                  <SelectItem value="Remboursé">Remboursé</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                  <SelectItem value="Annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Calculs automatiques */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Calculs automatiques</h3>
              
              <div className="grid grid-cols-3 gap-6">
                {/* Frais */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Frais ({formData.motif === 'Commande' ? currentFees.commande : currentFees.transfert}%)
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${calculatedAmounts.frais.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Bénéfice */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Bénéfice ({(100 - currentFees.partenaire).toFixed(1)}% des frais)
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${calculatedAmounts.benefice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Montant CNY */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Montant CNY (1 USD = {currentRates.usdToCny} CNY)
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{calculatedAmounts.montantCny.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Info supplémentaire */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  * Les calculs utilisent les taux et frais configurés dans les paramètres de l'application
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-11"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la transaction'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;