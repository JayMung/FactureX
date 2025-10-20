"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Calendar } from 'lucide-react';
import type { CreateTransactionData, Client } from '@/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useClients } from '@/hooks/useClients';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
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
    montantCny: 0,
    benefice: 0
  });

  const { createTransaction, isCreating } = useTransactions();
  const { clients } = useClients(1, { search: '' });
  const { paymentMethods } = usePaymentMethods();
  
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
      const finalData: CreateTransactionData = {
        ...formData,
        reference: formData.reference || `TRX-${Date.now()}`,
        devise: formData.devise as 'USD' | 'CDF',
      };

      await createTransaction(finalData);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl">Nouvelle transaction</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
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

            {/* Row 1: Client & Date de paiement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="client_id" className="text-base font-semibold text-gray-900">
                  Client
                </Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleSelectChange('client_id', value)}
                >
                  <SelectTrigger 
                    className={`h-12 text-base ${
                      errors.client_id 
                        ? 'border-red-500 border-2' 
                        : 'border-2 border-emerald-500'
                    }`}
                  >
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
                <Label htmlFor="date_paiement" className="text-base font-semibold text-gray-900">
                  Date de paiement
                </Label>
                <div className="relative">
                  <Input
                    id="date_paiement"
                    name="date_paiement"
                    type="date"
                    value={formData.date_paiement}
                    onChange={handleChange}
                    className="h-12 text-base pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Montant & Devise */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="montant" className="text-base font-semibold text-gray-900">
                  Montant
                </Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  value={formData.montant || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`h-12 text-base ${
                    errors.montant ? 'border-red-500 border-2' : ''
                  }`}
                />
                {errors.montant && (
                  <p className="text-sm text-red-600">{errors.montant}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="devise" className="text-base font-semibold text-gray-900">
                  Devise
                </Label>
                <Select
                  value={formData.devise}
                  onValueChange={(value) => handleSelectChange('devise', value)}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Motif & Mode de paiement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="motif" className="text-base font-semibold text-gray-900">
                  Motif
                </Label>
                <Select
                  value={formData.motif}
                  onValueChange={(value) => handleSelectChange('motif', value)}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfert">Transfert</SelectItem>
                    <SelectItem value="Commande">Commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode_paiement" className="text-base font-semibold text-gray-900">
                  Mode de paiement
                </Label>
                <Select
                  value={formData.mode_paiement}
                  onValueChange={(value) => handleSelectChange('mode_paiement', value)}
                >
                  <SelectTrigger 
                    className={`h-12 text-base ${
                      errors.mode_paiement ? 'border-red-500 border-2' : ''
                    }`}
                  >
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

            {/* Row 4: Statut */}
            <div className="space-y-2">
              <Label htmlFor="statut" className="text-base font-semibold text-gray-900">
                Statut
              </Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => handleSelectChange('statut', value)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En attente">En attente</SelectItem>
                  <SelectItem value="Servi">Servi</SelectItem>
                  <SelectItem value="Remboursé">Remboursé</SelectItem>
                  <SelectItem value="Annulé">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculs automatiques */}
            {formData.montant > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-base font-semibold text-gray-900">Calculs automatiques</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Frais</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(calculatedAmounts.frais, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bénéfice</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(calculatedAmounts.benefice, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Montant CNY</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(calculatedAmounts.montantCny, 'CNY')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-12 text-base font-semibold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer'
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