import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';

interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  type: 'public' | 'secret' | 'admin';
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApiKeys(data || []);
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
      toast.error('Impossible de charger les clés API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const createApiKey = async (
    name: string,
    type: 'public' | 'secret' | 'admin',
    permissions: string[],
    expiresInDays: number
  ): Promise<{ success: boolean; key?: string; error?: string }> => {
    if (!user?.id) {
      console.warn('[useApiKeys] createApiKey called with no authenticated user');
      toast.error('Vous devez être connecté pour créer une clé API.');
      return { success: false, error: 'Utilisateur non connecté' };
    }

    try {
      // Générer une clé API
      const prefix = type === 'public' ? 'pk_live_' : type === 'secret' ? 'sk_live_' : 'ak_live_';
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const randomString = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const apiKey = `${prefix}${randomString}`;

      // Hasher la clé (SHA-256)
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Calculer la date d'expiration
      const expiresAt = expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Récupérer l'organization_id de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Impossible de récupérer votre profil. Veuillez vous reconnecter.');
      }

      if (!profile?.organization_id) {
        throw new Error('Votre profil n\'a pas d\'organisation associée. Contactez un administrateur.');
      }

      // Vérifier que l'utilisateur est admin via admin_roles
      const { data: adminRole, error: adminError } = await supabase
        .from('admin_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminRole || !adminRole.is_active) {
        throw new Error('Vous devez être administrateur pour créer des clés API.');
      }

      if (!['super_admin', 'admin'].includes(adminRole.role)) {
        throw new Error('Vous devez être administrateur pour créer des clés API.');
      }

      // Insérer dans la base de données
      const { data: insertedKey, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: profile.organization_id,
          name,
          key_hash: keyHash,
          key_prefix: prefix,
          type,
          permissions,
          is_active: true,
          expires_at: expiresAt,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Clé API créée avec succès');

      // Rafraîchir la liste
      await fetchApiKeys();

      return { success: true, key: apiKey };
    } catch (error: any) {
      console.error('Error creating API key:', error);

      // Detect RLS policy violation
      const isRlsError = error?.code === '42501' ||
        error?.message?.includes('row-level security') ||
        error?.message?.includes('policy');

      const userMessage = isRlsError
        ? 'Accès refusé : vous n\'avez pas les permissions nécessaires pour créer une clé API. Vérifiez votre rôle administrateur.'
        : (error.message || 'Impossible de créer la clé API');

      toast.error(userMessage);
      return { success: false, error: userMessage };
    }
  };

  const deleteApiKey = async (keyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast.success('Clé API supprimée avec succès');

      // Rafraîchir la liste
      await fetchApiKeys();

      return true;
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      toast.error(error.message || 'Impossible de supprimer la clé API');
      return false;
    }
  };

  const rotateApiKey = async (keyId: string): Promise<{ success: boolean; key?: string }> => {
    try {
      // Récupérer la clé existante
      const { data: existingKey, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (fetchError || !existingKey) throw new Error('Clé API non trouvée');

      // Créer une nouvelle clé avec les mêmes paramètres
      const result = await createApiKey(
        existingKey.name + ' (Rotated)',
        existingKey.type,
        existingKey.permissions,
        existingKey.expires_at
          ? Math.ceil((new Date(existingKey.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : 0
      );

      if (result.success) {
        // Désactiver l'ancienne clé
        await supabase
          .from('api_keys')
          .update({ is_active: false })
          .eq('id', keyId);

        toast.success('Clé API rotée avec succès. L\'ancienne clé a été désactivée.');

        return { success: true, key: result.key };
      }

      return { success: false };
    } catch (error: any) {
      console.error('Error rotating API key:', error);
      toast.error(error.message || 'Impossible de roter la clé API');
      return { success: false };
    }
  };

  return {
    apiKeys,
    loading,
    createApiKey,
    deleteApiKey,
    rotateApiKey,
    refetch: fetchApiKeys,
  };
}
