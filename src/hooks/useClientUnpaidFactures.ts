import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnpaidFacture {
  id: string;
  facture_number: string;
  total_general: number;
  devise: string;
  date_emission: string;
  statut: string;
  montant_paye?: number;
  solde_restant?: number;
}

interface UseClientUnpaidFacturesOptions {
  clientId?: string;
}

export function useClientUnpaidFactures({ clientId }: UseClientUnpaidFacturesOptions) {
  const [factures, setFactures] = useState<UnpaidFacture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if no clientId or empty string
    if (!clientId || clientId.trim() === '') {
      setFactures([]);
      setLoading(false);
      return;
    }

    const fetchUnpaidFactures = async () => {
      setLoading(true);
      setError(null);

      try {
        // Récupérer les factures non payées du client (statut != 'payee' et != 'annulee')
        const { data: facturesData, error: facturesError } = await supabase
          .from('factures')
          .select(`
            id,
            facture_number,
            total_general,
            devise,
            date_emission,
            statut
          `)
          .eq('client_id', clientId)
          .in('statut', ['en_attente', 'validee', 'brouillon'])
          .order('date_emission', { ascending: false });

        if (facturesError) throw facturesError;

        // Pour chaque facture, calculer le montant déjà payé
        const facturesWithPayments = await Promise.all(
          (facturesData || []).map(async (facture) => {
            // Récupérer les paiements existants pour cette facture
            const { data: paiements } = await supabase
              .from('paiements')
              .select('montant_paye')
              .eq('facture_id', facture.id);

            const totalPaye = (paiements || []).reduce(
              (sum, p) => sum + (p.montant_paye || 0),
              0
            );

            const soldeRestant = facture.total_general - totalPaye;

            return {
              ...facture,
              montant_paye: totalPaye,
              solde_restant: soldeRestant
            };
          })
        );

        // Filtrer pour ne garder que les factures avec un solde restant > 0
        const unpaidFactures = facturesWithPayments.filter(
          (f) => f.solde_restant > 0
        );

        setFactures(unpaidFactures);
      } catch (err: any) {
        console.error('Error fetching unpaid factures:', err);
        setError(err.message || 'Erreur lors du chargement des factures');
        setFactures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnpaidFactures();
  }, [clientId]);

  return { factures, loading, error };
}
