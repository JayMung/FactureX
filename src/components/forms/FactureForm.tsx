import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  Upload,
  Calculator
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFactures } from '@/hooks/useFactures';
import type { Facture, FactureItem, Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { validateFactureForm } from '@/lib/validation';
import { formatCurrency } from '@/utils/formatCurrency';

interface FactureFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  facture?: Facture | null;
}

interface FactureItemForm extends Omit<FactureItem, 'id' | 'facture_id' | 'created_at'> {
  tempId: string;
}

const FactureForm: React.FC<FactureFormProps> = ({ isOpen, onClose, onSuccess, facture }) => {
  const { createFacture, updateFacture } = useFactures();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [shippingSettings, setShippingSettings] = useState({ aerien: 16, maritime: 450 });
  const [defaultConditionsVente, setDefaultConditionsVente] = useState('');

  const [formData, setFormData] = useState<{
    client_id: string;
    type: 'devis' | 'facture';
    mode_livraison: 'aerien' | 'maritime';
    devise: 'USD' | 'CDF' | 'CNY';
    conditions_vente: string;
    notes: string;
    date_emission: string;
    date_echeance: string;
  }>({
    client_id: '',
    type: 'devis',
    mode_livraison: 'aerien',
    devise: 'USD',
    conditions_vente: '',
    notes: '',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
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

  // Charger les clients et les paramètres
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .order('nom');
        setClients(clientsData || []);

        // Charger les paramètres
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .in('cle', ['frais_livraison_aerien', 'frais_livraison_maritime', 'conditions_vente_defaut']);

        if (settingsData) {
          const settings = settingsData.reduce((acc, setting) => {
            acc[setting.cle.replace('frais_livraison_', '')] = parseFloat(setting.valeur);
            return acc;
          }, {} as Record<string, number>);

          setShippingSettings({
            aerien: settings.aerien || 16,
            maritime: settings.maritime || 450
          });

          const conditionsVente = settingsData.find(s => s.cle === 'conditions_vente_defaut');
          setDefaultConditionsVente(conditionsVente?.valeur || '');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Charger les données de la facture si mode édition
  useEffect(() => {
    if (facture && isOpen) {
      setFormData({
        client_id: facture.client_id,
        type: facture.type,
        mode_livraison: facture.mode_livraison,
        devise: facture.devise,
        conditions_vente: facture.conditions_vente || '',
        notes: facture.notes || '',
        date_emission: facture.date_emission,
        date_echeance: facture.date_echeance || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
      });

      // Charger les items
      const loadItems = async () => {
        try {
          const { data: itemsData } = await supabase
            .from('facture_items')
            .select('*')
            .eq('facture_id', facture.id)
            .order('numero_ligne');

          if (itemsData && itemsData.length > 0) {
            const formattedItems = itemsData.map(item => ({
              tempId: item.id,
              numero_ligne: item.numero_ligne,
              image_url: item.image_url || '',
              product_url: item.product_url || '',
              quantite: item.quantite,
              description: item.description,
              prix_unitaire: item.prix_unitaire,
              poids: item.poids,
              montant_total: item.montant_total
            }));
            setItems(formattedItems);
          } else {
            setItems([{
              tempId: '1',
              numero_ligne: 1,
              image_url: '',
              product_url: '',
              quantite: 1,
              description: '',
              prix_unitaire: 0,
              poids: 0,
              montant_total: 0
            }]);
          }
        } catch (error) {
          console.error('Error loading items:', error);
        }
      };

      loadItems();
    } else if (!facture && isOpen) {
      // Reset form pour nouvelle facture
      setFormData({
        client_id: '',
        type: 'devis',
        mode_livraison: 'aerien',
        devise: 'USD',
        conditions_vente: defaultConditionsVente,
        notes: '',
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
      });
      setItems([{
        tempId: '1',
        numero_ligne: 1,
        image_url: '',
        product_url: '',
        quantite: 1,
        description: '',
        prix_unitaire: 0,
        poids: 0,
        montant_total: 0
      }]);
    }
  }, [facture, isOpen, defaultConditionsVente]);

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

  // Gérer le changement de client
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData(prev => ({ ...prev, client_id: clientId }));
  };

  // Ajouter un item
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

  // Supprimer un item
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

        // Recalculer le montant total si prix ou quantité change
        if (field === 'prix_unitaire' || field === 'quantite') {
          updatedItem.montant_total = updatedItem.prix_unitaire * updatedItem.quantite;
        }

        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Sauvegarder la facture
  const handleSave = async () => {
    setLoading(true);
    try {
      const validationResult = validateFactureForm({
        ...formData,
        items: items
      });

      if (!validationResult.isValid) {
        showError(validationResult.errors?.[0] || 'Veuillez corriger les erreurs dans le formulaire');
        return;
      }

      const factureData = {
        ...formData,
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

      if (facture) {
        await updateFacture(facture.id, factureData);
        showSuccess('Facture mise à jour avec succès');
      } else {
        await createFacture(factureData);
        showSuccess('Facture créée avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving facture:', error);
      showError('Erreur lors de la sauvegarde de la facture');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {facture ? 'Modifier' : 'Créer'} {formData.type === 'devis' ? 'Devis' : 'Facture'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulaire principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <ClientCombobox
                clients={clients}
                value={formData.client_id}
                onValueChange={handleClientChange}
                placeholder="Sélectionner un client"
              />
            </div>

            <div>
              <Label>Type</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'devis' | 'facture' }))}
                className="w-full p-2 border rounded"
              >
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </select>
            </div>

            <div>
              <Label>Mode de livraison</Label>
              <select
                value={formData.mode_livraison}
                onChange={(e) => setFormData(prev => ({ ...prev, mode_livraison: e.target.value as 'aerien' | 'maritime' }))}
                className="w-full p-2 border rounded"
              >
                <option value="aerien">Aérien</option>
                <option value="maritime">Maritime</option>
              </select>
            </div>

            <div>
              <Label>Devise</Label>
              <select
                value={formData.devise}
                onChange={(e) => setFormData(prev => ({ ...prev, devise: e.target.value as 'USD' | 'CDF' | 'CNY' }))}
                className="w-full p-2 border rounded"
              >
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>

          {/* Info client */}
          {selectedClient && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <strong>Nom:</strong> {selectedClient.nom}
                  </div>
                  <div>
                    <strong>Téléphone:</strong> {selectedClient.telephone}
                  </div>
                  <div>
                    <strong>Ville:</strong> {selectedClient.ville}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Articles</span>
                <Button onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un article
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.tempId} className="border rounded-lg p-4 space-y-3">
                    {/* Ligne 1: N°, Description, Quantité, Prix, Montant, Delete */}
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-1">
                        <Label className="text-xs">N°</Label>
                        <div className="font-medium text-center">{item.numero_ligne}</div>
                      </div>

                      <div className="col-span-5">
                        <Label className="text-xs">Description *</Label>
                        <Textarea
                          id={`description-${item.tempId}`}
                          value={item.description}
                          onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                          placeholder="Description du produit"
                          rows={2}
                          className="resize-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Quantité *</Label>
                        <Input
                          type="number"
                          value={item.quantite}
                          onChange={(e) => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Prix unitaire *</Label>
                        <Input
                          type="number"
                          value={item.prix_unitaire}
                          onChange={(e) => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="col-span-1">
                        <Label className="text-xs">Montant</Label>
                        <div className="font-medium text-green-600 text-sm">
                          {formatCurrency(item.montant_total, formData.devise)}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <Label className="text-xs">&nbsp;</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.tempId)}
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Ligne 2: URL Image et URL Produit */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">URL Image du produit</Label>
                        <Input
                          type="url"
                          value={item.image_url}
                          onChange={(e) => updateItem(item.tempId, 'image_url', e.target.value)}
                          placeholder="https://..."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Lien du produit</Label>
                        <Input
                          type="url"
                          value={item.product_url}
                          onChange={(e) => updateItem(item.tempId, 'product_url', e.target.value)}
                          placeholder="https://..."
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Sous-total</Label>
                  <div className="font-medium">
                    {formatCurrency(totals.subtotal, formData.devise)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Poids total</Label>
                  <div className="font-medium">
                    {totals.totalPoids.toFixed(2)} {formData.mode_livraison === 'aerien' ? 'kg' : 'cbm'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Frais transport</Label>
                  <div className="font-medium">
                    {formatCurrency(totals.shippingFee, formData.devise)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Total général</Label>
                  <div className="font-bold text-lg text-green-600">
                    {formatCurrency(totals.totalGeneral, formData.devise)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditions de vente */}
          <Card>
            <CardHeader>
              <CardTitle>Conditions de vente</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Conditions de vente</Label>
                <Textarea
                  value={formData.conditions_vente}
                  onChange={(e) => setFormData(prev => ({ ...prev, conditions_vente: e.target.value }))}
                  placeholder="Conditions de vente..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="space-x-2">
              {facture && (
                <Button variant="outline" onClick={() => { }}>
                  <Upload className="mr-2 h-4 w-4" />
                  Générer PDF
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Sauvegarde...' : (facture ? 'Mettre à jour' : 'Créer')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactureForm;
