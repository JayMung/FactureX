import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Transitaire = {
    id: string;
    nom: string;
    telephone: string | null;
    ville: string | null;
    actif: boolean;
};

export const useTransitaires = () => {
    const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransitaires = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('transitaires')
                .select('*')
                .eq('actif', true)
                .order('nom');

            if (error) throw error;
            setTransitaires(data || []);
        } catch (err: any) {
            console.error('Error fetching transitaires:', err);
            setError(err.message);
            toast.error('Erreur lors du chargement des transitaires');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransitaires();
    }, [fetchTransitaires]);

    return {
        transitaires,
        loading,
        error,
        fetchTransitaires
    };
};
