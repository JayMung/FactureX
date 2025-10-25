"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, DollarSign, Calculator } from 'lucide-react';
import type { Transaction, Client, PaymentMethod } from '@/types';
import { useClients } from '@/hooks/useClients';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useExchangeRates, useFees } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: Transaction | undefined;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  transaction 
}) => {
  const [formData, setFormData] = useState({
    client_id: '',
    montant: '',
    devise: 'USD',
    motif: 'Commande',
    mode_paiement: '',
    date_paiement: new Date().toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculations, setCalculations] = useState({
    frais: 0,
    benefice: 0,
    montant_cny: 0,
    taux_usd_cny: 0,
    taux_usd_cdf: 0
  });

  const { clients } = useClients(1, {});
  const { paymentMethods } = usePaymentMethods();
  const { rates } = useExchangeRates();
  const { fees } = useFees();
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();

  const isEditing = !!transaction;
  const isLoading = isCreating || isUpdating || isCalculating;

  // Charger les données de la transaction si en mode édition
  useEffect(() => {
    if (transaction && isEditing) {
      setFormData({
        client_id: transaction.client_id,
        montant: transaction.montant.toString(),
        devise: transaction.devise,
        motif: transaction.motif,
        mode_paiement: transaction.mode_paiement,
        date_paiement: transaction.date_paiement?.split('T')[0] || new Date().toISOString().split('T')[0]
      });
      
      setCalculations({
        frais: transaction.frais,
        benefice: transaction.benefice,
        montant_cny: transaction.montant_cny,
        taux_usd_cny: transaction.taux_usd_cny,
        taux_usd_cdf: transaction.taux_usd_cdf
      });
    }
  }, [transaction, isEditing]);

  // Calculer automatiquement lorsque les données changent
  useEffect(() => {
    if (formData.montant && formData.devise && formData.motif && rates && fees) {
      calculateAmounts();
    }
  }, [formData.montant, formData.devise, formData.motif, rates, fees]);

  const calculateAmounts = () => {
    if (!formData.montant || !rates || !fees) return;

    setIsCalculating(true);
    
    try {
      const montant = parseFloat(formData.montant);
      const tauxUSD = formData.devise === 'USD' ? 1 : rates.usdToCdf;
      const fraisUSD = montant * (fees[formData.motif.toLowerCase() as keyof typeof fees] / 100);
      const montantCNY = formData.devise === 'USD' 
        ? montant * rates.usdToCny 
        : (montant / tauxUSD) * rates.usdToCny;
      const commissionPartenaire = montant * (fees.partenaire / 100);
      const benefice = fraisUSD - commissionPartenaire;

      setCalculations({
        frais: fraisUSD,
        benefice: benefice,
        montant_cny: montantCNY,
        taux_usd_cny: rates.usdToCny,
        taux_usd_cdf: rates.usdToCdf
      });
    } catch (error) {
      console.error('Erreur de calcul:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) {
      newErrors.client_id = 'Le client est requis';
    }

    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }

    if (!formData.devise) {
      newErrors.devise = 'La devise est requise';
    }

    if (!formData.motif) {
      newErrors.motif = 'Le motif est requis';
    }

    if (!formData.mode_paiement) {
      newErrors.mode_paiement = 'Le mode de paiement est requis';
    }

    if (!formData.date_paiement) {
      newErrors.date_paiement = 'La date est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const transactionData = {
        client_id: formData.client_id,
        montant: parseFloat(formData.montant),
        devise: formData.devise,
        motif: formData.motif,
        mode_paiement: formData.mode_paiement,
        date_paiement: formData.date_paiement,
        statut: 'En attente'
      };

      if (isEditing && transaction) {
        await updateTransaction(transaction.id, transactionData);
      } else {
        await createTransaction(transactionData);
      }
      
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        client_id: '',
        montant: '',
        devise: 'USD',
        motif: 'Commande',
        mode_paiement: '',
        date_paiement: new Date().toISOString().split('T')[0]
      });
      setErrors({});
    } catch (error: any) {
      // L'erreur est déjà gérée dans le hook, pas besoin d'afficher une notification ici
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} F`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return amount.toString();
  };

  if (!isOpen) return null;

  const activePaymentMethods = paymentMethods.filter(method => method.is_active);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              {isEditing ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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

            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
              >
                <SelectTrigger className={errors.client_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} - {client.telephone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-red-600">{errors.client_id}</p>
              )}
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant">Montant *</Label>
                <Input
                  id="montant"
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => handleChange('montant', e.target.value)}
                  placeholder="0.00"
                  className={errors.montant ? 'border-red-500' : ''}
                />
                {errors.montant && (
                  <p className="text-sm text-red-600">{errors.montant}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="devise">Devise *</Label>
                <Select
                  value={formData.devise}
                  onValueChange={(value) => handleChange('devise', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Motif and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motif">Motif *</Label>
                <Select
                  value={formData.motif}
                  onValueChange={(value) => handleChange('motif', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commande">Commande</SelectItem>
                    <SelectItem value="Transfert">Transfert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode_paiement">Mode de paiement *</Label>
                <Select
                  value={formData.mode_paiement}
                  onValueChange={(value) => handleChange('mode_paiement', value)}
                >
                  <SelectTrigger className={errors.mode_paiement ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePaymentMethods.map((method) => (
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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date_paiement">Date de paiement *</Label>
              <Input
                id="date_paiement"
                type="date"
                value={formData.date_paiement}
                onChange={(e) => handleChange('date_paiement', e.target.value)}
                className={errors.date_paiement ? 'border-red-500' : ''}
              />
              {errors.date_paiement && (
                <p className="text-sm text-red-600">{errors.date_paiement}</p>
              )}
            </div>

            {/* Calculations Preview */}
            {formData.montant && !isCalculating && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center">
                  <Calculator className="mr-2 h-4 w-4" />
                  Prévisualisation des calculs
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Frais ({formData.motif}):</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(calculations.frais, 'USD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bénéfice:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {formatCurrency(calculations.benefice, 'USD')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant CNY:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {formatCurrency(calculations.montant_cny, 'CNY')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Taux USD/CDF:</span>
                    <span className="ml-2 font-medium">
                      {calculations.taux_usd_cdf.toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isCalculating && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Calcul en cours...</span>
                </div>
              </div>
            )}

            {/* Exchange Rates Info */}
            {rates && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Taux actuels:</strong> 1 USD = {rates.usdToCny} CNY | 1 USD = {rates.usdToCdf.toLocaleString('fr-FR')} CDF
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Mettre à jour' : 'Créer la transaction'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;