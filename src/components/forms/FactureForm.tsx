import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Calculator,
  Plane,
  Ship,
  DollarSign,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFactures } from '@/hooks/useFactures';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import type { Facture, FactureItem, Client, CreateFactureData } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

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
  
  const [formData, setFormData] = useState({
    client_id: '',
    type: 'devis' as 'devis' | 'facture',
    mode_livraison: 'aerien' as 'aerien' | 'maritime',
    devise: 'USD' as 'USD' | 'CDF',
    conditions_vente: '',
    notes: '',
    date_emission: new Date().toISOString().split('T')[0]
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

        // Charger les frais de livraison
        const { data: shippingData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'shipping');

        const settings: any = {};
        shippingData?.forEach(item => {
          settings[item.cle] = parseFloat(item.valeur);
        });
        
        setShippingSettings({
          aerien: settings.frais_aerien_par_kg || 16,
          maritime: settings.frais_maritime_par_cbm || 450
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Charger les données de la facture si en mode édition
  useEffect(() => {
    if (facture && isOpen) {
      setFormData({
        client_id: facture.client_id,
        type: facture.type,
        mode_livraison: facture.mode_livraison,
        devise: facture.devise,
        conditions_vente: facture.conditions_vente || '',
        notes: facture.notes || '',
        date_emission: facture.date_emission
      });

      // Charger le client sélectionné
      const client = clients.find(c => c.id === facture.client_id);
      setSelectedClient(client || null);

      // Charger les items (simulation - à adapter selon votre structure)
      if (facture.items) {
        const itemsForm = facture.items.map((item, index) => ({
          ...item,
          tempId: `existing-${item.id}`,
          numero_ligne: index + 1
        }));
        setItems(itemsForm);
      }
    } else {
      // Reset formulaire pour nouvelle facture
      setFormData({
        client_id: '',
        type: 'devis',
        mode_livraison: 'aerien',
        devise: 'USD',
        conditions_vente: '',
        notes: '',
        date_emission: new Date().toISOString().split('T')[0]
      });
      setSelectedClient(null);
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
  }, [facture, isOpen, clients]);

  // Calculer les totaux
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.montant_total, 0);
    const totalPoids = items.reduce((sum, item) => sum + item.poids, 0);
    const shippingFee = formData.mode_livraison === 'aerien' 
      ? totalPoids * shippingSettings.aerien 
      : totalPoids * shippingSettings.maritime;
    const fraisTransportDouane = shippingFee; // Selon votre logique
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
        date_emission: formData.date_emission,
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
      console.error('Erreur lors de la sauvegarde:', error);
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Générer le PDF
  const handleGeneratePDF = async () => {
    if (!facture) return;
    
    try {
      // Récupérer les items complets
      const { data: itemsData } = await supabase
        .from('facture_items')
        .select('*')
        .eq('facture_id', facture.id);

      const factureWithItems = {
        ...facture,
        items: itemsData || []
      };

      await generateFacturePDF(factureWithItems);
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      showError('Erreur lors de la génération du PDF');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {facture ? 'Modifier' : 'Créer'} une {formData.type === 'devis' ? 'Devis' : 'Facture'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                  <Label>Client</Label>
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
                  <Select value={formData.mode_livraison} onValueChange={(value: 'aerien' | 'maritime') => 
                    setFormData(prev => ({ ...prev, mode_livraison: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aerien">
                        <div className="flex items-center">
                          <Plane className="mr-2 h-4 w-4" />
                          Aérien ({shippingSettings.aerien}$/{formData.mode_livraison === 'aerien' ? 'kg' : 'cbm'})
                        </div>
                      </SelectItem>
                      <SelectItem value="maritime">
                        <div className="flex items-center">
                          <Ship className="mr-2 h-4 w-4" />
                          Maritime ({shippingSettings.maritime}$/{formData.mode_livraison === 'maritime' ? 'cbm' : 'kg'})
                        </div>
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

              {/* Informations client sélectionné */}
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
                <Button onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.tempId} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                    <div className="col-span-1">
                      <Label className="text-xs">N°</Label>
                      <div className="font-medium">{item.numero_ligne}</div>
                    </div>
                    
                    <div className="col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                        placeholder="Description du produit"
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        value={item.quantite}
                        onChange={(e) => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Prix unitaire</Label>
                      <Input
                        type="number"
                        value={item.prix_unitaire}
                        onChange={(e) => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs">Poids ({formData.mode_livraison === 'aerien' ? 'kg' : 'cbm'})</Label>
                      <Input
                        type="number"
                        value={item.poids}
                        onChange={(e) => updateItem(item.tempId, 'poids', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Montant total</Label>
                      <div className="font-medium text-emerald-600">
                        {formData.devise === 'USD' ? '$' : ''}{item.montant_total.toFixed(2)}{formData.devise === 'CDF' ? ' FC' : ''}
                      </div>
                    </div>

                    <div className="col-span-1">
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
                    {formData.devise === 'USD' ? '$' : ''}{totals.subtotal.toFixed(2)}{formData.devise === 'CDF' ? ' FC' : ''}
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
                    {formData.devise === 'USD' ? '$' : ''}{totals.shippingFee.toFixed(2)}{formData.devise === 'CDF' ? ' FC' : ''}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Total général</Label>
                  <div className="font-bold text-lg text-emerald-600">
                    {formData.devise === 'USD' ? '$' : ''}{totals.totalGeneral.toFixed(2)}{formData.devise === 'CDF' ? ' FC' : ''}
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
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes additionnelles..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="space-x-2">
              {facture && (
                <Button variant="outline" onClick={handleGeneratePDF}>
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