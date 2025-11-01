// CETTE VERSION CORRIGE L'ERREUR "Cannot coerce the result to a single JSON object"
// Remplacez la fonction updateTransaction dans useTransactions.ts par celle-ci

const updateTransaction = async (id: string, transactionData: UpdateTransactionData) => {
  setIsUpdating(true);
  setError(null);

  try {
    // Si montant, devise ou motif changent, recalculer les frais et bénéfices
    let updatedData = { ...transactionData };
    
    if (transactionData.montant || transactionData.devise || transactionData.motif) {
      // Récupérer la transaction actuelle pour avoir toutes les valeurs
      const { data: currentTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (currentTransaction) {
        // Récupérer les paramètres
        const { data: settings } = await supabase
          .from('settings')
          .select('cle, valeur, categorie')
          .in('categorie', ['taux_change', 'frais'])
          .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);

        const rates: Record<string, number> = {
          usdToCny: 7.25,
          usdToCdf: 2850
        };

        const fees: Record<string, number> = {
          transfert: 5,
          commande: 10,
          partenaire: 3
        };

        settings?.forEach((setting: any) => {
          if (setting.categorie === 'taux_change') {
            rates[setting.cle] = parseFloat(setting.valeur);
          } else if (setting.categorie === 'frais') {
            fees[setting.cle] = parseFloat(setting.valeur);
          }
        });

        // Utiliser les nouvelles valeurs ou les valeurs actuelles
        const montant = transactionData.montant ?? currentTransaction.montant;
        const devise = transactionData.devise ?? currentTransaction.devise;
        const motif = transactionData.motif ?? currentTransaction.motif;

        const tauxUSD = devise === 'USD' ? 1 : rates.usdToCdf;
        const fraisUSD = montant * (fees[motif.toLowerCase() as keyof typeof fees] / 100);
        const montantNet = montant - fraisUSD;
        const montantCNY = devise === 'USD' 
          ? montantNet * rates.usdToCny 
          : (montantNet / tauxUSD) * rates.usdToCny;
        const commissionPartenaire = montant * (fees.partenaire / 100);
        const benefice = fraisUSD - commissionPartenaire;

        // Ajouter les champs calculés
        updatedData = {
          ...updatedData,
          taux_usd_cny: rates.usdToCny,
          taux_usd_cdf: rates.usdToCdf,
          montant_cny: montantCNY,
          frais: fraisUSD,
          benefice: benefice
        };
      }
    }

    // FIX: Supprimer .single() et gérer le tableau de résultats
    const { data, error } = await supabase
      .from('transactions')
      .update(updatedData)
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `);

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    // Prendre le premier résultat (devrait être le seul)
    const updatedTransaction = data && data.length > 0 ? data[0] : null;
    if (!updatedTransaction) {
      throw new Error('Transaction not found after update');
    }

    // Logger l'activité
    await activityLogger.logActivityWithChanges(
      'Modification Transaction',
      'transactions',
      id,
      {
        before: transactions.find(t => t.id === id),
        after: updatedTransaction
      }
    );

    showSuccess('Transaction mise à jour avec succès');
    
    // Forcer le refresh immédiatement
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => fetchTransactions(), 100);
    
    return updatedTransaction;
  } catch (err: any) {
    const friendlyMessage = getFriendlyErrorMessage(err, 'Erreur de mise à jour');
    setError(`Une erreur est survenue lors de la mise à jour de la transaction. Veuillez réessayer.`);
    showError(`Une erreur est survenue lors de la mise à jour de la transaction. Veuillez réessayer.`);
    throw err;
  } finally {
    setIsUpdating(false);
  }
};
