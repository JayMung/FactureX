"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Calculator,
  Plane,
  Ship,
  Package,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFactures } from '@/hooks/useFactures';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import type { Facture, FactureItem, Client, CreateFactureData } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';

interface FactureItemForm extends Omit<FactureItem, 'id' | 'facture_id' | 'created_at'> {
  tempId: string;
}

const FacturesCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  usePageSetup({
    title: isEditMode ? 'Modifier la Facture' : 'Nouvelle Facture',
    subtitle: isEditMode ? 'Modification d\'une facture existante' : 'Créer une nouvelle facture ou devis'
  });

  const { createFacture, updateFacture, getFactureWithItems } = useFactures();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [shippingSettings, setShippingSettings] = useState({ aerien: 16, maritime: 450 });
  const [currentFacture, setCurrentFacture] = useState<Facture | null>(null);
  const [conditionsDefaut, setConditionsDefaut] = useState({ aerien: '', maritime: '' });
  
  const [formData, setFormData] = useState({
    client_id: '',
    type: 'devis' as 'devis' | 'facture',
    mode_livraison: 'aerien' as 'aerien' | 'maritime',
    devise: 'USD' as 'USD' | 'CDF',
    conditions_vente: '',
    notes: ''
  });

  const [items, setItems] = useState<FactureItemForm[]>([
    {
      tempId: '1',
      numero_ligne: 1,
      image_url: '',
      product_url: '',
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0
    }
  ]);

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .order('nom');
        setClients(clientsData || []);

        // Charger les frais de livraison et conditions de vente
        const { data: settingsData } = await supabase
          .from('settings')
          .select('categorie, cle, valeur')
          .in('categorie', ['shipping', 'facture']);

        const settings: any = {};
        settingsData?.forEach(item => {
          if (item.categorie === 'shipping') {
            settings[item.cle] = parseFloat(item.valeur);
          }
        });
        
        setShippingSettings({
          aerien: settings.frais_aerien_par_kg || 16,
          maritime: settings.frais_maritime_par_cbm || 450
        });

        // Charger les conditions de vente par défaut
        const conditionsAerien = settingsData?.find(s => s.categorie === 'facture' && s.cle === 'conditions_vente_aerien');
        const conditionsMaritime = settingsData?.find(s => s.categorie === 'facture' && s.cle === 'conditions_vente_maritime');
        
        setConditionsDefaut({
          aerien: conditionsAerien?.valeur || '',
          maritime: conditionsMaritime?.valeur || ''
        });
        
        // Charger les conditions selon le mode de livraison par défaut (aérien) uniquement pour nouvelle facture
        if (!isEditMode && conditionsAerien) {
          setFormData(prev => ({ ...prev, conditions_vente: conditionsAerien.valeur }));
        }

        // Charger la facture si en mode édition
        if (isEditMode && id) {
          const factureData = await getFactureWithItems(id);
          setCurrentFacture(factureData);
          
          setFormData({
            client_id: factureData.client_id,
            type: factureData.type,
            mode_livraison: factureData.mode_livraison,
            devise: factureData.devise,
            conditions_vente: factureData.conditions_vente || '',
            notes: factureData.notes || ''
          });

          const client = clientsData?.find(c => c.id === factureData.client_id);
          setSelectedClient(client || null);

          if (factureData.items && factureData.items.length > 0) {
            const itemsForm = factureData.items.map((item, index) => ({
              ...item,
              tempId: `existing-${item.id}`,
              numero_ligne: index + 1
            }));
            setItems(itemsForm);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données');
      }
    };

    fetchData();
  }, [id, isEditMode]);

  // Calculer les totaux
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.montant_total, 0);
    const totalPoids = items.reduce((sum, item) => sum + item.poids, 0);
    const shippingFee = formData.mode_livraison === 'aerien' 
      ? totalPoids * shippingSettings.aerien 
      : totalPoids * shippingSettings.maritime;
    const fraisTransportDouane = shippingFee;
    const totalGeneral = subtotal + fraisTransportDouane;

    return {
      subtotal,
      totalPoids,
      shippingFee,
      fraisTransportDouane,
      totalGeneral
    };
  };

  const totals = calculateTotals();

  // Gérer le changement de client
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData(prev => ({ ...prev, client_id: clientId }));
  };

  // Gérer le changement de mode de livraison
  const handleModeLivraisonChange = (mode: 'aerien' | 'maritime') => {
    setFormData(prev => ({ 
      ...prev, 
      mode_livraison: mode,
      // Mettre à jour les conditions de vente selon le mode choisi (seulement si pas encore modifié manuellement)
      conditions_vente: !isEditMode ? (mode === 'aerien' ? conditionsDefaut.aerien : conditionsDefaut.maritime) : prev.conditions_vente
    }));
  };

  // Ajouter une ligne
  const addItem = () => {
    const newItem: FactureItemForm = {
      tempId: Date.now().toString(),
      numero_ligne: items.length + 1,
      image_url: '',
      product_url: '',
      quantite: 1,
      description: '',
      prix_unitaire: 0,
      poids: 0,
      montant_total: 0
    };
    setItems([...items, newItem]);
  };

  // Supprimer une ligne
  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      const updatedItems = items.filter(item => item.tempId !== tempId);
      const renumberedItems = updatedItems.map((item, index) => ({
        ...item,
        numero_ligne: index + 1
      }));
      setItems(renumberedItems);
    }
  };

  // Mettre à jour un item
  const updateItem = (tempId: string, field: keyof FactureItemForm, value: any) => {
    const updatedItems = items.map(item => {
      if (item.tempId === tempId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculer le montant total si nécessaire
        if (field === 'quantite' || field === 'prix_unitaire') {
          updatedItem.montant_total = updatedItem.quantite * updatedItem.prix_unitaire;
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Sauvegarder la facture
  const handleSave = async () => {
    if (!formData.client_id || items.some(item => !item.description || item.prix_unitaire <= 0)) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const factureData: CreateFactureData = {
        client_id: formData.client_id,
        type: formData.type,
        mode_livraison: formData.mode_livraison,
        devise: formData.devise,
        conditions_vente: formData.conditions_vente,
        notes: formData.notes,
        items: items.map(item => ({
          numero_ligne: item.numero_ligne,
          image_url: item.image_url,
          product_url: item.product_url,
          quantite: item.quantite,
          description: item.description,
          prix_unitaire: item.prix_unitaire,
          poids: item.poids,
          montant_total: item.montant_total
        }))
      };

      if (isEditMode && id) {
        await updateFacture(id, factureData);
        showSuccess('Facture mise à jour avec succès');
      } else {
        await createFacture(factureData);
        showSuccess('Facture créée avec succès');
      }

      navigate('/factures');
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Générer le PDF
  const handleGeneratePDF = async () => {
    if (!currentFacture) return;
    
    try {
      const { data: itemsData } = await supabase
        .from('facture_items')
        .select('*')
        .eq('facture_id', currentFacture.id);

      const factureWithItems = {
        ...currentFacture,
        items: itemsData || []
      };

      await generateFacturePDF(factureWithItems);
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      showError('Erreur lors de la génération du PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return formData.devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
  };

  return (
    <ProtectedRouteEnhanced requiredModule="factures" requiredPermission={isEditMode ? "update" : "create"}>
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/factures')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux factures
            </Button>
            <div className="space-x-2">
              {isEditMode && currentFacture && (
                <Button variant="outline" onClick={handleGeneratePDF}>
                  <Upload className="mr-2 h-4 w-4" />
                  Générer PDF
                </Button>
              )}
              <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Sauvegarde...' : (isEditMode ? 'Mettre à jour' : 'Créer')}
              </Button>
            </div>
          </div>

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value: 'devis' | 'facture') => 
                    setFormData(prev => ({ ...prev, type: value }))}>
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
                  <Label>Client *</Label>
                  <Select value={formData.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mode livraison</Label>
                  <Select value={formData.mode_livraison} onValueChange={handleModeLivraisonChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aerien">
                        🛫 Aérien ({shippingSettings.aerien}$/kg)
                      </SelectItem>
                      <SelectItem value="maritime">
                        🚢 Maritime ({shippingSettings.maritime}$/cbm)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Devise</Label>
                  <Select value={formData.devise} onValueChange={(value: 'USD' | 'CDF') => 
                    setFormData(prev => ({ ...prev, devise: value }))}>
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

              {/* Informations client */}
              {selectedClient && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Informations client</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div><strong>Nom:</strong> {selectedClient.nom}</div>
                    <div><strong>Téléphone:</strong> {selectedClient.telephone}</div>
                    <div><strong>Ville:</strong> {selectedClient.ville}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Articles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Articles</CardTitle>
                <Button onClick={addItem} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 font-medium text-sm w-[50px]">N°</th>
                      <th className="text-left p-2 font-medium text-sm w-[120px]">Image</th>
                      <th className="text-left p-2 font-medium text-sm min-w-[250px]">Description *</th>
                      <th className="text-left p-2 font-medium text-sm w-[80px]">Qty *</th>
                      <th className="text-left p-2 font-medium text-sm w-[100px]">Prix unit. *</th>
                      <th className="text-left p-2 font-medium text-sm w-[90px]">Poids ({formData.mode_livraison === 'aerien' ? 'kg' : 'cbm'})</th>
                      <th className="text-left p-2 font-medium text-sm w-[110px]">Montant total</th>
                      <th className="text-left p-2 font-medium text-sm w-[150px]">Lien Produit</th>
                      <th className="text-center p-2 font-medium text-sm w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.tempId} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center font-medium align-top">{item.numero_ligne}</td>
                        
                        {/* Image avec aperçu */}
                        <td className="p-2 align-top">
                          <div className="space-y-2">
                            {item.image_url && (
                              <div className="w-20 h-20 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                                <img 
                                  src={item.image_url} 
                                  alt="Preview" 
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<ImageIcon class="h-8 w-8 text-gray-300" />';
                                  }}
                                />
                              </div>
                            )}
                            <Input
                              value={item.image_url || ''}
                              onChange={(e) => updateItem(item.tempId, 'image_url', e.target.value)}
                              placeholder="URL image"
                              className="w-full text-xs"
                            />
                          </div>
                        </td>
                        
                        {/* Description avec wrap */}
                        <td className="p-2 align-top">
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                            placeholder="Description du produit"
                            className="w-full min-h-[80px]"
                            rows={3}
                          />
                        </td>
                        
                        {/* Quantité */}
                        <td className="p-2 align-top">
                          <Input
                            type="number"
                            value={item.quantite}
                            onChange={(e) => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-full"
                          />
                        </td>
                        
                        {/* Prix unitaire */}
                        <td className="p-2 align-top">
                          <Input
                            type="number"
                            value={item.prix_unitaire}
                            onChange={(e) => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full"
                          />
                        </td>
                        
                        {/* Poids */}
                        <td className="p-2 align-top">
                          <Input
                            type="number"
                            value={item.poids}
                            onChange={(e) => updateItem(item.tempId, 'poids', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full"
                          />
                        </td>
                        
                        {/* Montant total */}
                        <td className="p-2 align-top">
                          <div className="font-medium text-emerald-600">
                            {formatCurrency(item.montant_total)}
                          </div>
                        </td>
                        
                        {/* Lien Produit */}
                        <td className="p-2 align-top">
                          <Input
                            value={item.product_url || ''}
                            onChange={(e) => updateItem(item.tempId, 'product_url', e.target.value)}
                            placeholder="URL produit"
                            className="w-full text-xs"
                          />
                        </td>
                        
                        {/* Actions */}
                        <td className="p-2 text-center align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.tempId)}
                            disabled={items.length === 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Récapitulatif */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm text-gray-600">Sous-total</Label>
                  <div className="text-xl font-medium mt-1">
                    {formatCurrency(totals.subtotal)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Poids total</Label>
                  <div className="text-xl font-medium mt-1">
                    {totals.totalPoids.toFixed(2)} {formData.mode_livraison === 'aerien' ? 'kg' : 'cbm'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Frais transport</Label>
                  <div className="text-xl font-medium mt-1">
                    {formatCurrency(totals.shippingFee)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Total général</Label>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(totals.totalGeneral)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditions et notes */}
          <Card>
            <CardHeader>
              <CardTitle>Conditions et notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Conditions de vente</Label>
                <Textarea
                  value={formData.conditions_vente}
                  onChange={(e) => setFormData(prev => ({ ...prev, conditions_vente: e.target.value }))}
                  placeholder="Conditions de vente..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes additionnelles..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions footer */}
          <div className="flex justify-end space-x-2 pb-6">
            <Button variant="outline" onClick={() => navigate('/factures')}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Sauvegarde...' : (isEditMode ? 'Mettre à jour' : 'Créer')}
            </Button>
          </div>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default FacturesCreate;
