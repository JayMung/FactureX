import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { logActivity } from '@/services/activityLogger';
import type { Facture, CreateFactureData, UpdateFactureData, FactureFilters, PaginatedResponse } from '@/types';

const DEFAULT_PAGE_SIZE = 10;

type UseFacturesOptions = {
  pageSize?: number;
  sort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
};

export const useFactures = (page: number = 1, filters?: FactureFilters, options?: UseFacturesOptions) => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Facture> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [globalTotals, setGlobalTotals] = useState({
    totalUSD: 0,
    totalCDF: 0,
    totalFrais: 0,
    totalCount: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalOutstanding: 0
  });
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const sort = options?.sort;

  const fetchFactures = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        'get_factures_with_totals_secure',
        {
          p_page: page,
          p_page_size: pageSize,
          p_search: filters?.search || null,
          p_statut: filters?.statut || null,
          p_type: filters?.type || null,
          p_client_id: filters?.clientId || null,
          p_date_from: filters?.dateFrom || null,
          p_date_to: filters?.dateTo || null
        }
      );

      if (fetchError) throw fetchError;

      const rpcData = data as {
        data: Facture[] | null;
        count: number;
        totalAmount: number;
        totalPaid: number;
        totalOutstanding: number;
      };

      const rows = rpcData.data || [];
      const totalCount = rpcData.count || 0;

      setFactures(rows);

      setPagination({
        data: rows,
        count: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      });

      setGlobalTotals({
        totalUSD: 0,
        totalCDF: 0,
        totalFrais: 0,
        totalCount,
        totalAmount: rpcData.totalAmount || 0,
        totalPaid: rpcData.totalPaid || 0,
        totalOutstanding: rpcData.totalOutstanding || 0
      });

      setRetryCount(0);
    } catch (err: any) {
      console.error('Error fetching factures:', err);
      setError(err.message || 'Erreur lors du chargement des factures');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters?.type, filters?.statut, filters?.clientId, filters?.modeLivraison, filters?.dateFrom, filters?.dateTo, filters?.search, retryCount]);

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

      const factureData = {
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
      };

      const itemsArray = data.items.map((item) => ({ ...item }));

      const { data: createdFactureId, error: createError } = await supabase.rpc(
        'create_facture_secure',
        {
          p_facture: factureData,
          p_items: itemsArray
        }
      );

      if (createError) throw createError;

      const { data: createdFacture, error: createdFactureError } = await supabase
        .from('factures')
        .select('*')
        .eq('id', createdFactureId)
        .single();

      if (createdFactureError) throw createdFactureError;

      // Log l'activité
      await logActivity({
        action: 'CREATE',
        cible: 'factures',
        cible_id: createdFacture.id,
        details: { 
          facture_number: createdFacture.facture_number,
          type: data.type
        }
      });

      showSuccess(`${data.type === 'devis' ? 'Devis' : 'Facture'} créé(e) avec succès`);
      return createdFacture;
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

      let itemsArray: any[] = [];

      if (data.items !== undefined) {
        itemsArray = data.items.map((item) => ({ ...item }));
      } else {
        const { data: existingItems, error: existingItemsError } = await supabase
          .from('facture_items')
          .select('description, quantite, prix_unitaire, poids, montant_total')
          .eq('facture_id', id)
          .order('numero_ligne', { ascending: true });

        if (existingItemsError) throw existingItemsError;
        itemsArray = existingItems || [];
      }

      const { error } = await supabase.rpc(
        'update_facture_secure',
        {
          p_facture_id: id,
          p_facture: updateData,
          p_items: itemsArray
        }
      );

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
      const { error } = await supabase.rpc(
        'delete_facture_secure',
        {
          p_facture_id: id
        }
      );

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
      // Ne pas afficher de toast pour éviter de polluer l'UI
      return null;
    }
  };

  useEffect(() => {
    fetchFactures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters?.type, filters?.statut, filters?.clientId, filters?.modeLivraison, filters?.dateFrom, filters?.dateTo, filters?.search, sort?.key, sort?.direction]);

  return {
    factures,
    pagination,
    isLoading,
    error,
    globalTotals,
    createFacture,
    updateFacture,
    deleteFacture,
    convertToFacture,
    getFactureWithItems,
    refetch: fetchFactures
  };
};
