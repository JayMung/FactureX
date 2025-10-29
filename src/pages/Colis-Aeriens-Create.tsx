"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane, Save, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Client, Transitaire } from '@/types';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';

const ColisAeriensCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);
  const [tarifRegulier, setTarifRegulier] = useState(16);
  const [tarifExpress, setTarifExpress] = useState(25);

  // État du formulaire
  const [formData, setFormData] = useState({
    client_id: '',
    fournisseur: '',
    tracking_chine: '',
    numero_commande: '',
    poids: '',
    tarif_kg: '',
    transitaire_id: '',
    date_expedition: '',
    date_arrivee_agence: '',
    statut: 'en_preparation',
    contenu_description: '',
    notes: ''
  });

  usePageSetup({
    title: isEditMode ? 'Modifier Colis Aérien' : 'Nouveau Colis Aérien',
    subtitle: isEditMode ? 'Modifier les informations du colis' : 'Créer un nouveau colis par voie aérienne'
  });

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('nom');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Charger les transitaires actifs
      const { data: transitairesData, error: transitairesError } = await supabase
        .from('transitaires')
        .select('*')
        .eq('actif', true)
        .order('nom');
      
      if (transitairesError) throw transitairesError;
      setTransitaires(transitairesData || []);

      // Charger les paramètres colis
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('categorie', 'colis');
      
      if (settingsError) throw settingsError;

      // Parser les paramètres
      settingsData?.forEach(setting => {
        if (setting.cle === 'fournisseurs') {
          setFournisseurs(setting.valeur.split(','));
        } else if (setting.cle === 'tarif_aerien_regulier') {
          setTarifRegulier(parseFloat(setting.valeur));
        } else if (setting.cle === 'tarif_aerien_express') {
          setTarifExpress(parseFloat(setting.valeur));
        }
      });

      // Si mode édition, charger le colis
      if (isEditMode && id) {
        const { data: colisData, error: colisError } = await supabase
          .from('colis')
          .select('*')
          .eq('id', id)
          .single();
        
        if (colisError) throw colisError;
        
        if (colisData) {
          setFormData({
            client_id: colisData.client_id,
            fournisseur: colisData.fournisseur,
            tracking_chine: colisData.tracking_chine || '',
            numero_commande: colisData.numero_commande || '',
            poids: colisData.poids.toString(),
            tarif_kg: colisData.tarif_kg.toString(),
            transitaire_id: colisData.transitaire_id || '',
            date_expedition: colisData.date_expedition || '',
            date_arrivee_agence: colisData.date_arrivee_agence || '',
            statut: colisData.statut,
            contenu_description: colisData.contenu_description || '',
            notes: colisData.notes || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showError('Erreur lors du chargement des données');
    }
  };

  // Calculer le montant automatiquement
  const montantCalcule = formData.poids && formData.tarif_kg
    ? parseFloat(formData.poids) * parseFloat(formData.tarif_kg)
    : 0;

  // Gérer les changements de formulaire
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Sélectionner un tarif prédéfini
  const selectTarif = (type: 'regulier' | 'express') => {
    const tarif = type === 'regulier' ? tarifRegulier : tarifExpress;
    handleChange('tarif_kg', tarif.toString());
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_id) {
      showError('Veuillez sélectionner un client');
      return;
    }
    if (!formData.fournisseur) {
      showError('Veuillez sélectionner un fournisseur');
      return;
    }
    if (!formData.poids || parseFloat(formData.poids) <= 0) {
      showError('Veuillez entrer un poids valide');
      return;
    }
    if (!formData.tarif_kg || parseFloat(formData.tarif_kg) <= 0) {
      showError('Veuillez entrer un tarif valide');
      return;
    }

    setLoading(true);
    try {
      const colisData = {
        client_id: formData.client_id,
        type_livraison: 'aerien',
        fournisseur: formData.fournisseur,
        tracking_chine: formData.tracking_chine || null,
        numero_commande: formData.numero_commande || null,
        poids: parseFloat(formData.poids),
        tarif_kg: parseFloat(formData.tarif_kg),
        transitaire_id: formData.transitaire_id || null,
        date_expedition: formData.date_expedition || null,
        date_arrivee_agence: formData.date_arrivee_agence || null,
        statut: formData.statut,
        contenu_description: formData.contenu_description || null,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (isEditMode && id) {
        // Mise à jour
        const { error } = await supabase
          .from('colis')
          .update(colisData)
          .eq('id', id);
        
        if (error) throw error;
        showSuccess('Colis modifié avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('colis')
          .insert([colisData]);
        
        if (error) throw error;
        showSuccess('Colis créé avec succès');
      }

      navigate('/colis/aeriens');
    } catch (error) {
      console.error('Error saving colis:', error);
      showError('Erreur lors de l\'enregistrement du colis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRouteEnhanced requiredModule="colis">
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-500" />
                  {isEditMode ? 'Modifier Colis Aérien' : 'Nouveau Colis Aérien'}
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => navigate('/colis/aeriens')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations Principales - 3 colonnes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations Principales</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="client_id">Client *</Label>
                      <select
                        id="client_id"
                        value={formData.client_id}
                        onChange={(e) => handleChange('client_id', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.nom} - {client.telephone}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="fournisseur">Fournisseur *</Label>
                      <select
                        id="fournisseur"
                        value={formData.fournisseur}
                        onChange={(e) => handleChange('fournisseur', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      >
                        <option value="">Sélectionner un fournisseur</option>
                        {fournisseurs.map(fournisseur => (
                          <option key={fournisseur} value={fournisseur}>
                            {fournisseur}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="transitaire_id">Transitaire</Label>
                      <select
                        id="transitaire_id"
                        value={formData.transitaire_id}
                        onChange={(e) => handleChange('transitaire_id', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">Aucun transitaire</option>
                        {transitaires.map(transitaire => (
                          <option key={transitaire.id} value={transitaire.id}>
                            {transitaire.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tracking_chine">Tracking Chine</Label>
                      <Input
                        id="tracking_chine"
                        value={formData.tracking_chine}
                        onChange={(e) => handleChange('tracking_chine', e.target.value)}
                        placeholder="Ex: LP123456789CN"
                      />
                    </div>

                    <div>
                      <Label htmlFor="numero_commande">N° Commande</Label>
                      <Input
                        id="numero_commande"
                        value={formData.numero_commande}
                        onChange={(e) => handleChange('numero_commande', e.target.value)}
                        placeholder="Ex: 2024123456789"
                      />
                    </div>

                    <div>
                      <Label htmlFor="statut">Statut</Label>
                      <select
                        id="statut"
                        value={formData.statut}
                        onChange={(e) => handleChange('statut', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="en_preparation">En préparation</option>
                        <option value="expedie_chine">Expédié Chine</option>
                        <option value="en_transit">En transit</option>
                        <option value="arrive_congo">Arrivé Congo</option>
                        <option value="recupere_client">Récupéré client</option>
                        <option value="livre">Livré</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Calcul des Frais - 3 colonnes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Calcul des Frais</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="poids">Poids (kg) *</Label>
                      <Input
                        id="poids"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.poids}
                        onChange={(e) => handleChange('poids', e.target.value)}
                        placeholder="Ex: 2.5"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="tarif_kg">Tarif/kg (USD) *</Label>
                      <Input
                        id="tarif_kg"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.tarif_kg}
                        onChange={(e) => handleChange('tarif_kg', e.target.value)}
                        placeholder="Ex: 16"
                        required
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectTarif('regulier')}
                        className="flex-1"
                      >
                        Régulier ${tarifRegulier}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectTarif('express')}
                        className="flex-1"
                      >
                        Express ${tarifExpress}
                      </Button>
                    </div>
                  </div>

                  {/* Montant calculé */}
                  {montantCalcule > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Montant Total :</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(montantCalcule, 'USD')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.poids} kg × ${formData.tarif_kg}/kg
                      </p>
                    </div>
                  )}
                </div>

                {/* Dates - 2 colonnes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Dates</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_expedition">Date Expédition</Label>
                      <Input
                        id="date_expedition"
                        type="date"
                        value={formData.date_expedition}
                        onChange={(e) => handleChange('date_expedition', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="date_arrivee_agence">Date Arrivée Congo</Label>
                      <Input
                        id="date_arrivee_agence"
                        type="date"
                        value={formData.date_arrivee_agence}
                        onChange={(e) => handleChange('date_arrivee_agence', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Détails - 2 colonnes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Détails Supplémentaires</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contenu_description">Description du Contenu</Label>
                      <Textarea
                        id="contenu_description"
                        value={formData.contenu_description}
                        onChange={(e) => handleChange('contenu_description', e.target.value)}
                        placeholder="Ex: Vêtements, électronique, etc."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes Internes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Notes internes..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/colis/aeriens')}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditMode ? 'Modifier' : 'Créer'} le Colis
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default ColisAeriensCreate;
