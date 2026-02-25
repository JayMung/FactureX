import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PayerHealth } from './useClientPayerHealth';

export interface PayerHealthMap {
  [clientId: string]: {
    health: PayerHealth;
    tauxRetard: number;
    totalFactures: number;
    facturesEnRetard: number;
  };
}

export const usePayerHealthBatch = (clientIds: string[]) => {
  const [healthMap, setHealthMap] = useState<PayerHealthMap>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unique = [...new Set(clientIds)].filter(Boolean);
    if (unique.length === 0) { setHealthMap({}); return; }

    setIsLoading(true);
    supabase
      .from('factures')
      .select('client_id, statut_paiement, date_echeance')
      .in('client_id', unique)
      .then(({ data: rows }) => {
        if (!rows) { setIsLoading(false); return; }

        const map: PayerHealthMap = {};
        const now = new Date();

        for (const id of unique) {
          const clientRows = rows.filter(r => r.client_id === id);
          const total = clientRows.length;
          const retard = clientRows.filter(f =>
            f.statut_paiement !== 'payee' &&
            f.date_echeance &&
            new Date(f.date_echeance) < now
          ).length;
          const taux = total > 0 ? Math.round((retard / total) * 100) : 0;

          let health: PayerHealth = 'unknown';
          if (total > 0) {
            if (taux === 0) health = 'good';
            else if (taux <= 25) health = 'warning';
            else health = 'bad';
          }

          map[id] = { health, tauxRetard: taux, totalFactures: total, facturesEnRetard: retard };
        }

        setHealthMap(map);
        setIsLoading(false);
      });
  }, [clientIds.join(',')]);

  return { healthMap, isLoading };
};
