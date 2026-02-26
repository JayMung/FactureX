import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeleteColis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteColis = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Delete related paiements_colis first
      const { error: paiementsColisError } = await supabase
        .from('paiements_colis')
        .delete()
        .eq('colis_id', id);
      
      if (paiementsColisError) {
        console.error('Error deleting paiements_colis:', paiementsColisError);
        // Continue anyway, might not exist
      }

      // Step 2: Delete related paiements (if colis_id column exists)
      const { error: paiementsError } = await supabase
        .from('paiements')
        .delete()
        .eq('colis_id', id);
      
      if (paiementsError) {
        console.error('Error deleting paiements:', paiementsError);
        // Continue anyway, might not exist or column might not exist
      }

      // Step 3: Delete the colis
      const { error: deleteError, count } = await supabase
        .from('colis')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(deleteError.message || 'Erreur lors de la suppression');
      }

      // Check if any row was actually deleted
      if (count === 0) {
        console.error('No rows deleted - RLS policy may be blocking');
        throw new Error('Colis non trouvé ou permissions insuffisantes');
      }

      toast.success('Colis supprimé avec succès');
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || err?.error_description || 'Erreur lors de la suppression du colis';
      console.error('Full delete error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteMultipleColis = async (ids: string[]) => {
    let successCount = 0;
    let failCount = 0;
    
    // Supprimer tous les colis sans toast individuels
    for (const id of ids) {
      try {
        // Step 1: Delete related paiements_colis first
        await supabase
          .from('paiements_colis')
          .delete()
          .eq('colis_id', id);

        // Step 2: Delete related paiements
        await supabase
          .from('paiements')
          .delete()
          .eq('colis_id', id);

        // Step 3: Delete the colis
        const { error: deleteError, count } = await supabase
          .from('colis')
          .delete({ count: 'exact' })
          .eq('id', id);

        if (deleteError || count === 0) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    // Un seul toast avec le résumé
    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} colis supprimé${successCount > 1 ? 's' : ''} avec succès`);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`${successCount} colis supprimé${successCount > 1 ? 's' : ''}, ${failCount} échec${failCount > 1 ? 's' : ''}`);
    } else {
      toast.error(`Échec de la suppression - ${failCount} colis non supprimé${failCount > 1 ? 's' : ''}`);
    }
    
    return { successCount, failCount };
  };

  return {
    deleteColis,
    deleteMultipleColis,
    loading,
    error
  };
};
