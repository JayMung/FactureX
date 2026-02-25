import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PayerHealth = 'good' | 'warning' | 'bad' | 'unknown';

export interface ClientPayerHealthData {
  health: PayerHealth;
  totalFactures: number;
  facturesEnRetard: number;
  tauxRetard: number; // 0-100
}

const cache = new Map<string, { data: ClientPayerHealthData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useClientPayerHealth = (clientId: string | undefined) => {
  const [data, setData] = useState<ClientPayerHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) { setData(null); return; }

    const cached = cache.get(clientId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    setIsLoading(true);
    supabase
      .from('factures')
      .select('id, statut_paiement, date_echeance')
      .eq('client_id', clientId)
      .then(({ data: rows }) => {
        if (!rows) { setIsLoading(false); return; }

        const total = rows.length;
        const retard = rows.filter(f =>
          f.statut_paiement !== 'payee' &&
          f.date_echeance &&
          new Date(f.date_echeance) < new Date()
        ).length;

        const taux = total > 0 ? Math.round((retard / total) * 100) : 0;

        let health: PayerHealth = 'unknown';
        if (total === 0) health = 'unknown';
        else if (taux === 0) health = 'good';
        else if (taux <= 25) health = 'warning';
        else health = 'bad';

        const result: ClientPayerHealthData = {
          health,
          totalFactures: total,
          facturesEnRetard: retard,
          tauxRetard: taux
        };

        cache.set(clientId, { data: result, ts: Date.now() });
        setData(result);
        setIsLoading(false);
      });
  }, [clientId]);

  return { data, isLoading };
};

export const getHealthColor = (health: PayerHealth) => {
  switch (health) {
    case 'good':    return 'bg-emerald-500';
    case 'warning': return 'bg-yellow-400';
    case 'bad':     return 'bg-red-500';
    default:        return 'bg-gray-300';
  }
};

export const getHealthLabel = (health: PayerHealth) => {
  switch (health) {
    case 'good':    return 'Bon payeur';
    case 'warning': return 'Quelques retards';
    case 'bad':     return 'Mauvais payeur';
    default:        return 'Historique insuffisant';
  }
};
