"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type { Transaction } from '@/types';
import { useAllClients } from '@/hooks/useClients';
import { useExchangeRates } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useColisList, useClientUnpaidFactures, useFinanceCategories } from '@/hooks';
import { toast } from 'sonner';
import { formatDateForInput, getTodayDateString } from '@/utils/dateUtils';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: Transaction | undefined;
  defaultType?: 'revenue' | 'depense' | 'transfert';
}

// Catégories par défaut (fallback si la base de données est vide)
const DEFAULT_REVENUE_CATEGORIES = [
  { value: 'Commande (Facture)', label: 'Commande (Facture)' },
  { value: 'Transfert (Argent)', label: 'Transfert (Argent)' },
  { value: 'Paiement Colis', label: 'Paiement Colis' },
  { value: 'Autres Paiement', label: 'Autres Paiement' }
];

const DEFAULT_DEPENSE_CATEGORIES = [
  { value: 'Paiement Fournisseur', label: 'Paiement Fournisseur' },
  { value: 'Paiement Shipping', label: 'Paiement Shipping' },
  { value: 'Loyer', label: 'Loyer' },
  { value: 'Salaires', label: 'Salaires' },
  { value: 'Autre', label: 'Autre dépense' }
];

// Codes de catégories qui ont des frais (pour les revenus)
const CATEGORIES_WITH_FEES_CODES = ['COMMANDE', 'TRANSFERT_RECU'];

