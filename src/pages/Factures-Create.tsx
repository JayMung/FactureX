"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  Calculator,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useFactures } from '../hooks/useFactures';
import { useFees } from '../hooks/useSettings';
import { showSuccess, showError } from '@/utils/toast';
import ImagePreview from '@/components/ui/ImagePreview';
import { supabase } from '@/integrations/supabase/client';
import type { Client, CreateFactureData, FactureItem } from '@/types';

const FacturesCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  usePageSetup({
    title: isEditMode ? 'Modifier Facture/Devis' : 'Nouvelle Facture/Devis',
    subtitle: isEditMode ? 'Modifiez votre facture ou devis' : 'Créez une nouvelle facture ou un devis'
  });

  const navigate = useNavigate();
  const { clients } = useClients(1, {});
  const { fees } = useFees();
  const { createFacture, updateFacture, getFactureWithItems } = useFactures();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [formData, setFormData] = useState<CreateFactureData>({
    client_id: '',
    type: 'devis',
    mode_livraison: 'aerien',
    devise: 'USD',
    date_emission: new Date().toISOString().split('T')[0],
    statut: 'brouillon',
    conditions_vente: '',
    notes: '',
    informations_bancaires: '',
    items: []
  });

  const [items, setItems] = useState<FactureItem[]>([]);
  const [customFraisPercentage, setCustomFraisPercentage] = useState<number | null>(null);
  const [isEditingFrais, setIsEditingFrais] = useState(false);
  const [customTransportFee, setCustomTransportFee] = useState<number | null>(null);
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [defaultConditions, setDefaultConditions] = useState({
    aerien: '',
    maritime: ''
  });

  // Charger les conditions de vente par défaut depuis les paramètres
  useEffect(() => {
    const loadDefaultConditions = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('categorie', 'facture')
          .in('cle', ['conditions_vente_aerien', 'conditions_vente_maritime']);
        
        if (data) {
          const conditions: any = {};
          data.forEach(item => {
            if (item.cle === 'conditions_vente_aerien') {
              conditions.aerien = item.valeur || '';
            } else if (item.cle === 'conditions_vente_maritime') {
              conditions.maritime = item.valeur || '';
            }
          });
          setDefaultConditions(conditions);
          
          // Initialiser avec les conditions par défaut si pas en mode édition
          if (!isEditMode) {
            setFormData(prev => ({
              ...prev,
              conditions_vente: formData.mode_livraison === 'aerien' 
                ? conditions.aerien 
                : conditions.maritime
            }));
          }
        }
      } catch (error) {
        console.error('Error loading default conditions:', error);
      }
    };
    
    loadDefaultConditions();
  }, []);

  // Charger les données de la facture en mode édition
  useEffect(() => {
    const loadFacture = async () => {
      if (!isEditMode || !id) return;
      
      setLoadingData(true);
      try {
        const facture = await getFactureWithItems(id);
        if (!facture) {
          showError('Facture introuvable');
          navigate('/factures');
          return;
        }

        setFormData({
          client_id: facture.client_id,
          type: facture.type as 'devis' | 'facture',
          mode_livraison: facture.mode_livraison,
          devise: facture.devise,
          date_emission: facture.date_emission.split('T')[0],
          statut: facture.statut,
          conditions_vente: facture.conditions_vente || '',
          notes: facture.notes || '',
          informations_bancaires: facture.informations_bancaires || '',
          items: []
        });

        const loadedItems = (facture.items || []).map((item: any) => ({
          tempId: item.id || Date.now().toString() + Math.random(),
          id: item.id,
          numero_ligne: item.numero_ligne,
          quantite: item.quantite,
          description: item.description || '',
          prix_unitaire: item.prix_unitaire,
          poids: item.poids,
          montant_total: item.montant_total,
          image_url: item.image_url,
          product_url: item.product_url
        }));
        setItems(loadedItems);
      } catch (error) {
        console.error('Error loading facture:', error);
        showError('Erreur lors du chargement de la facture');
        navigate('/factures');
      } finally {
        setLoadingData(false);
      }
    };

    loadFacture();
  }, [id, isEditMode]);

  // Mettre à jour automatiquement les conditions de vente quand le mode de livraison change
  useEffect(() => {
    // Ne pas écraser si l'utilisateur a modifié manuellement
    const currentConditions = formData.conditions_vente;
    const expectedAerienConditions = defaultConditions.aerien;
    const expectedMaritimeConditions = defaultConditions.maritime;
    
    // Mettre à jour seulement si les conditions actuelles correspondent aux conditions par défaut
    // ou si elles sont vides
    if (!currentConditions || 
        currentConditions === expectedAerienConditions || 
        currentConditions === expectedMaritimeConditions) {
      const newConditions = formData.mode_livraison === 'aerien' 
        ? defaultConditions.aerien 
        : defaultConditions.maritime;
      
      if (newConditions && currentConditions !== newConditions) {
        setFormData(prev => ({ ...prev, conditions_vente: newConditions }));
      }
    }
  }, [formData.mode_livraison, defaultConditions]);

  const addItem = () => {
    const newItem: FactureItem = {
      tempId: Date.now().toString(),
      numero_ligne: 1,
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0
    };
    const newItems = [newItem, ...items];
    const reindexed = newItems.map((it, idx) => ({ ...it, numero_ligne: idx + 1 }));
    setItems(reindexed);
  };

  const updateItem = (tempId: string, field: keyof FactureItem, value: any) => {
    setItems(items.map(item => {
      if (item.tempId === tempId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate montant_total if quantite or prix_unitaire changes
        if (field === 'quantite' || field === 'prix_unitaire') {
          updatedItem.montant_total = updatedItem.quantite * updatedItem.prix_unitaire;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (tempId: string) => {
    const filtered = items.filter(item => item.tempId !== tempId);
    const reindexed = filtered.map((it, idx) => ({ ...it, numero_ligne: idx + 1 }));
    setItems(reindexed);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.montant_total, 0);
    const totalPoids = items.reduce((sum, item) => sum + item.poids, 0);
    
    // Frais (15% du sous-total) depuis les settings ou custom
    const fraisPercentage = customFraisPercentage !== null ? customFraisPercentage : (fees?.commande || 15);
    const frais = subtotal * (fraisPercentage / 100);
    
    // Get shipping rates from settings or custom value
    const fraisAerien = 16; // Default value
    const fraisMaritime = 450; // Default value
    
    // Use custom transport fee if set, otherwise calculate normally
    const fraisTransportDouane = customTransportFee !== null 
      ? customTransportFee 
      : (formData.mode_livraison === 'aerien' 
        ? totalPoids * fraisAerien 
        : totalPoids * fraisMaritime);
    
    const totalGeneral = subtotal + frais + fraisTransportDouane;

    return {
      subtotal,
      totalPoids,
      frais,
      fraisPercentage,
      fraisTransportDouane,
      customTransportFee,
      totalGeneral
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      showError('Veuillez sélectionner un client');
      return;
    }

    if (items.length === 0) {
      showError('Veuillez ajouter au moins un article');
      return;
    }

    setLoading(true);
    
    try {
      if (isEditMode && id) {
        // Mode édition
        await updateFacture(id, {
          ...formData,
          items: items.map(({ tempId, id: itemId, ...item }) => item)
        });
        // Toast déjà affiché par le hook
        navigate(`/factures/preview/${id}`);
      } else {
        // Mode création
        const factureData: CreateFactureData = {
          ...formData,
          items: items.map(({ tempId, ...item }) => item)
        };
        const newFacture = await createFacture(factureData);
        // Toast déjà affiché par le hook
        navigate(`/factures/preview/${newFacture.id}`);
      }
    } catch (error: any) {
      console.error('Error saving facture:', error);
      showError(error.message || (isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/factures')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Modifier' : 'Nouveau'} {formData.type === 'devis' ? 'Devis' : 'Facture'}
            </h1>
            <p className="text-gray-500">
              {isEditMode ? 'Modifiez votre document' : 'Créez un nouveau document pour vos clients'}
            </p>
          </div>
          <div className="w-24"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'devis' | 'facture') => 
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="devis">Devis</SelectItem>
                          <SelectItem value="facture">Facture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date_emission">Date d'émission</Label>
                      <Input
                        id="date_emission"
                        type="date"
                        value={formData.date_emission}
                        onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="client_id">Client</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mode_livraison">Mode de livraison</Label>
                      <Select
                        value={formData.mode_livraison}
                        onValueChange={(value: 'aerien' | 'maritime') => 
                          setFormData({ ...formData, mode_livraison: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aerien">Aérien</SelectItem>
                          <SelectItem value="maritime">Maritime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="devise">Devise</Label>
                      <Select
                        value={formData.devise}
                        onValueChange={(value: 'USD' | 'CDF') => 
                          setFormData({ ...formData, devise: value })
                        }
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
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      Articles
                    </CardTitle>
                    <Button type="button" onClick={addItem} variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un article
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun article ajouté</p>
                      <p className="text-sm">Cliquez sur "Ajouter un article" pour commencer</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.tempId} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">Article {item.numero_ligne}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.tempId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Quantité</Label>
                              <Input
                                type="number"
                                value={item.quantite}
                                onChange={(e) => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                                min="1"
                              />
                            </div>
                            <div>
                              <Label>Poids (kg)</Label>
                              <Input
                                type="number"
                                value={item.poids}
                                onChange={(e) => updateItem(item.tempId, 'poids', parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                              placeholder="Description de l'article"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Prix unitaire</Label>
                              <Input
                                type="number"
                                value={item.prix_unitaire}
                                onChange={(e) => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div>
                              <Label>Montant total</Label>
                              <Input
                                value={item.montant_total.toFixed(2)}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>URL de l'image (optionnel)</Label>
                            <Input
                              value={item.image_url || ''}
                              onChange={(e) => updateItem(item.tempId, 'image_url', e.target.value.trim())}
                              placeholder="https://... (URL image)"
                              className="w-full text-xs"
                            />
                            {item.image_url && (
                              <div className="mt-2">
                                <ImagePreview 
                                  url={item.image_url} 
                                  alt={`Article ${item.numero_ligne}`}
                                  size="md"
                                  className="border rounded"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes et conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="conditions_vente">Conditions de vente</Label>
                    <Textarea
                      id="conditions_vente"
                      value={formData.conditions_vente}
                      onChange={(e) => setFormData({ ...formData, conditions_vente: e.target.value })}
                      placeholder="Conditions de vente spécifiques..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes supplémentaires..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-screen lg:overflow-visible">
              {/* Totals */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Calculator className="mr-2 h-5 w-5" />
                      Récapitulatif
                    </CardTitle>
                    {(customFraisPercentage !== null || customTransportFee !== null) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomFraisPercentage(null);
                          setCustomTransportFee(null);
                          setIsEditingFrais(false);
                          setIsEditingTransport(false);
                        }}
                        className="h-8 w-8 p-0"
                        title="Réinitialiser les calculs automatiques"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sous-total:</span>
                      <span className="font-medium">
                        {formData.devise === 'USD' ? '$' : ''}{totals.subtotal.toFixed(2)}
                        {formData.devise === 'CDF' ? ' CDF' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      {isEditingFrais ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Frais</span>
                          <Input
                            type="number"
                            value={customFraisPercentage !== null ? customFraisPercentage : totals.fraisPercentage}
                            onChange={(e) => setCustomFraisPercentage(parseFloat(e.target.value) || 0)}
                            onBlur={() => setIsEditingFrais(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setIsEditingFrais(false);
                            }}
                            className="w-16 h-6 text-sm px-2"
                            autoFocus
                          />
                          <span className="text-gray-600">%:</span>
                        </div>
                      ) : (
                        <span 
                          className="text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                          onDoubleClick={() => setIsEditingFrais(true)}
                          title="Double-cliquer pour modifier"
                        >
                          Frais ({totals.fraisPercentage}%):
                        </span>
                      )}
                      <span className="font-medium">
                        {formData.devise === 'USD' ? '$' : ''}{totals.frais.toFixed(2)}
                        {formData.devise === 'CDF' ? ' CDF' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      {isEditingTransport ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Frais transport & douane:</span>
                          <Input
                            type="number"
                            value={customTransportFee !== null ? customTransportFee : totals.fraisTransportDouane}
                            onChange={(e) => setCustomTransportFee(parseFloat(e.target.value) || 0)}
                            onBlur={() => setIsEditingTransport(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setIsEditingTransport(false);
                            }}
                            className="w-24 h-6 text-sm px-2"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span 
                          className="text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                          onDoubleClick={() => setIsEditingTransport(true)}
                          title="Double-cliquer pour modifier (forfait)"
                        >
                          Frais transport & douane:
                        </span>
                      )}
                      <span className="font-medium">
                        {formData.devise === 'USD' ? '$' : ''}{totals.fraisTransportDouane.toFixed(2)}
                        {formData.devise === 'CDF' ? ' CDF' : ''}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total général:</span>
                        <span className="text-green-500">
                          {formData.devise === 'USD' ? '$' : ''}{totals.totalGeneral.toFixed(2)}
                          {formData.devise === 'CDF' ? ' CDF' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isEditMode ? 'Mise à jour...' : 'Création en cours...'}
                        </div>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {isEditMode ? 'Mettre à jour' : 'Créer'} le {formData.type === 'devis' ? 'devis' : 'facture'}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/factures')}
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default FacturesCreate;