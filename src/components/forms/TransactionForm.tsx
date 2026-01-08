"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, DollarSign } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { validateTransactionInput } from '@/lib/security/input-validation';
import { detectAttackPatterns } from '@/lib/security/validation';
import type { Transaction, Client, PaymentMethod } from '@/types';
import { useAllClients } from '@/hooks/useClients';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useExchangeRates, useFees } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { supabase } from '@/integrations/supabase/client';

// Refactored imports
import { TransactionCalculations } from './transaction/TransactionCalculations';
import {
  TransactionFormProps,
  FinanceCategory,
  DEFAULT_REVENUE_CATS,
  DEFAULT_DEPENSE_CATS
} from './transaction/types';

// Interfaces and constants moved to ./transaction/types.ts

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction
}) => {
  const [formData, setFormData] = useState({
    type_transaction: 'revenue' as 'revenue' | 'depense' | 'transfert',
    client_id: '',
    montant: '',
    devise: 'USD',
    categorie: 'Commande',
    category_id: '',
    motif: 'Commande',
    mode_paiement: '',
    date_paiement: new Date().toISOString().split('T')[0],
    compte_source_id: '',
    compte_destination_id: '',
    notes: '',
    frais: '0'
  });

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculations, setCalculations] = useState({
    frais: 0,
    benefice: 0,
    montant_cny: 0,
    taux_usd_cny: 0,
    taux_usd_cdf: 0
  });

  const { clients } = useAllClients();
  const { paymentMethods } = usePaymentMethods();
  const { rates } = useExchangeRates();
  const { fees } = useFees();
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();
  const { comptes } = useComptesFinanciers();

  const isEditing = !!transaction;
  const isLoading = isCreating || isUpdating || isCalculating;

  // Charger les données de la transaction si en mode édition
  useEffect(() => {
    if (transaction && isEditing) {
      setFormData({
        type_transaction: transaction.type_transaction || 'revenue',
        client_id: transaction.client_id || '',
        montant: transaction.montant.toString(),
        devise: transaction.devise,
        categorie: transaction.categorie || transaction.motif || 'Commande',
        category_id: transaction.category_id || '',
        motif: transaction.motif || 'Commande',
        mode_paiement: transaction.mode_paiement || '',
        date_paiement: transaction.date_paiement?.split('T')[0] || new Date().toISOString().split('T')[0],
        compte_source_id: transaction.compte_source_id || '',
        compte_destination_id: transaction.compte_destination_id || '',
        notes: transaction.notes || '',
        frais: transaction.frais?.toString() || '0'
      });

      setCalculations({
        frais: transaction.frais || 0,
        benefice: transaction.benefice || 0,
        montant_cny: transaction.montant_cny || 0,
        taux_usd_cny: transaction.taux_usd_cny || 0,
        taux_usd_cdf: transaction.taux_usd_cdf || 0
      });
    }
  }, [transaction, isEditing]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('finance_categories')
          .select('*')
          .eq('is_active', true)
          .order('nom');

        if (data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Calculer automatiquement lorsque les données changent
  useEffect(() => {
    if (formData.montant && formData.devise && formData.categorie && rates && fees) {
      calculateAmounts();
    }
  }, [formData.montant, formData.devise, formData.categorie, formData.type_transaction, rates, fees]);

  const calculateAmounts = () => {
    if (!formData.montant || !rates || !fees) return;

    setIsCalculating(true);

    try {
      const montant = parseFloat(formData.montant);
      const tauxUSD = formData.devise === 'USD' ? 1 : rates.usdToCdf;

      // Pour les transferts, utiliser les frais saisis manuellement
      let fraisUSD = 0;
      let benefice = 0;

      if (formData.type_transaction === 'transfert') {
        // Frais de transfert saisis manuellement
        fraisUSD = parseFloat(formData.frais) || 0;
        benefice = fraisUSD; // Les frais de transfert sont le bénéfice
      } else if (formData.type_transaction === 'revenue') {
        // Calcul automatique pour les revenues
        const categorieLower = (formData.motif || formData.categorie).toLowerCase().replace(/ /g, '');
        // Fallback for fee key logic
        const feeKey = categorieLower as keyof typeof fees;
        const feePercentage = fees[feeKey] || fees.commande || 0;
        fraisUSD = montant * (feePercentage / 100);
        const commissionPartenaire = montant * (fees.partenaire / 100);
        benefice = fraisUSD - commissionPartenaire;
      } else if (formData.type_transaction === 'depense') {
        // Les dépenses n'ont pas de frais, le bénéfice est négatif
        fraisUSD = 0;
        benefice = -montant; // Dépense = perte
      }

      const montantNet = montant - fraisUSD;
      const montantCNY = formData.devise === 'USD'
        ? montantNet * rates.usdToCny
        : (montantNet / tauxUSD) * rates.usdToCny;

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

    // Basic validation
    if (formData.type_transaction === 'revenue' && !formData.client_id) {
      newErrors.client_id = 'Le client est requis pour un revenue';
    }

    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }

    if (!formData.devise) {
      newErrors.devise = 'La devise est requise';
    }

    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
    }

    // Validation des comptes selon le type
    if (formData.type_transaction === 'revenue' && !formData.compte_destination_id) {
      newErrors.compte_destination_id = 'Le compte de destination est requis pour un revenue';
    }

    if (formData.type_transaction === 'depense' && !formData.compte_source_id) {
      newErrors.compte_source_id = 'Le compte source est requis pour une dépense';
    }

    if (formData.type_transaction === 'transfert') {
      if (!formData.compte_source_id) {
        newErrors.compte_source_id = 'Le compte source est requis';
      }
      if (!formData.compte_destination_id) {
        newErrors.compte_destination_id = 'Le compte de destination est requis';
      }
      if (formData.compte_source_id === formData.compte_destination_id) {
        newErrors.compte_destination_id = 'Les comptes source et destination doivent être différents';
      }
    }

    if (!formData.date_paiement) {
      newErrors.date_paiement = 'La date est requise';
    }

    // Security validation
    const transactionData = {
      client_id: formData.client_id,
      montant: parseFloat(formData.montant),
      devise: formData.devise,
      motif: formData.motif,
      mode_paiement: formData.mode_paiement,
      date_paiement: formData.date_paiement,
      statut: 'En attente'
    };

    // Validate with security layer
    const validation = validateTransactionInput(transactionData);
    if (!validation.isValid) {
      // Add specific security errors
      const securityErrors = validation.error?.split('; ') || [];
      securityErrors.forEach(error => {
        if (error.includes('client_id')) newErrors.client_id = error;
        if (error.includes('montant')) newErrors.montant = error;
        if (error.includes('devise')) newErrors.devise = error;
        if (error.includes('motif')) newErrors.motif = error;
        if (error.includes('mode_paiement')) newErrors.mode_paiement = error;
        if (error.includes('date')) newErrors.date_paiement = error;
      });
    }

    // Check for attack patterns in text fields
    const suspiciousFields = ['mode_paiement'];
    for (const field of suspiciousFields) {
      if (formData[field as keyof typeof formData]) {
        const attackCheck = detectAttackPatterns(formData[field as keyof typeof formData] as string);
        if (attackCheck.isAttack) {
          newErrors[field] = `Contenu suspect détecté: ${attackCheck.attackType}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const transactionData = {
        type_transaction: formData.type_transaction,
        client_id: formData.client_id,
        montant: parseFloat(formData.montant),
        devise: formData.devise,
        motif: formData.motif,
        categorie: formData.categorie,
        category_id: formData.category_id || undefined,
        mode_paiement: formData.mode_paiement,
        date_paiement: formData.date_paiement,
        compte_source_id: formData.compte_source_id,
        compte_destination_id: formData.compte_destination_id,
        notes: formData.notes,
        frais: parseFloat(formData.frais) || 0,
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
        type_transaction: 'revenue',
        client_id: '',
        montant: '',
        devise: 'USD',
        categorie: 'Commande',
        category_id: '',
        motif: 'Commande',
        mode_paiement: '',
        date_paiement: new Date().toISOString().split('T')[0],
        compte_source_id: '',
        compte_destination_id: '',
        notes: '',
        frais: '0'
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

  // Filter categories by type
  const availableCategories = categories.filter(c =>
    c.type === formData.type_transaction ||
    (formData.type_transaction === 'transfert' && c.type === 'revenue')
  );

  // Combine DB categories with Legacy defaults to ensuring nothing is missing
  // especially 'Paiement Facture' etc if they haven't been migrated to DB yet
  const defaults = formData.type_transaction === 'depense' ? DEFAULT_DEPENSE_CATS : DEFAULT_REVENUE_CATS;

  // Create a map to avoid duplicates (DB takes precedence if name matches)
  const categoryMap = new Map();

  // Add defaults first (as fallback objects)
  defaults.forEach(name => {
    categoryMap.set(name.toLowerCase(), { value: name, label: name, original: null });
  });

  // Add DB categories (overriding defaults if name matches)
  availableCategories.forEach(c => {
    categoryMap.set(c.nom.toLowerCase(), { value: c.id, label: c.nom, original: c });
  });

  // Convert back to array
  // If we have DB categories, we prefer them, but we want to ensure the "Important" legacy ones exist too
  const displayCategories = Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              {isEditing ? 'Modifier la transaction' : 'Nouvelle transaction (v2)'}
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
              <ClientCombobox
                clients={clients}
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
                placeholder="Sélectionner un client"
                className={errors.client_id ? 'border-red-500' : ''}
              />
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
                  value={formData.category_id || formData.categorie} // Use ID if available, else name (fallback)
                  onValueChange={(value) => {
                    // Check if value is UUID
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
                    if (isUuid) {
                      const cat = categories.find(c => c.id === value);
                      setFormData(prev => ({
                        ...prev,
                        category_id: value,
                        categorie: cat ? cat.nom : prev.categorie,
                        motif: cat ? cat.nom : prev.motif
                      }));
                    } else {
                      // Legacy or fallback string value
                      setFormData(prev => ({ ...prev, categorie: value, category_id: '', motif: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {displayCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
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
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    handleChange('date_paiement', date.toISOString().split('T')[0]);
                  }
                }}
                placeholder="Sélectionner une date"
                className={errors.date_paiement ? 'border-red-500' : ''}
              />
              {errors.date_paiement && (
                <p className="text-sm text-red-600">{errors.date_paiement}</p>
              )}
            </div>

            {/* Calculations Preview - Extracted to component */}
            <TransactionCalculations
              formData={formData}
              isCalculating={isCalculating}
              calculations={calculations}
              formatCurrency={formatCurrency}
            />

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