import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  CreateTransactionData,
  CompteFinancier,
  MouvementCompte
} from '@/types';
import type { CreatePaiementData } from './usePaiements';

export const useFinancialOperations = () => {
  const queryClient = useQueryClient();

  // ✅ CRUD pour Encaissements (Factures + Colis)
  const createEncaissement = useCallback(async (data: CreatePaiementData) => {
    try {
      // 1. Créer l'encaissement
      const { data: encaissement, error } = await supabase
        .from('paiements')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. Mettre à jour le compte automatiquement
      if (data.compte_id) {
        await updateCompteSolde(data.compte_id, data.montant_paye, 'credit');
        
        // 3. Créer le mouvement
        await createMouvementCompte({
          compte_id: data.compte_id,
          type_mouvement: 'credit',
          montant: data.montant_paye,
          description: `Encaissement ${data.type_paiement} - ${data.notes || '#' + encaissement.id.slice(0, 8)}`,
          transaction_id: encaissement.id
        });
      }

      toast.success('Encaissement créé et compte mis à jour');
      
      // 4. Rafraîchir les requêtes
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['comptes_financiers'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements_comptes'] });
      
      return encaissement;
    } catch (error: any) {
      console.error('Erreur création encaissement:', error);
      toast.error('Erreur lors de la création', {
        description: error.message || 'Veuillez réessayer'
      });
      throw error;
    }
  }, [queryClient]);

  // ✅ CRUD pour Opérations Internes (Dépenses/Revenus/Swaps)
  // NOTE: Les triggers SQL gèrent automatiquement:
  //   - La mise à jour des soldes (trigger_update_compte_after_insert)
  //   - La création des mouvements (trigger_create_mouvement_after_transaction_insert)
  // On ne fait donc QUE l'INSERT ici pour éviter le double comptage.
  const createOperationInterne = useCallback(async (data: CreateTransactionData) => {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Opération créée et comptes mis à jour');
      
      // Rafraîchir les requêtes (les triggers ont déjà mis à jour les soldes et mouvements)
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['comptes_financiers'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements_comptes'] });
      
      return transaction;
    } catch (error: any) {
      console.error('Erreur création opération:', error);
      toast.error('Erreur lors de la création', {
        description: error.message || 'Veuillez réessayer'
      });
      throw error;
    }
  }, [queryClient]);

  // ✅ Fonction utilitaire pour mettre à jour le solde d'un compte
  const updateCompteSolde = useCallback(async (compteId: string, montant: number, type: 'debit' | 'credit') => {
    try {
      // Récupérer le solde actuel
      const { data: compte, error: fetchError } = await supabase
        .from('comptes_financiers')
        .select('solde_actuel')
        .eq('id', compteId)
        .single();

      if (fetchError) throw fetchError;
      if (!compte) throw new Error('Compte non trouvé');

      // Calculer le nouveau solde
      const nouveauSolde = type === 'credit' 
        ? compte.solde_actuel + montant 
        : compte.solde_actuel - montant;

      // Mettre à jour le solde
      const { error: updateError } = await supabase
        .from('comptes_financiers')
        .update({ 
          solde_actuel: nouveauSolde,
          updated_at: new Date().toISOString()
        })
        .eq('id', compteId);

      if (updateError) throw updateError;

      return { ancienSolde: compte.solde_actuel, nouveauSolde };
    } catch (error: any) {
      console.error('Erreur mise à jour solde:', error);
      throw error;
    }
  }, []);

  // ✅ Fonction utilitaire pour créer un mouvement de compte
  const createMouvementCompte = useCallback(async (data: {
    compte_id: string;
    type_mouvement: 'debit' | 'credit';
    montant: number;
    description?: string;
    transaction_id?: string;
  }) => {
    try {
      // Récupérer le solde avant
      const { data: compte, error: fetchError } = await supabase
        .from('comptes_financiers')
        .select('solde_actuel')
        .eq('id', data.compte_id)
        .single();

      if (fetchError) throw fetchError;
      if (!compte) throw new Error('Compte non trouvé');

      // Calculer le solde après
      const soldeApres = data.type_mouvement === 'credit' 
        ? compte.solde_actuel + data.montant 
        : compte.solde_actuel - data.montant;

      // Créer le mouvement
      const { error: insertError } = await supabase
        .from('mouvements_comptes')
        .insert([{
          ...data,
          solde_avant: compte.solde_actuel,
          solde_apres: soldeApres,
          date_mouvement: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      return { solde_avant: compte.solde_actuel, solde_apres: soldeApres };
    } catch (error: any) {
      console.error('Erreur création mouvement:', error);
      throw error;
    }
  }, []);

  // ✅ Supprimer un encaissement (avec mise à jour du compte)
  const deleteEncaissement = useCallback(async (paiementId: string) => {
    try {
      // 1. Récupérer les détails du paiement
      const { data: paiement, error: fetchError } = await supabase
        .from('paiements')
        .select('*')
        .eq('id', paiementId)
        .single();

      if (fetchError) throw fetchError;
      if (!paiement) throw new Error('Paiement non trouvé');

      // 2. Inverser le mouvement sur le compte
      if (paiement.compte_id) {
        await updateCompteSolde(paiement.compte_id, paiement.montant_paye, 'debit');
        
        // 3. Créer un mouvement d'annulation
        await createMouvementCompte({
          compte_id: paiement.compte_id,
          type_mouvement: 'debit',
          montant: paiement.montant_paye,
          description: `Annulation encaissement #${paiementId.slice(0, 8)}`,
          transaction_id: paiementId
        });
      }

      // 4. Supprimer le paiement
      const { error: deleteError } = await supabase
        .from('paiements')
        .delete()
        .eq('id', paiementId);

      if (deleteError) throw deleteError;

      toast.success('Encaissement supprimé et compte mis à jour');
      
      // 5. Rafraîchir les requêtes
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['comptes_financiers'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements_comptes'] });
      
      return paiement;
    } catch (error: any) {
      console.error('Erreur suppression encaissement:', error);
      toast.error('Erreur lors de la suppression', {
        description: error.message || 'Veuillez réessayer'
      });
      throw error;
    }
  }, [queryClient, updateCompteSolde, createMouvementCompte]);

  // ✅ Supprimer une transaction interne
  // NOTE: Les triggers SQL gèrent automatiquement:
  //   - L'inversion des soldes (trigger_revert_compte_after_transaction_delete)
  //   - La suppression des mouvements (trigger_delete_mouvements_before_transaction_delete)
  const deleteOperationInterne = useCallback(async (transactionId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) throw deleteError;

      toast.success('Opération supprimée et comptes mis à jour');
      
      // Rafraîchir les requêtes (les triggers ont déjà inversé les soldes et supprimé les mouvements)
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['comptes_financiers'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements_comptes'] });
      
    } catch (error: any) {
      console.error('Erreur suppression opération:', error);
      toast.error('Erreur lors de la suppression', {
        description: error.message || 'Veuillez réessayer'
      });
      throw error;
    }
  }, [queryClient]);

  return {
    // CRUD
    createEncaissement,
    createOperationInterne,
    deleteEncaissement,
    deleteOperationInterne,
    
    // Utilitaires
    updateCompteSolde,
    createMouvementCompte,
  };
};
