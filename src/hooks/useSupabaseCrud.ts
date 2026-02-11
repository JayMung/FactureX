/**
 * useSupabaseCrud.ts — Hook générique WRITE (Create, Update, Delete) pour Supabase
 *
 * Utilise TanStack Query v5 mutations avec :
 * - Invalidation automatique des query keys liées
 * - Toasts de succès/erreur via sonner
 * - Activity logging optionnel
 * - Typage strict TypeScript
 *
 * Remplace le pattern dupliqué :
 *   useMutation({ mutationFn, onSuccess: toast + invalidate, onError: toast })
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { activityLogger } from '@/services/activityLogger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Configuration du hook useSupabaseCrud */
export interface UseSupabaseCrudConfig<T> {
  /** Nom de la table Supabase */
  table: string;
  /** Clé de query React Query principale (sera invalidée après chaque mutation) */
  queryKey: string;
  /** Label de l'entité pour les toasts (ex: 'Client', 'Paiement', 'Colis') */
  entityLabel: string;
  /** Colonnes à retourner après insert/update (défaut: '*') */
  select?: string;
  /**
   * Clés de query supplémentaires à invalider après une mutation.
   * Ex: ['dashboardStats', 'comptes'] pour rafraîchir le dashboard et les comptes.
   */
  relatedQueryKeys?: string[];
  /** Activer le logging d'activité (défaut: false) */
  enableActivityLog?: boolean;
  /** Nom du module pour l'activity log (défaut: table name) */
  activityModule?: string;
  /**
   * Transforme les données avant insertion.
   * Utile pour ajouter organization_id, created_by, etc.
   *
   * @example
   * ```ts
   * beforeCreate: async (data) => ({
   *   ...data,
   *   organization_id: orgId,
   *   created_by: userId,
   * })
   * ```
   */
  beforeCreate?: (data: Partial<T>) => Promise<Partial<T>> | Partial<T>;
  /**
   * Callback après une mutation réussie (create, update ou delete).
   * Appelé après l'invalidation des queries et le toast.
   */
  onMutationSuccess?: (operation: 'create' | 'update' | 'delete', data?: T) => void;
}

/** Paramètres pour la mutation update */
export interface UpdateParams<T> {
  id: string;
  data: Partial<T>;
}

/** Résultat d'une mutation */
export interface MutationResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Messages d'erreur localisés ─────────────────────────────────────────────

function getSuccessMessage(label: string, operation: 'create' | 'update' | 'delete'): string {
  switch (operation) {
    case 'create':
      return `${label} créé(e) avec succès`;
    case 'update':
      return `${label} mis(e) à jour avec succès`;
    case 'delete':
      return `${label} supprimé(e) avec succès`;
  }
}

function getErrorMessage(label: string, operation: 'create' | 'update' | 'delete'): string {
  switch (operation) {
    case 'create':
      return `Erreur lors de la création du/de la ${label.toLowerCase()}`;
    case 'update':
      return `Erreur lors de la mise à jour du/de la ${label.toLowerCase()}`;
    case 'delete':
      return `Erreur lors de la suppression du/de la ${label.toLowerCase()}`;
  }
}

// ─── Hook principal ──────────────────────────────────────────────────────────

/**
 * Hook générique pour les opérations CRUD (Create, Update, Delete) Supabase.
 *
 * @example Usage basique
 * ```ts
 * const { create, update, remove, isCreating, isUpdating, isDeleting } = useSupabaseCrud<Client>({
 *   table: 'clients',
 *   queryKey: 'clients',
 *   entityLabel: 'Client',
 *   relatedQueryKeys: ['dashboardStats'],
 * });
 *
 * // Créer
 * create({ nom: 'Acme Corp', telephone: '+243...' });
 *
 * // Mettre à jour
 * update({ id: 'uuid', data: { nom: 'Acme Inc' } });
 *
 * // Supprimer
 * remove('uuid');
 * ```
 *
 * @example Avec transformation avant création
 * ```ts
 * const { create } = useSupabaseCrud<CompteFinancier>({
 *   table: 'comptes_financiers',
 *   queryKey: 'comptes',
 *   entityLabel: 'Compte',
 *   beforeCreate: async (data) => {
 *     const { data: { user } } = await supabase.auth.getUser();
 *     return { ...data, created_by: user?.id, organization_id: orgId };
 *   },
 * });
 * ```
 */
