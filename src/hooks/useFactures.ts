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

      // Récupérer les frais de commission depuis les settings
      const { data: feeSettings } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'facture');

      const fraisPercentage = parseFloat(
        feeSettings?.find(s => s.cle === 'frais_commande')?.valeur || '15'
      );

      // Utiliser les totaux fournis ou les calculer automatiquement
      let subtotal, totalPoids, fraisCommission, shippingFee, fraisTransportDouane, totalGeneral;
      
      if (data.subtotal !== undefined && data.frais !== undefined && data.frais_transport_douane !== undefined) {
        // Utiliser les valeurs fournies (avec personnalisations)
        subtotal = data.subtotal;
        totalPoids = data.total_poids || data.items.reduce((sum, item) => sum + item.poids, 0);
        fraisCommission = data.frais;
        fraisTransportDouane = data.frais_transport_douane;
        shippingFee = fraisTransportDouane;
        totalGeneral = data.total_general || (subtotal + fraisCommission + fraisTransportDouane);
      } else {
        // Calculer automatiquement
        subtotal = data.items.reduce((sum, item) => sum + item.montant_total, 0);
        totalPoids = data.items.reduce((sum, item) => sum + item.poids, 0);
        fraisCommission = subtotal * (fraisPercentage / 100);
        shippingFee = data.mode_livraison === 'aerien' 
          ? totalPoids * fraisAerien 
          : totalPoids * fraisMaritime;
        fraisTransportDouane = shippingFee;
        totalGeneral = subtotal + fraisCommission + fraisTransportDouane;
      }

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
          frais: fraisCommission,
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
        cible: 'factures',
        cible_id: factureData.id,
        details: { 
          facture_number: factureData.facture_number,
          type: data.type
        }
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

      // Si les totaux sont fournis, les utiliser directement (valeurs personnalisées)
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.frais !== undefined) updateData.frais = data.frais;
      if (data.frais_transport_douane !== undefined) updateData.frais_transport_douane = data.frais_transport_douane;
      if (data.total_poids !== undefined) updateData.total_poids = data.total_poids;
      if (data.total_general !== undefined) updateData.total_general = data.total_general;

      // Si on met à jour les items, toujours les mettre à jour dans la DB
      if (data.items && data.items.length > 0) {
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

      // Si on met à jour les items SANS fournir de totaux, recalculer automatiquement
      if (data.items && data.subtotal === undefined) {
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

        // Récupérer les frais de commission depuis les settings
        const { data: feeSettings } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'facture');

        const fraisPercentage = parseFloat(
          feeSettings?.find(s => s.cle === 'frais_commande')?.valeur || '15'
        );

        const subtotal = data.items.reduce((sum, item) => sum + item.montant_total, 0);
        const totalPoids = data.items.reduce((sum, item) => sum + item.poids, 0);
        const fraisCommission = subtotal * (fraisPercentage / 100);
        
        const modeLivraison = data.mode_livraison || (await supabase
          .from('factures')
          .select('mode_livraison')
          .eq('id', id)
          .single()).data?.mode_livraison;

        const shippingFee = modeLivraison === 'aerien'
          ? totalPoids * fraisAerien
          : totalPoids * fraisMaritime;
        
        const fraisTransportDouane = shippingFee;
        const totalGeneral = subtotal + fraisCommission + fraisTransportDouane;

        updateData.shipping_fee = shippingFee;
        updateData.subtotal = subtotal;
        updateData.total_poids = totalPoids;
        updateData.frais = fraisCommission;
        updateData.frais_transport_douane = fraisTransportDouane;
        updateData.total_general = totalGeneral;
      }

      const { error } = await supabase
        .from('factures')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Récupérer le numéro de facture pour le log
      const { data: factureData } = await supabase
        .from('factures')
        .select('facture_number')
        .eq('id', id)
        .single();

      await logActivity({
        action: 'UPDATE',
        cible: 'factures',
        cible_id: id,
        details: {
          facture_number: factureData?.facture_number,
          ...updateData
        }
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
