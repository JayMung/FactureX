import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSupabaseQuery } from './useSupabaseQuery';

// Fonction utilitaire pour générer un ID de colis lisible (4 caractères)
export const generateColisId = (colisId: string, createdAt?: string): string => {
  // Retourner un simple code à 4 caractères basé sur les 4 derniers caractères de l'UUID
  return colisId.slice(-4).toUpperCase();
};

export interface Paiement {
  id: string;
  type_paiement: 'facture' | 'colis';
  facture_id?: string;
  colis_id?: string;
  client_id: string;
  montant_paye: number;
  compte_id: string;
  mode_paiement?: string;
  date_paiement: string;
  notes?: string;
  organization_id: string;
  created_at: string;
  created_by?: string;
  // Relations
  client?: {
    nom: string;
    telephone: string;
  };
  facture?: {
    facture_number: string;
    total_general: number;
  };
  colis?: {
    id: string;
    created_at: string;
    tracking_chine?: string;
  };
  compte?: {
    nom: string;
    type_compte: string;
  };
}

export interface PaiementFilters {
  type_paiement?: 'facture' | 'colis';
  client_id?: string;
  compte_id?: string;
  date_debut?: string;
  date_fin?: string;
  search?: string;
}

export interface CreatePaiementData {
  type_paiement: 'facture' | 'colis';
  facture_id?: string;
  colis_id?: string;
  client_id: string;
  montant_paye: number;
  compte_id: string;
  mode_paiement?: string;
  date_paiement?: string;
  notes?: string;
  organization_id?: string; // Optionnel car sera ajouté automatiquement
}

// Query keys centralisées pour invalidation
const PAIEMENT_RELATED_KEYS = ['paiements', 'paiement-stats', 'factures', 'comptes', 'transactions'];

function invalidatePaiementQueries(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of PAIEMENT_RELATED_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

// READ — Utilise useSupabaseQuery pour la liste paginée
export function usePaiements(page = 1, filters?: PaiementFilters) {
  const result = useSupabaseQuery<Paiement, PaiementFilters>({
    table: 'paiements',
    queryKey: 'paiements',
    select: `*,
      client:clients(nom, telephone),
      facture:factures(facture_number, total_general),
      colis:colis(id, created_at, tracking_chine),
      compte:comptes_financiers(nom, type_compte)`,
    pagination: { page, pageSize: 20 },
    orderBy: { column: 'date_paiement', ascending: false },
    filters,
    applyFilters: (query, f) => {
      if (f.type_paiement) query = query.eq('type_paiement', f.type_paiement);
      if (f.client_id) query = query.eq('client_id', f.client_id);
      if (f.compte_id) query = query.eq('compte_id', f.compte_id);
      if (f.date_debut) query = query.gte('date_paiement', f.date_debut);
      if (f.date_fin) query = query.lte('date_paiement', f.date_fin);
      if (f.search) query = query.or(`facture.facture_number.ilike.%${f.search}%,client.nom.ilike.%${f.search}%`);
      return query;
    },
  });

  // Preserve original return shape: { data: { paiements, totalCount, totalPages } }
  return {
    data: result.pagination
      ? {
          paiements: result.data as Paiement[],
          totalCount: result.pagination.count,
          totalPages: result.pagination.totalPages,
        }
      : undefined,
    isLoading: result.isLoading,
    error: result.error ? new Error(result.error) : null,
    refetch: result.refetch,
  };
}

// CREATE — Garde la logique custom (fetch organization_id avant insert)
export function useCreatePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaiementData) => {
      // Récupérer l'organization_id de l'utilisateur actuel
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) {
        throw new Error('Impossible de récupérer votre organisation');
      }

      const { data: paiement, error } = await supabase
        .from('paiements')
        .insert([{ ...data, organization_id: profile.organization_id }])
        .select()
        .single();

      if (error) throw error;
      return paiement;
    },
    onSuccess: () => {
      invalidatePaiementQueries(queryClient);
      showSuccess('Encaissement enregistré avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating paiement:', error);
      showError(error.message || 'Erreur lors de l\'enregistrement de l\'encaissement');
    },
  });
}

// DELETE
export function useDeletePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('paiements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePaiementQueries(queryClient);
      showSuccess('Encaissement supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting paiement:', error);
      showError(error.message || 'Erreur lors de la suppression de l\'encaissement');
    },
  });
}

// STATS — Logique de calcul custom, garde useQuery direct
export function usePaiementStats(filters?: PaiementFilters) {
  const result = useSupabaseQuery<{ montant_paye: number; type_paiement: string; date_paiement: string }, PaiementFilters>({
    table: 'paiements',
    queryKey: 'paiement-stats',
    select: 'montant_paye, type_paiement, date_paiement',
    filters,
    applyFilters: (query, f) => {
      if (f.type_paiement) query = query.eq('type_paiement', f.type_paiement);
      if (f.client_id) query = query.eq('client_id', f.client_id);
      if (f.compte_id) query = query.eq('compte_id', f.compte_id);
      if (f.date_debut) query = query.gte('date_paiement', f.date_debut);
      if (f.date_fin) query = query.lte('date_paiement', f.date_fin);
      return query;
    },
  });

  const rawData = result.data as { montant_paye: number; type_paiement: string; date_paiement: string }[];

  const total = rawData?.reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
  const totalFactures = rawData?.filter(p => p.type_paiement === 'facture')
    .reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
  const totalColis = rawData?.filter(p => p.type_paiement === 'colis')
    .reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
  const count = rawData?.length || 0;

  // Aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPayments = rawData?.filter(p => new Date(p.date_paiement) >= today) || [];
  const totalToday = todayPayments.reduce((sum, p) => sum + Number(p.montant_paye), 0);

  return {
    data: { total, totalFactures, totalColis, count, totalToday, countToday: todayPayments.length },
    isLoading: result.isLoading,
    error: result.error ? new Error(result.error) : null,
  };
}

// UPDATE
export function useUpdatePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePaiementData> }) => {
      const { data: paiement, error } = await supabase
        .from('paiements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return paiement;
    },
    onSuccess: () => {
      invalidatePaiementQueries(queryClient);
      showSuccess('Encaissement modifié avec succès');
    },
    onError: (error: any) => {
      console.error('Error updating paiement:', error);
      showError(error.message || 'Erreur lors de la modification de l\'encaissement');
    },
  });
}
