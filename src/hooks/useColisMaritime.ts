import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ColisMaritime = {
    id: string;
    client_id: string;
    tracking_number: string | null;
    description: string | null;
    cbm: number;
    poids: number;
    quantite: number;
    tarif_cbm: number | null;
    montant_total: number | null;
    statut_paiement: string;
    container_id: string | null;
    statut: string;
    date_reception_chine: string | null;
    date_chargement: string | null;
    date_arrivee: string | null;
    date_livraison: string | null;
    notes: string | null;
    photos: string[] | null;
    client?: { nom: string; email: string; telephone: string } | null; // Joined
    container?: { numero: string; statut: string } | null; // Joined
    created_at: string;
};

export const useColisMaritime = () => {
    const [colis, setColis] = useState<ColisMaritime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchColis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('colis_maritime')
                .select(`
                    *,
                    client:clients(nom, email, telephone),
                    container:containers_maritime(numero, statut)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setColis(data || []);
        } catch (err: any) {
            console.error('Error fetching colis maritime:', err);
            setError(err.message);
            toast.error('Erreur lors du chargement des colis maritimes');
        } finally {
            setLoading(false);
        }
    }, []);

    const createColis = async (data: Partial<ColisMaritime>) => {
        try {
            const { data: newColis, error } = await supabase
                .from('colis_maritime')
                .insert([data])
                .select()
                .single();

            if (error) throw error;

            setColis(prev => [newColis as ColisMaritime, ...prev]);
            toast.success('Colis maritime créé avec succès');
            return newColis;
        } catch (err: any) {
            console.error('Error creating colis maritime:', err);
            toast.error('Erreur lors de la création du colis');
            throw err;
        }
    };

    const updateColis = async (id: string, updates: Partial<ColisMaritime>) => {
        try {
            const { data: updated, error } = await supabase
                .from('colis_maritime')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setColis(prev => prev.map(c => c.id === id ? { ...c, ...updated } as ColisMaritime : c));
            toast.success('Colis maritime mis à jour');
            return updated;
        } catch (err: any) {
            console.error('Error updating colis maritime:', err);
            toast.error('Erreur lors de la mise à jour');
            throw err;
        }
    };

    const deleteColis = async (id: string) => {
        try {
            const { error } = await supabase
                .from('colis_maritime')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setColis(prev => prev.filter(c => c.id !== id));
            toast.success('Colis supprimé');
        } catch (err: any) {
            console.error('Error deleting colis:', err);
            toast.error('Erreur lors de la suppression');
            throw err;
        }
    }

    useEffect(() => {
        fetchColis();
    }, [fetchColis]);

    return {
        colis,
        loading,
        error,
        fetchColis,
        createColis,
        updateColis,
        deleteColis
    };
};
