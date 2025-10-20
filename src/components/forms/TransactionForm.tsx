"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, Calculator } from 'lucide-react';
import type { CreateTransactionData, Client } from '@/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useClients } from '@/hooks/useClients';
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
    client_id: '',
    montant: 0,
    devise: 'USD',
    motif: 'Transfert',
    mode_paiement: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    frais: 0,
    montantCny: 0,
    benefice: 0
  });

  const { createTransaction, isCreating } = useTransactions();
  const { clients } = useClients(1, { search: '' });
  
  const isLoading = isCreating;

  // Calcul des montants en temps réel
  useEffect(() => {
    if (formData.montant > 0) {
      calculateAmounts();
    } else {
      setCalculatedAmounts({ frais: 0, montantCny: 0, benefice: 0 });
    }
  }, [formData.montant, formData.devise, formData.motif]);

  const calculateAmounts = async () => {
    // Taux de change (à récupérer depuis les settings)
    const tauxUsdCny = 7.25;
    const tauxUsdCdf = 2850;
    
    let montantEnUSD = formData.montant;
    if (formData.devise === 'CDF') {
      montantEnUSD = formData.montant / tauxUsdCdf;
    }
    
    // Calculer les frais (5% pour transfert, 10% pour commande)
    const fraisPercentage = formData.motif === 'Commande' ? 0.10 : 0.05;
    const frais = montantEnUSD * fraisPercentage;
    
    // Calculer le montant en CNY
    const montantCny = (montantEnUSD - frais) * tauxUsdCny;
    
    // Calculer le bénéfice
    const benefice = frais * 0.6; // 60% pour l'entreprise

    setCalculatedAmounts({
      frais: Math.round(frais * 100) / 100,
      montantCny: Math.round(montantCny * 100) / 100,
      benefice: Math.round(benefice * 100) / 100
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await createTransaction(formData);
      showSuccess('Transaction créée avec succès');
      
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        client_id: '',
        montant: 0,
        devise: 'USD',
        motif: 'Transfert',
        mode_paiement: ''
      });
      setErrors({});
    } catch (error: any) {
      showError(error.message || 'Une erreur est survenue');
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

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} F`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nouvelle transaction</CardTitle>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleSelectChange('client_id', value)}
                >
                  <SelectTrigger className={errors.client_id ? 'border-red-500' : ''}>
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

              <div className="space-y-2">
                <Label htmlFor="motif">Motif *</Label>
                <Select
                  value={formData.motif}
                  onValueChange={(value) => handleSelectChange('motif', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfert">Transfert</SelectItem>
                    <SelectItem value="Commande">Commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant">Montant *</Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={handleChange}
                  placeholder="100.00"
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
                  onValueChange={(value) => handleSelectChange('devise', value)}
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

              <div className="space-y-2">
                <Label htmlFor="mode_paiement">Mode de paiement *</Label>
                <Input
                  id="mode_paiement"
                  name="mode_paiement"
                  value={formData.mode_paiement}
                  onChange={handleChange}
                  placeholder="Cash, Airtel Money..."
                  className={errors.mode_paiement ? 'border-red-500' : ''}
                />
                {errors.mode_paiement && (
                  <p className="text-sm text-red-600">{errors.mode_paiement}</p>
                )}
              </div>
            </div>

            {/* Calculs automatiques */}
            {formData.montant > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcul automatique
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Frais ({formData.motif === 'Commande' ? '10%' : '5%'})</p>
                      <p className="font-medium text-red-600">
                        {formatCurrency(calculatedAmounts.frais, 'USD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bénéfice</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(calculatedAmounts.benefice, 'USD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Montant CNY</p>
                      <p className="font-medium text-blue-600">
                        {formatCurrency(calculatedAmounts.montantCny, 'CNY')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Net à envoyer</p>
                      <p className="font-medium text-emerald-600">
                        {formatCurrency(calculatedAmounts.montantCny, 'CNY')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer la transaction
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