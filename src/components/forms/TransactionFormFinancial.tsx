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
import { Loader2, Save, X, DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import type { Transaction } from '@/types';
import { useAllClients } from '@/hooks/useClients';
import { useExchangeRates } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { toast } from 'sonner';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: Transaction | undefined;
}

// Catégories par type de transaction
const REVENUE_CATEGORIES = [
  { value: 'Commande', label: 'Commande (Achat client)' },
  { value: 'Transfert', label: 'Transfert d\'argent' },
  { value: 'Retrait Colis', label: 'Retrait Colis' },
  { value: 'Vente', label: 'Vente directe' },
  { value: 'Autre', label: 'Autre revenue' }
];

const DEPENSE_CATEGORIES = [
  { value: 'Paiement Fournisseur', label: 'Paiement Fournisseur' },
  { value: 'Paiement Shipping', label: 'Paiement Shipping' },
  { value: 'Loyer', label: 'Loyer' },
  { value: 'Salaires', label: 'Salaires' },
  { value: 'Frais Installation', label: 'Frais d\'Installation' },
  { value: 'Achat Biens', label: 'Achat Biens' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Carburant', label: 'Carburant' },
  { value: 'Autre', label: 'Autre dépense' }
];

const TransactionFormFinancial: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  transaction 
}) => {
  const [formData, setFormData] = useState({
    type_transaction: 'revenue' as 'revenue' | 'depense' | 'transfert',
    client_id: '',
    montant: '',
    devise: 'USD' as 'USD' | 'CDF',
    categorie: 'Commande',
    date_paiement: new Date().toISOString().split('T')[0],
    compte_source_id: '',
    compte_destination_id: '',
    notes: '',
    frais: '0'
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { clients } = useAllClients();
  const { rates } = useExchangeRates();
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();
  const { comptes } = useComptesFinanciers();

  const isEditing = !!transaction;
  const isLoading = isCreating || isUpdating;

  // Charger les données de la transaction si en mode édition
  useEffect(() => {
    if (transaction && isEditing) {
      setFormData({
        type_transaction: transaction.type_transaction || 'revenue',
        client_id: transaction.client_id || '',
        montant: transaction.montant.toString(),
        devise: transaction.devise as 'USD' | 'CDF',
        categorie: transaction.categorie || transaction.motif || 'Commande',
        date_paiement: transaction.date_paiement?.split('T')[0] || new Date().toISOString().split('T')[0],
        compte_source_id: transaction.compte_source_id || '',
        compte_destination_id: transaction.compte_destination_id || '',
        notes: transaction.notes || '',
        frais: transaction.frais?.toString() || '0'
      });

      if (transaction.date_paiement) {
        setSelectedDate(new Date(transaction.date_paiement));
      }
    }
  }, [transaction, isEditing]);

  // Reset catégorie when type changes
  useEffect(() => {
    if (formData.type_transaction === 'revenue') {
      setFormData(prev => ({ ...prev, categorie: 'Commande', client_id: prev.client_id || '' }));
    } else if (formData.type_transaction === 'depense') {
      setFormData(prev => ({ ...prev, categorie: 'Paiement Fournisseur', client_id: '' }));
    } else if (formData.type_transaction === 'transfert') {
      setFormData(prev => ({ ...prev, categorie: 'Transfert', client_id: '' }));
    }
  }, [formData.type_transaction]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation client (requis seulement pour revenue)
    if (formData.type_transaction === 'revenue' && !formData.client_id) {
      newErrors.client_id = 'Le client est requis pour un revenue';
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
        statut: 'En attente',
        notes: formData.notes,
        frais: parseFloat(formData.frais) || 0,
        taux_usd_cny: rates?.usdToCny || 0,
        taux_usd_cdf: rates?.usdToCdf || 0,
      };

      // Ajouter les champs conditionnels
      if (formData.client_id) {
        transactionData.client_id = formData.client_id;
      }

      if (formData.compte_source_id) {
        transactionData.compte_source_id = formData.compte_source_id;
      }

      if (formData.compte_destination_id) {
        transactionData.compte_destination_id = formData.compte_destination_id;
      }

      // Calculer bénéfice selon le type
      if (formData.type_transaction === 'revenue') {
        transactionData.benefice = parseFloat(formData.frais) || 0;
      } else if (formData.type_transaction === 'depense') {
        transactionData.benefice = -parseFloat(formData.montant);
      } else if (formData.type_transaction === 'transfert') {
        transactionData.benefice = parseFloat(formData.frais) || 0;
      }

      if (isEditing && transaction) {
        await updateTransaction(transaction.id, transactionData);
        toast.success('Transaction mise à jour avec succès');
      } else {
        await createTransaction(transactionData);
        toast.success('Transaction créée avec succès');
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
        date_paiement: new Date().toISOString().split('T')[0],
        compte_source_id: '',
        compte_destination_id: '',
        notes: '',
        frais: '0'
      });
      setErrors({});
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      toast.error(error?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const activeComptes = comptes.filter(c => c.is_active);
  const categories = formData.type_transaction === 'revenue' 
    ? REVENUE_CATEGORIES 
    : formData.type_transaction === 'depense'
    ? DEPENSE_CATEGORIES
    : [{ value: 'Transfert', label: 'Transfert entre comptes' }];

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
                  className={`flex flex-col items-center justify-center h-24 ${
                    formData.type_transaction === 'revenue' ? 'bg-green-500 hover:bg-green-600' : ''
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
                  className={`flex flex-col items-center justify-center h-24 ${
                    formData.type_transaction === 'depense' ? 'bg-red-500 hover:bg-red-600' : ''
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
                  className={`flex flex-col items-center justify-center h-24 ${
                    formData.type_transaction === 'transfert' ? 'bg-blue-500 hover:bg-blue-600' : ''
                  }`}
                  onClick={() => handleChange('type_transaction', 'transfert')}
                >
                  <ArrowRightLeft className="h-6 w-6 mb-2" />
                  <span>TRANSFERT</span>
                  <span className="text-xs">Entre comptes</span>
                </Button>
              </div>
            </div>

            <div className="border-t pt-4"></div>

            {/* Client (seulement pour revenue) */}
            {formData.type_transaction === 'revenue' && (
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
