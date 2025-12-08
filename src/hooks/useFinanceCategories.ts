import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinanceCategory {
  id: string;
  nom: string;
  code: string;
  type: 'revenue' | 'depense';
  icon: string;
  couleur: string;
  description?: string;
  is_active: boolean;
}

interface UseFinanceCategoriesOptions {
  type?: 'revenue' | 'depense';
}

export function useFinanceCategories(options?: UseFinanceCategoriesOptions) {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('finance_categories')
          .select('*')
          .eq('is_active', true)
          .order('nom');

        if (options?.type) {
          query = query.eq('type', options.type);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err: any) {
        console.error('Error fetching finance categories:', err);
        setError(err.message || 'Erreur lors du chargement des catégories');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [options?.type]);

  // Filtrer par type
  const revenueCategories = categories.filter(c => c.type === 'revenue');
  const depenseCategories = categories.filter(c => c.type === 'depense');

  return { 
    categories, 
    revenueCategories, 
    depenseCategories, 
    loading, 
    error 
  };
}

export default useFinanceCategories;
