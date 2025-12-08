import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUpdateColisStatut = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatut = async (id: string, statut: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('colis')
        .update({ 
          statut,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success('Statut mis à jour avec succès');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour du statut';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStatutPaiement = async (id: string, statutPaiement: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('colis')
        .update({ 
          statut_paiement: statutPaiement,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success('Statut paiement mis à jour avec succès');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour du statut paiement';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateStatut,
    updateStatutPaiement,
    loading,
    error
  };
};