const TransactionFormFinancial: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  defaultType = 'revenue'
}) => {
  const [formData, setFormData] = useState({
    type_transaction: defaultType as 'revenue' | 'depense' | 'transfert',
    client_id: '',
    montant: '',
    devise: 'USD' as 'USD' | 'CDF',
    categorie: 'Commande',
    mode_paiement: '',
    date_paiement: getTodayDateString(),
    compte_source_id: '',
    compte_destination_id: '',
    notes: '',
    frais: '0',
    colis_id: '', // Pour Paiement Colis
    facture_id: '' // Pour Commande (Facture)
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { clients } = useAllClients();
  const { rates } = useExchangeRates();
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();
  const { comptes } = useComptesFinanciers();
  const { paymentMethods } = usePaymentMethods();

  // Charger les colis du client sélectionné (pour Paiement Colis)
  const { data: clientColis = [] } = useColisList({
    clientId: formData.client_id || undefined
  });

  // Charger les factures non payées du client (pour Commande/Facture)
  const { factures: clientFactures, loading: facturesLoading } = useClientUnpaidFactures({
    clientId: formData.client_id || undefined
  });

  // Charger les catégories depuis la base de données
  const { revenueCategories, depenseCategories, loading: categoriesLoading } = useFinanceCategories();

  const isEditing = !!transaction;
  const isLoading = isCreating || isUpdating;

  // Déterminer les catégories à afficher (DB ou fallback) - memoized to prevent infinite loops
  const displayRevenueCategories = useMemo(() => {
    let categories = revenueCategories.length > 0
      ? revenueCategories.map(c => ({ value: c.nom, label: c.nom, code: c.code, icon: c.icon, couleur: c.couleur }))
      : DEFAULT_REVENUE_CATEGORIES.map(c => ({ ...c, code: '', icon: '', couleur: '' }));

    // Ensure "Autres Paiement" is always present for revenue
    if (!categories.find(c => c.value === 'Autres Paiement')) {
      categories.push({ value: 'Autres Paiement', label: 'Autres Paiement', code: 'AUTRE_PAIEMENT', icon: '', couleur: '' });
    }

    return categories;
  }, [revenueCategories]);

  const displayDepenseCategories = useMemo(() =>
    depenseCategories.length > 0
      ? depenseCategories.map(c => ({ value: c.nom, label: c.nom, code: c.code, icon: c.icon, couleur: c.couleur }))
      : DEFAULT_DEPENSE_CATEGORIES.map(c => ({ ...c, code: '', icon: '', couleur: '' }))
    , [depenseCategories]);

  // Vérifier si la catégorie actuelle a des frais
  const currentCategory = useMemo(() =>
    revenueCategories.find(c => c.nom === formData.categorie)
    , [revenueCategories, formData.categorie]);

  const hasFees = currentCategory ? CATEGORIES_WITH_FEES_CODES.includes(currentCategory.code) : false;

  // Charger les données de la transaction si en mode édition
  // Utiliser transaction.id au lieu de transaction pour éviter de réinitialiser
  // le formulaire quand l'utilisateur modifie les champs
  useEffect(() => {
    if (transaction && isEditing && isOpen) {
      console.log('📝 Loading transaction data into form:', transaction.id, 'montant:', transaction.montant);
      setFormData({
        type_transaction: transaction.type_transaction || 'revenue',
        client_id: transaction.client_id || '',
        montant: transaction.montant.toString(),
        devise: transaction.devise as 'USD' | 'CDF',
        categorie: transaction.categorie || transaction.motif || 'Commande',
        mode_paiement: transaction.mode_paiement || '',
        date_paiement: transaction.date_paiement?.split('T')[0] || getTodayDateString(),
        compte_source_id: transaction.compte_source_id || '',
        compte_destination_id: transaction.compte_destination_id || '',
        notes: transaction.notes || '',
        frais: transaction.frais?.toString() || '0',
        colis_id: (transaction as any).colis_id || '',
        facture_id: (transaction as any).facture_id || ''
      });

      if (transaction.date_paiement) {
        setSelectedDate(new Date(transaction.date_paiement));
      }
    }
  }, [transaction?.id, isEditing, isOpen]);

  // Track previous type to detect actual changes
  const prevTypeRef = useRef(formData.type_transaction);
  const initializedRef = useRef(false);

  // Appliquer le defaultType quand le formulaire s'ouvre pour une nouvelle transaction
  useEffect(() => {
    if (isOpen && !isEditing) {
      setFormData(prev => ({ ...prev, type_transaction: defaultType }));
      prevTypeRef.current = defaultType;
    }
  }, [isOpen, isEditing, defaultType]);

  // Reset catégorie when type ACTUALLY changes (only for new transactions)
  useEffect(() => {
    // Ne pas exécuter en mode édition ou si les catégories ne sont pas chargées
    if (isEditing || categoriesLoading) return;

    // Ne déclencher que si le type a vraiment changé
    if (prevTypeRef.current === formData.type_transaction && initializedRef.current) return;

    prevTypeRef.current = formData.type_transaction;
    initializedRef.current = true;

    if (formData.type_transaction === 'revenue') {
      const defaultCat = displayRevenueCategories[0]?.value || 'Commande (Facture)';
      setFormData(prev => ({ ...prev, categorie: defaultCat, client_id: prev.client_id || '', mode_paiement: prev.mode_paiement || '' }));
    } else if (formData.type_transaction === 'depense') {
      const defaultCat = displayDepenseCategories[0]?.value || 'Paiement Fournisseur';
      setFormData(prev => ({ ...prev, categorie: defaultCat, client_id: '', mode_paiement: prev.mode_paiement || '' }));
    } else if (formData.type_transaction === 'transfert') {
      setFormData(prev => ({ ...prev, categorie: 'Transfert', client_id: '', mode_paiement: '' }));
    }
  }, [formData.type_transaction, isEditing, categoriesLoading, displayRevenueCategories, displayDepenseCategories]);

  // Reset frais à 0 quand la catégorie n'a pas de frais (only if frais is not already 0)
  useEffect(() => {
    if (!hasFees) {
      setFormData(prev => {
        if (prev.frais === '0') return prev; // Prevent unnecessary update
        return { ...prev, frais: '0' };
      });
    }
  }, [hasFees]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation client (requis seulement pour revenue)
    // Validation client (requis pour revenue sauf Autres Paiement)
    if (formData.type_transaction === 'revenue' && !formData.client_id && formData.categorie !== 'Autres Paiement') {
      newErrors.client_id = 'Le client est requis pour un revenue';
    }

    // Validation mode de paiement (requis pour revenue)
    if (formData.type_transaction === 'revenue' && !formData.mode_paiement) {
      newErrors.mode_paiement = 'Le mode de paiement est requis pour un revenue';
    }

    // Validation colis (requis pour Paiement Colis)
    if (formData.type_transaction === 'revenue' && formData.categorie === 'Paiement Colis' && !formData.colis_id) {
      newErrors.colis_id = 'Le colis est requis pour un paiement colis';
    }

    // Validation montant
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }

    // Validation devise
    if (!formData.devise) {
      newErrors.devise = 'La devise est requise';
    }

    // Validation catégorie
    if (!formData.categorie) {
      newErrors.categorie = 'La catégorie est requise';
    }

    // Validation date
    if (!formData.date_paiement) {
      newErrors.date_paiement = 'La date est requise';
    }

    // Validation des comptes selon le type
    if (formData.type_transaction === 'revenue' && !formData.compte_destination_id) {
      newErrors.compte_destination_id = 'Le compte de destination est requis';
    }

    if (formData.type_transaction === 'depense' && !formData.compte_source_id) {
      newErrors.compte_source_id = 'Le compte source est requis';
    }

    if (formData.type_transaction === 'transfert') {
      if (!formData.compte_source_id) {
        newErrors.compte_source_id = 'Le compte source est requis';
      }
      if (!formData.compte_destination_id) {
        newErrors.compte_destination_id = 'Le compte de destination est requis';
      }
      if (formData.compte_source_id === formData.compte_destination_id) {
        newErrors.compte_destination_id = 'Les comptes doivent être différents';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📋 Form submitted with formData:', formData);

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    try {
      const transactionData: any = {
        type_transaction: formData.type_transaction,
        montant: parseFloat(formData.montant),
        devise: formData.devise,
        categorie: formData.categorie,
        motif: formData.categorie, // Pour compatibilité
        date_paiement: formData.date_paiement,
        // Préserver le statut existant lors de la mise à jour, sinon 'En attente'
        statut: isEditing && transaction ? transaction.statut : 'En attente',
        notes: formData.notes,
        frais: parseFloat(formData.frais) || 0,
        taux_usd_cny: rates?.usdToCny || 0,
        taux_usd_cdf: rates?.usdToCdf || 0,
      };

      // Ajouter les champs conditionnels
      if (formData.client_id) {
        transactionData.client_id = formData.client_id;
      }

      if (formData.mode_paiement) {
        transactionData.mode_paiement = formData.mode_paiement;
      }

      if (formData.compte_source_id) {
        transactionData.compte_source_id = formData.compte_source_id;
      }

      if (formData.compte_destination_id) {
        transactionData.compte_destination_id = formData.compte_destination_id;
      }

      // Ajouter colis_id si Paiement Colis
      if (formData.colis_id && formData.categorie === 'Paiement Colis') {
        transactionData.colis_id = formData.colis_id;
      }

      // Ajouter facture_id si Commande avec facture liée
      if (formData.facture_id && formData.categorie === 'Commande') {
        transactionData.facture_id = formData.facture_id;
      }

      // Ne PAS envoyer frais et benefice - ils seront calculés par useTransactions
      // Supprimer les valeurs par défaut pour laisser le hook calculer
      delete (transactionData as any).frais;
      delete (transactionData as any).benefice;

      if (isEditing && transaction) {
        console.log('🔄 Updating transaction:', transaction.id);
        console.log('📊 Transaction data to update:', JSON.stringify(transactionData, null, 2));
        console.log('💰 New montant value:', transactionData.montant, 'type:', typeof transactionData.montant);
        const result = await updateTransaction(transaction.id, transactionData);
        console.log('✅ Transaction updated successfully, result:', result);
      } else {
        console.log('➕ Creating new transaction:', transactionData);
        await createTransaction(transactionData);
        console.log('✅ Transaction created successfully');
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
        mode_paiement: '',
        date_paiement: getTodayDateString(),
        compte_source_id: '',
        compte_destination_id: '',
        notes: '',
        frais: '0',
        colis_id: '',
        facture_id: ''
      });
      setErrors({});
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      toast.error(error?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleChange = (field: string, value: string) => {
    console.log(`✏️ Field changed: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const activeComptes = comptes.filter(c => c.is_active);
  const activePaymentMethods = paymentMethods.filter(method => method.is_active);
  const categories = formData.type_transaction === 'revenue'
    ? displayRevenueCategories
    : formData.type_transaction === 'depense'
      ? displayDepenseCategories
      : [{ value: 'Transfert', label: 'Transfert entre comptes', code: '', icon: '', couleur: '' }];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              {isEditing ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isLoading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type de transaction */}
            <div className="space-y-2">
              <Label>Type de transaction *</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={formData.type_transaction === 'revenue' ? 'default' : 'outline'}
                  className={`flex flex-col items-center justify-center h-24 ${formData.type_transaction === 'revenue' ? 'bg-green-500 hover:bg-green-600' : ''
                    }`}
                  onClick={() => handleChange('type_transaction', 'revenue')}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>REVENUE</span>
                  <span className="text-xs">Entrée d'argent</span>
                </Button>
                <Button
                  type="button"
                  variant={formData.type_transaction === 'depense' ? 'default' : 'outline'}
                  className={`flex flex-col items-center justify-center h-24 ${formData.type_transaction === 'depense' ? 'bg-red-500 hover:bg-red-600' : ''
                    }`}
                  onClick={() => handleChange('type_transaction', 'depense')}
                >
                  <TrendingDown className="h-6 w-6 mb-2" />
                  <span>DÉPENSE</span>
                  <span className="text-xs">Sortie d'argent</span>
                </Button>
                <Button
                  type="button"
                  variant={formData.type_transaction === 'transfert' ? 'default' : 'outline'}
                  className={`flex flex-col items-center justify-center h-24 ${formData.type_transaction === 'transfert' ? 'bg-blue-500 hover:bg-blue-600' : ''
                    }`}
                  onClick={() => handleChange('type_transaction', 'transfert')}
                >
                  <ArrowRightLeft className="h-6 w-6 mb-2" />
                  <span>SWAP</span>
                  <span className="text-xs">Entre comptes</span>
                </Button>
              </div>
            </div>

            <div className="border-t pt-4"></div>

            {/* Client (seulement pour revenue, sauf Autres Paiement) */}
            {formData.type_transaction === 'revenue' && formData.categorie !== 'Autres Paiement' && (
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
            )}

            {/* Catégorie */}
            <div className="space-y-2">
              <Label htmlFor="categorie">
                {formData.type_transaction === 'revenue' ? 'Motif' :
                  formData.type_transaction === 'depense' ? 'Catégorie' : 'Type'} *
              </Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) => handleChange('categorie', value)}
              >
                <SelectTrigger className={errors.categorie ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categorie && (
                <p className="text-sm text-red-600">{errors.categorie}</p>
              )}
            </div>

            {/* Sélecteur de Facture (uniquement pour Commande/Facture) */}
            {formData.type_transaction === 'revenue' && (formData.categorie === 'Commande' || formData.categorie === 'Commande (Facture)') && formData.client_id && (
              <div className="space-y-2">
                <Label htmlFor="facture_id">Facture à payer (optionnel)</Label>
                <Select
                  value={formData.facture_id}
                  onValueChange={(value) => {
                    // Ignorer les valeurs spéciales
                    if (value.startsWith('__')) {
                      handleChange('facture_id', '');
                      return;
                    }
                    handleChange('facture_id', value);
                    // Auto-remplir le montant avec le solde restant de la facture
                    const selectedFacture = clientFactures.find(f => f.id === value);
                    if (selectedFacture && selectedFacture.solde_restant) {
                      handleChange('montant', selectedFacture.solde_restant.toString());
                      handleChange('devise', selectedFacture.devise);
                    }
                  }}
                >
                  <SelectTrigger className={errors.facture_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={facturesLoading ? "Chargement..." : "Sélectionner une facture"} />
                  </SelectTrigger>
                  <SelectContent>
                    {facturesLoading ? (
                      <SelectItem value="__loading__" disabled>Chargement des factures...</SelectItem>
                    ) : clientFactures.length === 0 ? (
                      <SelectItem value="__empty__" disabled>Aucune facture non payée</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="__none__">-- Aucune facture --</SelectItem>
                        {clientFactures.map((facture) => (
                          <SelectItem key={facture.id} value={facture.id}>
                            {facture.facture_number} - Solde: {facture.solde_restant?.toFixed(2)} {facture.devise}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {errors.facture_id && (
                  <p className="text-sm text-red-600">{errors.facture_id}</p>
                )}
                <p className="text-xs text-gray-500">
                  💡 Sélectionnez une facture pour lier ce paiement. Le montant sera auto-rempli.
                </p>
              </div>
            )}

            {/* Sélecteur de Colis (uniquement pour Paiement Colis) */}
            {formData.type_transaction === 'revenue' && formData.categorie === 'Paiement Colis' && formData.client_id && (
              <div className="space-y-2">
                <Label htmlFor="colis_id">Colis *</Label>
                <Select
                  value={formData.colis_id}
                  onValueChange={(value) => {
                    if (value.startsWith('__')) {
                      handleChange('colis_id', '');
                      return;
                    }
                    handleChange('colis_id', value);
                  }}
                >
                  <SelectTrigger className={errors.colis_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Sélectionner un colis" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientColis.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Aucun colis trouvé pour ce client
                      </SelectItem>
                    ) : (
                      clientColis.map((colis: any) => (
                        <SelectItem key={colis.id} value={colis.id}>
                          {colis.tracking_chine || colis.id.slice(0, 8)} - {colis.statut}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.colis_id && (
                  <p className="text-sm text-red-600">{errors.colis_id}</p>
                )}
                {!hasFees && (
                  <p className="text-xs text-gray-500">
                    💡 Les paiements colis n'ont pas de frais
                  </p>
                )}
              </div>
            )}

            {/* Mode de paiement (pour revenue et depense) */}
            {formData.type_transaction !== 'transfert' && (
              <div className="space-y-2">
                <Label htmlFor="mode_paiement">
                  Mode de paiement {formData.type_transaction === 'revenue' ? '*' : '(optionnel)'}
                </Label>
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
            )}

            {/* Montant et Devise */}
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
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CDF">CDF (Fc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comptes selon le type */}
            {formData.type_transaction === 'revenue' && (
              <div className="space-y-2">
                <Label htmlFor="compte_destination_id">Compte de destination *</Label>
                <Select
                  value={formData.compte_destination_id}
                  onValueChange={(value) => handleChange('compte_destination_id', value)}
                >
                  <SelectTrigger className={errors.compte_destination_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Où arrive l'argent?" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeComptes.filter(c => c.devise === formData.devise).map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        <div className="flex items-center">
                          <Wallet className="mr-2 h-4 w-4" />
                          {compte.nom} - {compte.solde_actuel.toLocaleString()} {compte.devise}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.compte_destination_id && (
                  <p className="text-sm text-red-600">{errors.compte_destination_id}</p>
                )}
              </div>
            )}

            {formData.type_transaction === 'depense' && (
              <div className="space-y-2">
                <Label htmlFor="compte_source_id">Compte source *</Label>
                <Select
                  value={formData.compte_source_id}
                  onValueChange={(value) => handleChange('compte_source_id', value)}
                >
                  <SelectTrigger className={errors.compte_source_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="D'où sort l'argent?" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeComptes.filter(c => c.devise === formData.devise).map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        <div className="flex items-center">
                          <Wallet className="mr-2 h-4 w-4" />
                          {compte.nom} - {compte.solde_actuel.toLocaleString()} {compte.devise}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.compte_source_id && (
                  <p className="text-sm text-red-600">{errors.compte_source_id}</p>
                )}
              </div>
            )}

            {formData.type_transaction === 'transfert' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="compte_source_id">Compte source *</Label>
                  <Select
                    value={formData.compte_source_id}
                    onValueChange={(value) => handleChange('compte_source_id', value)}
                  >
                    <SelectTrigger className={errors.compte_source_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="De quel compte?" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeComptes.filter(c => c.devise === formData.devise).map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          <div className="flex items-center">
                            <Wallet className="mr-2 h-4 w-4" />
                            {compte.nom} - {compte.solde_actuel.toLocaleString()} {compte.devise}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.compte_source_id && (
                    <p className="text-sm text-red-600">{errors.compte_source_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compte_destination_id">Compte de destination *</Label>
                  <Select
                    value={formData.compte_destination_id}
                    onValueChange={(value) => handleChange('compte_destination_id', value)}
                  >
                    <SelectTrigger className={errors.compte_destination_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Vers quel compte?" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeComptes.filter(c => c.devise === formData.devise && c.id !== formData.compte_source_id).map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          <div className="flex items-center">
                            <Wallet className="mr-2 h-4 w-4" />
                            {compte.nom} - {compte.solde_actuel.toLocaleString()} {compte.devise}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.compte_destination_id && (
                    <p className="text-sm text-red-600">{errors.compte_destination_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frais">Frais de transfert</Label>
                  <Input
                    id="frais"
                    type="number"
                    step="0.01"
                    value={formData.frais}
                    onChange={(e) => handleChange('frais', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date_paiement">Date *</Label>
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    handleChange('date_paiement', formatDateForInput(date));
                  }
                }}
                placeholder="Sélectionner une date"
                className={errors.date_paiement ? 'border-red-500' : ''}
              />
              {errors.date_paiement && (
                <p className="text-sm text-red-600">{errors.date_paiement}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Description (optionnel)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Détails additionnels..."
                rows={3}
              />
            </div>

            {/* Taux de change info */}
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

export default TransactionFormFinancial;
