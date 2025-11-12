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
  const createOperationInterne = useCallback(async (data: CreateTransactionData) => {
    try {
      // 1. Créer la transaction
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          ...data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. Gérer les mouvements selon le type
      if (data.type_transaction === 'depense' && data.compte_source_id) {
        // Débiter le compte source
        await updateCompteSolde(data.compte_source_id, data.montant, 'debit');
        await createMouvementCompte({
          compte_id: data.compte_source_id,
          type_mouvement: 'debit',
          montant: data.montant,
          description: `Dépense: ${data.motif}`,
          transaction_id: transaction.id
        });
      }

      if (data.type_transaction === 'revenue' && data.compte_destination_id) {
        // Créditer le compte destination
        await updateCompteSolde(data.compte_destination_id, data.montant, 'credit');
        await createMouvementCompte({
          compte_id: data.compte_destination_id,
          type_mouvement: 'credit',
          montant: data.montant,
          description: `Revenu: ${data.motif}`,
          transaction_id: transaction.id
        });
      }

      if (data.type_transaction === 'transfert' && data.compte_source_id && data.compte_destination_id) {
        // Débiter le compte source
        await updateCompteSolde(data.compte_source_id, data.montant, 'debit');
        await createMouvementCompte({
          compte_id: data.compte_source_id,
          type_mouvement: 'debit',
          montant: data.montant,
          description: `Transfert vers compte #${data.compte_destination_id.slice(0, 8)}`,
          transaction_id: transaction.id
        });

        // Créditer le compte destination
        await updateCompteSolde(data.compte_destination_id, data.montant, 'credit');
        await createMouvementCompte({
          compte_id: data.compte_destination_id,
          type_mouvement: 'credit',
          montant: data.montant,
          description: `Transfert depuis compte #${data.compte_source_id.slice(0, 8)}`,
          transaction_id: transaction.id
        });
      }

      toast.success('Opération créée et comptes mis à jour');
      
      // 3. Rafraîchir les requêtes
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

  // ✅ Supprimer une transaction interne (avec mise à jour des comptes)
  const deleteOperationInterne = useCallback(async (transactionId: string) => {
    try {
      // 1. Récupérer les détails de la transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction non trouvée');

      // 2. Inverser les mouvements selon le type
      if (transaction.type_transaction === 'depense' && transaction.compte_source_id) {
        // Créditer le compte source (inverser la dépense)
        await updateCompteSolde(transaction.compte_source_id, transaction.montant, 'credit');
        await createMouvementCompte({
          compte_id: transaction.compte_source_id,
          type_mouvement: 'credit',
          montant: transaction.montant,
          description: `Annulation dépense: ${transaction.motif}`,
          transaction_id: transactionId
        });
      }

      if (transaction.type_transaction === 'revenue' && transaction.compte_destination_id) {
        // Débiter le compte destination (inverser le revenu)
        await updateCompteSolde(transaction.compte_destination_id, transaction.montant, 'debit');
        await createMouvementCompte({
          compte_id: transaction.compte_destination_id,
          type_mouvement: 'debit',
          montant: transaction.montant,
          description: `Annulation revenu: ${transaction.motif}`,
          transaction_id: transactionId
        });
      }

      if (transaction.type_transaction === 'transfert' && transaction.compte_source_id && transaction.compte_destination_id) {
        // Inverser le transfert
        await updateCompteSolde(transaction.compte_source_id, transaction.montant, 'credit');
        await updateCompteSolde(transaction.compte_destination_id, transaction.montant, 'debit');

        await createMouvementCompte({
          compte_id: transaction.compte_source_id,
          type_mouvement: 'credit',
          montant: transaction.montant,
          description: `Annulation transfert vers #${transaction.compte_destination_id.slice(0, 8)}`,
          transaction_id: transactionId
        });

        await createMouvementCompte({
          compte_id: transaction.compte_destination_id,
          type_mouvement: 'debit',
          montant: transaction.montant,
          description: `Annulation transfert depuis #${transaction.compte_source_id.slice(0, 8)}`,
          transaction_id: transactionId
        });
      }

      // 3. Supprimer la transaction
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) throw deleteError;

      toast.success('Opération supprimée et comptes mis à jour');
      
      // 4. Rafraîchir les requêtes
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['comptes_financiers'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements_comptes'] });
      
      return transaction;
    } catch (error: any) {
      console.error('Erreur suppression opération:', error);
      toast.error('Erreur lors de la suppression', {
        description: error.message || 'Veuillez réessayer'
      });
      throw error;
    }
  }, [queryClient, updateCompteSolde, createMouvementCompte]);

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
