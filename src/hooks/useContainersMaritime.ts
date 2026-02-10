import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ContainerMaritime = {
    id: string;
    numero: string;
    transitaire_id: string | null;
    statut: string;
    date_depart: string | null;
    date_arrivee_prevue: string | null;
    date_arrivee_effective: string | null;
    bateau: string | null;
    numero_voyage: string | null;
    notes: string | null;
    created_at: string;
    transitaire?: { nom: string } | null; // Joined
    colis_count?: number; // Calculated/Joined
};

export const useContainersMaritime = () => {
    const [containers, setContainers] = useState<ContainerMaritime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContainers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch containers with transitaire info
            const { data, error } = await supabase
                .from('containers_maritime')
                .select(`
                    *,
                    transitaire:transitaires!containers_maritime_transitaire_id_fkey(nom)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch colis counts for each container (using a separate query or join if count was easy, separate is safer for now without view)
            // Or simpler: just list containers. We can fetch counts if needed.
            // Let's stick to basic list for now.

            setContainers(data || []);
        } catch (err: any) {
            console.error('Error fetching containers:', err);
            setError(err.message);
            toast.error('Erreur lors du chargement des containers');
        } finally {
            setLoading(false);
        }
    }, []);

    const createContainer = async (data: Partial<ContainerMaritime>) => {
        try {
            const { data: newContainer, error } = await supabase
                .from('containers_maritime')
                .insert([data])
                .select()
                .single();

            if (error) throw error;

            await fetchContainers(); // Refresh to get joined transitaire info
            toast.success('Container créé avec succès');
            return newContainer;
        } catch (err: any) {
            console.error('Error creating container:', err);
            toast.error('Erreur lors de la création du container');
            throw err;
        }
    };

    const updateContainer = async (id: string, updates: Partial<ContainerMaritime>) => {
        try {
            const { data: updated, error } = await supabase
                .from('containers_maritime')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await fetchContainers(); // Refresh to get joined transitaire info
            toast.success('Container mis à jour');
            return updated;
        } catch (err: any) {
            console.error('Error updating container:', err);
            toast.error('Erreur lors de la mise à jour');
            throw err;
        }
    };

    useEffect(() => {
        fetchContainers();
    }, [fetchContainers]);

    return {
        containers,
        loading,
        error,
        fetchContainers,
        createContainer,
        updateContainer
    };
};
