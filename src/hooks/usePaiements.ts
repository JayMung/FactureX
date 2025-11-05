import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Fonction utilitaire pour générer un ID de colis lisible
export const generateColisId = (colisId: string, createdAt: string): string => {
  const date = new Date(createdAt);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const shortId = colisId.slice(0, 6).toUpperCase();
  return `CA-${year}${month}-${shortId}`;
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

export function usePaiements(page = 1, filters?: PaiementFilters) {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ['paiements', page, filters],
    queryFn: async () => {
      let query = supabase
        .from('paiements')
        .select(`
          *,
          client:clients(nom, telephone),
          facture:factures(facture_number, total_general),
          colis:colis(id, created_at, tracking_chine),
          compte:comptes_financiers(nom, type_compte)
        `, { count: 'exact' })
        .order('date_paiement', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters?.type_paiement) {
        query = query.eq('type_paiement', filters.type_paiement);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.compte_id) {
        query = query.eq('compte_id', filters.compte_id);
      }
      if (filters?.date_debut) {
        query = query.gte('date_paiement', filters.date_debut);
      }
      if (filters?.date_fin) {
        query = query.lte('date_paiement', filters.date_fin);
      }
      if (filters?.search) {
        query = query.or(`facture.facture_number.ilike.%${filters.search}%,client.nom.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        paiements: data as Paiement[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

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

      // Ajouter organization_id aux données
      const paiementData = {
        ...data,
        organization_id: profile.organization_id,
      };

      const { data: paiement, error } = await supabase
        .from('paiements')
        .insert([paiementData])
        .select()
        .single();

      if (error) throw error;
      return paiement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['comptes'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Encaissement enregistré avec succès');
    },
    onError: (error: any) => {
      console.error('Error creating paiement:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement de l\'encaissement');
    },
  });
}

export function useDeletePaiement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['comptes'] });
      toast.success('Encaissement supprimé avec succès');
    },
    onError: (error: any) => {
      console.error('Error deleting paiement:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'encaissement');
    },
  });
}

export function usePaiementStats(filters?: PaiementFilters) {
  return useQuery({
    queryKey: ['paiement-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('paiements')
        .select('montant_paye, type_paiement, date_paiement');

      // Apply filters
      if (filters?.type_paiement) {
        query = query.eq('type_paiement', filters.type_paiement);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.compte_id) {
        query = query.eq('compte_id', filters.compte_id);
      }
      if (filters?.date_debut) {
        query = query.gte('date_paiement', filters.date_debut);
      }
      if (filters?.date_fin) {
        query = query.lte('date_paiement', filters.date_fin);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
      const totalFactures = data?.filter(p => p.type_paiement === 'facture')
        .reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
      const totalColis = data?.filter(p => p.type_paiement === 'colis')
        .reduce((sum, p) => sum + Number(p.montant_paye), 0) || 0;
      const count = data?.length || 0;

      // Aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = data?.filter(p => new Date(p.date_paiement) >= today) || [];
      const totalToday = todayPayments.reduce((sum, p) => sum + Number(p.montant_paye), 0);

      return {
        total,
        totalFactures,
        totalColis,
        count,
        totalToday,
        countToday: todayPayments.length,
      };
    },
  });
}