export function useSupabaseCrud<T extends { id: string }>(
  config: UseSupabaseCrudConfig<T>
) {
  const {
    table,
    queryKey,
    entityLabel,
    select = '*',
    relatedQueryKeys = [],
    enableActivityLog = false,
    activityModule,
    beforeCreate,
    onMutationSuccess,
  } = config;

  const queryClient = useQueryClient();

  /** Invalide toutes les query keys liées */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    for (const key of relatedQueryKeys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  // ─── CREATE ──────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (inputData: Partial<T>): Promise<T> => {
      let data = inputData;

      // Apply transformation
      if (beforeCreate) {
        data = await beforeCreate(data);
      }

      const { data: created, error } = await supabase
        .from(table)
        .insert(data as any)
        .select(select)
        .single();

      if (error) {
        console.error(`[useSupabaseCrud] CREATE ${table} error:`, error);
        // Handle duplicate errors specifically
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error(`Un(e) ${entityLabel.toLowerCase()} avec ces données existe déjà`);
        }
        throw new Error(error.message || getErrorMessage(entityLabel, 'create'));
      }

      if (!created) {
        throw new Error(`Échec de la création du/de la ${entityLabel.toLowerCase()}`);
      }

      return created as T;
    },
    onSuccess: (data: T) => {
      showSuccess(getSuccessMessage(entityLabel, 'create'));
      invalidateAll();

      if (enableActivityLog) {
        activityLogger.logActivityWithChanges(
          `Création ${entityLabel}`,
          activityModule ?? table,
          data.id,
          { before: null, after: data }
        );
      }

      onMutationSuccess?.('create', data);
    },
    onError: (error: Error) => {
      showError(error.message || getErrorMessage(entityLabel, 'create'));
    },
  });

  // ─── UPDATE ──────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: UpdateParams<T>): Promise<T> => {
      const { data: updated, error } = await supabase
        .from(table)
        .update(data as any)
        .eq('id', id)
        .select(select)
        .single();

      if (error) {
        console.error(`[useSupabaseCrud] UPDATE ${table} error:`, error);
        throw new Error(error.message || getErrorMessage(entityLabel, 'update'));
      }

      if (!updated) {
        throw new Error(`Échec de la mise à jour du/de la ${entityLabel.toLowerCase()}`);
      }

      return updated as T;
    },
    onSuccess: (data: T, variables: UpdateParams<T>) => {
      showSuccess(getSuccessMessage(entityLabel, 'update'));
      invalidateAll();

      if (enableActivityLog) {
        activityLogger.logActivityWithChanges(
          `Modification ${entityLabel}`,
          activityModule ?? table,
          variables.id,
          { before: variables.data, after: data }
        );
      }

      onMutationSuccess?.('update', data);
    },
    onError: (error: Error) => {
      showError(error.message || getErrorMessage(entityLabel, 'update'));
    },
  });

  // ─── DELETE ──────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[useSupabaseCrud] DELETE ${table} error:`, error);
        throw new Error(error.message || getErrorMessage(entityLabel, 'delete'));
      }

      return id;
    },
    onSuccess: (id: string) => {
      showSuccess(getSuccessMessage(entityLabel, 'delete'));
      invalidateAll();

      if (enableActivityLog) {
        activityLogger.logActivity(
          `Suppression ${entityLabel}`,
          activityModule ?? table,
          id
        );
      }

      onMutationSuccess?.('delete');
    },
    onError: (error: Error) => {
      showError(error.message || getErrorMessage(entityLabel, 'delete'));
    },
  });

  // ─── Return ──────────────────────────────────────────────────────────

  return {
    /** Créer un nouvel enregistrement */
    create: createMutation.mutate,
    /** Créer un nouvel enregistrement (async, retourne le résultat) */
    createAsync: createMutation.mutateAsync,
    /** Mettre à jour un enregistrement */
    update: updateMutation.mutate,
    /** Mettre à jour un enregistrement (async, retourne le résultat) */
    updateAsync: updateMutation.mutateAsync,
    /** Supprimer un enregistrement par ID */
    remove: deleteMutation.mutate,
    /** Supprimer un enregistrement par ID (async) */
    removeAsync: deleteMutation.mutateAsync,

    /** Création en cours */
    isCreating: createMutation.isPending,
    /** Mise à jour en cours */
    isUpdating: updateMutation.isPending,
    /** Suppression en cours */
    isDeleting: deleteMutation.isPending,
    /** N'importe quelle mutation en cours */
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,

    /** Erreur de la dernière création */
    createError: createMutation.error?.message ?? null,
    /** Erreur de la dernière mise à jour */
    updateError: updateMutation.error?.message ?? null,
    /** Erreur de la dernière suppression */
    deleteError: deleteMutation.error?.message ?? null,
  };
}
