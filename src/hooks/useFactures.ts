import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { logActivity } from '@/services/activityLogger';
import type { Facture, CreateFactureData, UpdateFactureData, FactureFilters, PaginatedResponse } from '@/types';

const PAGE_SIZE = 10;

export const useFactures = (page: number = 1, filters?: FactureFilters) => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Facture> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFactures = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculer offset pour la pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Construire la requête
      let query = supabase
        .from('factures')
        .select(`
          *,
          clients!inner(id, nom, telephone, ville)
        `, { count: 'exact' })
        .order('date_emission', { ascending: false })
        .range(from, to);

      // Appliquer les filtres
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.modeLivraison) {
        query = query.eq('mode_livraison', filters.modeLivraison);
      }
      if (filters?.dateFrom) {
        query = query.gte('date_emission', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date_emission', filters.dateTo);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setFactures(data || []);
      
      if (count !== null) {
        setPagination({
          data: data || [],
          count,
          page,
          pageSize: PAGE_SIZE,
          totalPages: Math.ceil(count / PAGE_SIZE)
        });
      }
    } catch (err: any) {
      console.error('Error fetching factures:', err);
      setError(err.message || 'Erreur lors du chargement des factures');
      showError('Erreur lors du chargement des factures');
    } finally {
      setIsLoading(false);
    }
  };

  const createFacture = async (data: CreateFactureData): Promise<Facture> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer les frais de livraison depuis les settings
      const { data: shippingSettings } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'shipping');

      const fraisAerien = parseFloat(
        shippingSettings?.find(s => s.cle === 'frais_aerien_par_kg')?.valeur || '16'
      );
      const fraisMaritime = parseFloat(
        shippingSettings?.find(s => s.cle === 'frais_maritime_par_cbm')?.valeur || '450'
      );

      // Calculer les totaux
      const subtotal = data.items.reduce((sum, item) => sum + item.montant_total, 0);
      const totalPoids = data.items.reduce((sum, item) => sum + item.poids, 0);
      const shippingFee = data.mode_livraison === 'aerien' 
        ? totalPoids * fraisAerien 
        : totalPoids * fraisMaritime;
      const fraisTransportDouane = shippingFee;
      const totalGeneral = subtotal + fraisTransportDouane;

      // Insérer la facture
      const { data: factureData, error: factureError } = await supabase
        .from('factures')
        .insert([{
          type: data.type,
          statut: data.statut || 'brouillon',
          client_id: data.client_id,
          mode_livraison: data.mode_livraison,
          devise: data.devise,
          shipping_fee: shippingFee,
          subtotal,
          total_poids: totalPoids,
          frais_transport_douane: fraisTransportDouane,
          total_general: totalGeneral,
          conditions_vente: data.conditions_vente,
          notes: data.notes,
          informations_bancaires: data.informations_bancaires,
          created_by: user.id,
          date_emission: data.date_emission
        }])
        .select()
        .single();

      if (factureError) throw factureError;

      // Insérer les items
      const itemsToInsert = data.items.map((item, index) => ({
        facture_id: factureData.id,
        numero_ligne: index + 1,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from('facture_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Log l'activité
      await logActivity({
        action: 'CREATE',
        cible: data.type === 'devis' ? 'Devis' : 'Facture',
        cible_id: factureData.id,
        details: { facture_number: factureData.facture_number }
      });

      showSuccess(`${data.type === 'devis' ? 'Devis' : 'Facture'} créé(e) avec succès`);
      return factureData;
    } catch (err: any) {
      console.error('Error creating facture:', err);
      showError(err.message || 'Erreur lors de la création');
      throw err;
    }
  };

  const updateFacture = async (id: string, data: UpdateFactureData): Promise<void> => {
    try {
      const updateData: any = {};

      if (data.client_id) updateData.client_id = data.client_id;
      if (data.mode_livraison) updateData.mode_livraison = data.mode_livraison;
      if (data.devise) updateData.devise = data.devise;
      if (data.date_emission) updateData.date_emission = data.date_emission;
      if (data.statut) updateData.statut = data.statut;
      if (data.conditions_vente !== undefined) updateData.conditions_vente = data.conditions_vente;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.informations_bancaires !== undefined) updateData.informations_bancaires = data.informations_bancaires;

      // Si on met à jour les items, recalculer les totaux
      if (data.items) {
        const { data: shippingSettings } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'shipping');

        const fraisAerien = parseFloat(
          shippingSettings?.find(s => s.cle === 'frais_aerien_par_kg')?.valeur || '16'
        );
        const fraisMaritime = parseFloat(
          shippingSettings?.find(s => s.cle === 'frais_maritime_par_cbm')?.valeur || '450'
        );

        const subtotal = data.items.reduce((sum, item) => sum + item.montant_total, 0);
        const totalPoids = data.items.reduce((sum, item) => sum + item.poids, 0);
        
        const modeLivraison = data.mode_livraison || (await supabase
          .from('factures')
          .select('mode_livraison')
          .eq('id', id)
          .single()).data?.mode_livraison;

        const shippingFee = modeLivraison === 'aerien'
          ? totalPoids * fraisAerien
          : totalPoids * fraisMaritime;
        
        const fraisTransportDouane = shippingFee;
        const totalGeneral = subtotal + fraisTransportDouane;

        updateData.shipping_fee = shippingFee;
        updateData.subtotal = subtotal;
        updateData.total_poids = totalPoids;
        updateData.frais_transport_douane = fraisTransportDouane;
        updateData.total_general = totalGeneral;

        // Supprimer les anciens items
        await supabase.from('facture_items').delete().eq('facture_id', id);

        // Insérer les nouveaux items
        const itemsToInsert = data.items.map((item, index) => ({
          facture_id: id,
          numero_ligne: index + 1,
          ...item
        }));

        await supabase.from('facture_items').insert(itemsToInsert);
      }

      const { error } = await supabase
        .from('factures')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await logActivity({
        action: 'UPDATE',
        cible: 'Facture',
        cible_id: id,
        details: updateData
      });

      showSuccess('Facture mise à jour avec succès');
    } catch (err: any) {
      console.error('Error updating facture:', err);
      showError(err.message || 'Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteFacture = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('factures')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity({
        action: 'DELETE',
        cible: 'Facture',
        cible_id: id
      });

      showSuccess('Facture supprimée avec succès');
    } catch (err: any) {
      console.error('Error deleting facture:', err);
      showError(err.message || 'Erreur lors de la suppression');
      throw err;
    }
  };

  const convertToFacture = async (devisId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { error } = await supabase
        .from('factures')
        .update({
          type: 'facture',
          statut: 'validee',
          date_validation: new Date().toISOString(),
          valide_par: user.id
        })
        .eq('id', devisId);

      if (error) throw error;

      await logActivity({
        action: 'CONVERT',
        cible: 'Facture',
        cible_id: devisId,
        details: { converted_from: 'devis' }
      });

      showSuccess('Devis converti en facture avec succès');
    } catch (err: any) {
      console.error('Error converting devis:', err);
      showError(err.message || 'Erreur lors de la conversion');
      throw err;
    }
  };

  const getFactureWithItems = async (id: string): Promise<Facture | null> => {
    try {
      const { data, error } = await supabase
        .from('factures')
        .select(`
          *,
          clients!inner(*),
          items:facture_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching facture:', err);
      showError('Erreur lors du chargement de la facture');
      return null;
    }
  };

  useEffect(() => {
    fetchFactures();
  }, [page, filters?.type, filters?.statut, filters?.clientId, filters?.modeLivraison]);

  return {
    factures,
    pagination,
    isLoading,
    error,
    createFacture,
    updateFacture,
    deleteFacture,
    convertToFacture,
    getFactureWithItems,
    refetch: fetchFactures
  };
};
