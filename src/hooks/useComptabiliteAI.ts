import { useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface AlertConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  maxDaysWithoutReconciliation: number;
  maxUnrecordedExpenses: number;
}

export function useComptabiliteAI(config: AlertConfig) {
  const hasCheckedToday = useRef(false);

  // Fetch pending expenses (En attente)
  const { data: pendingExpenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['comptabilite-ai', 'pending-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, montant, motif, date_paiement')
        .eq('type_transaction', 'depense')
        .eq('statut', 'En attente')
        .order('date_paiement', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch last account movement (proxy for reconciliation)
  const { data: lastMovement, isLoading: loadingReconciliation } = useQuery({
    queryKey: ['comptabilite-ai', 'last-reconciliation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mouvements_comptes')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const sendTelegramAlert = useCallback(async (message: string) => {
    if (!config.telegramBotToken || !config.telegramChatId) {
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
    }
  }, [config.telegramBotToken, config.telegramChatId]);

  // Daily check (around 18h)
  useEffect(() => {
    if (loadingExpenses || loadingReconciliation || hasCheckedToday.current) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Only trigger between 18:00 and 18:05
    if (currentHour !== 18 || now.getMinutes() >= 5) return;

    // Prevent multiple checks in the same session
    const lastCheckKey = 'comptabilite_ai_last_check';
    const lastCheck = localStorage.getItem(lastCheckKey);
    const today = now.toISOString().split('T')[0];

    if (lastCheck === today) {
      hasCheckedToday.current = true;
      return;
    }

    hasCheckedToday.current = true;
    localStorage.setItem(lastCheckKey, today);

    // Alert: pending expenses
    if (pendingExpenses && pendingExpenses.length >= config.maxUnrecordedExpenses) {
      sendTelegramAlert(
        `⚠️ <b>FactureX - Dépenses en attente</b>\n\n` +
        `Tu as <b>${pendingExpenses.length}</b> dépenses à valider aujourd'hui.\n\n` +
        `Connecte-toi sur FactureX pour les enregistrer.\n\n` +
        `<i>Ne laisse pas traîner, c'est important pour ta trésorerie !</i>`
      );
    }

    // Alert: reconciliation overdue
    if (lastMovement) {
      const daysSinceReconciliation = differenceInDays(now, new Date(lastMovement.created_at));

      if (daysSinceReconciliation >= config.maxDaysWithoutReconciliation) {
        sendTelegramAlert(
          `🚨 <b>FactureX - Réconciliation urgente</b>\n\n` +
          `Ta dernière réconciliation date de <b>${daysSinceReconciliation} jours</b>.\n\n` +
          `Va dans Comptes → Mouvements pour faire ta réconciliation.\n\n` +
          `<i>Sans réconciliation régulière, tu perds le contrôle de ta trésorerie !</i>`
        );
      }
    }
  }, [pendingExpenses, lastMovement, loadingExpenses, loadingReconciliation, config, sendTelegramAlert]);

  const daysSinceLastReconciliation = lastMovement
    ? differenceInDays(new Date(), new Date(lastMovement.created_at))
    : null;

  return {
    unrecordedExpensesCount: pendingExpenses?.length || 0,
    daysSinceLastReconciliation,
    sendTelegramAlert,
    isLoading: loadingExpenses || loadingReconciliation,
  };
}
