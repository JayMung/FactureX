import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  events: string[];
  format: 'json' | 'discord' | 'slack' | 'n8n';
  secret: string | null;
  filters: any;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  created_by: string;
}

interface CreateWebhookData {
  name: string;
  url: string;
  events: string[];
  format: 'json' | 'discord' | 'slack' | 'n8n';
  secret?: string;
  filters?: any;
}

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWebhooks(data || []);
    } catch (error: any) {
      console.error('Error fetching webhooks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const createWebhook = async (webhookData: CreateWebhookData): Promise<boolean> => {
    try {
      // Récupérer l'organization_id de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Impossible de récupérer votre profil. Veuillez vous reconnecter.');
      }

      if (!profile?.organization_id) {
        throw new Error('Votre profil n\'a pas d\'organisation associée. Contactez un administrateur.');
      }

      // Générer un secret si non fourni
      const secret = webhookData.secret || generateSecret();

      // Insérer dans la base de données
      const { data: insertedWebhook, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: profile.organization_id,
          name: webhookData.name,
          url: webhookData.url,
          events: webhookData.events,
          format: webhookData.format,
          secret,
          filters: webhookData.filters || {},
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Webhook créé avec succès',
      });

      // Rafraîchir la liste
      await fetchWebhooks();

      return true;
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateWebhook = async (webhookId: string, webhookData: Partial<CreateWebhookData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({
          name: webhookData.name,
          url: webhookData.url,
          events: webhookData.events,
          format: webhookData.format,
          secret: webhookData.secret,
          filters: webhookData.filters,
        })
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Webhook mis à jour avec succès',
      });

      // Rafraîchir la liste
      await fetchWebhooks();

      return true;
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteWebhook = async (webhookId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Webhook supprimé avec succès',
      });

      // Rafraîchir la liste
      await fetchWebhooks();

      return true;
    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive })
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Webhook ${isActive ? 'activé' : 'désactivé'} avec succès`,
      });

      // Rafraîchir la liste
      await fetchWebhooks();

      return true;
    } catch (error: any) {
      console.error('Error toggling webhook:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le statut du webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    webhooks,
    loading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    refetch: fetchWebhooks,
  };
}

// Fonction utilitaire pour générer un secret aléatoire
function generateSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return 'whsec_' + Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
