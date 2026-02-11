/**
 * useSupabaseQuery.ts — Hook générique READ pour Supabase + TanStack Query v5
 *
 * Remplace le pattern dupliqué :
 *   useQuery({ queryKey, queryFn: async () => { supabase.from(table).select()... } })
 *
 * Compatible avec les filtres dynamiques, pagination, et tri.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Configuration de tri */
export interface QueryOrderBy {
  column: string;
  ascending?: boolean;
}

/** Configuration de pagination */
export interface QueryPagination {
  page: number;
  pageSize: number;
}

/** Résultat paginé */
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Configuration du hook useSupabaseQuery */
export interface UseSupabaseQueryConfig<T, F = Record<string, unknown>> {
  /** Nom de la table Supabase */
  table: string;
  /** Clé de query React Query (sera préfixée par le nom de table) */
  queryKey: string;
  /** Colonnes à sélectionner (défaut: '*'). Supporte les relations Supabase. */
  select?: string;
  /** Tri par défaut */
  orderBy?: QueryOrderBy;
  /** Pagination (optionnel — sans pagination, retourne tous les résultats) */
  pagination?: QueryPagination;
  /** Filtres dynamiques à appliquer à la query */
  filters?: F;
  /**
   * Fonction pour appliquer les filtres à la query Supabase.
   * Reçoit le query builder et les filtres, doit retourner le query builder modifié.
   *
   * @example
   * ```ts
   * applyFilters: (query, filters) => {
   *   if (filters.status) query = query.eq('status', filters.status);
   *   if (filters.search) query = query.ilike('nom', `%${filters.search}%`);
   *   return query;
   * }
   * ```
   */
  applyFilters?: (query: any, filters: F) => any;
  /** Durée de cache en ms (défaut: 5 minutes) */
  staleTime?: number;
  /** Activer/désactiver la query (défaut: true) */
  enabled?: boolean;
  /** Options supplémentaires TanStack Query */
  queryOptions?: Partial<UseQueryOptions>;
}

// ─── Hook principal ──────────────────────────────────────────────────────────

/**
 * Hook générique pour les requêtes SELECT Supabase.
 *
 * @example Simple (tous les enregistrements)
 * ```ts
 * const { data, isLoading, error } = useSupabaseQuery<Colis>({
 *   table: 'colis',
 *   queryKey: 'colis-all',
 *   select: 'id, statut, tracking_chine',
 *   orderBy: { column: 'created_at', ascending: false },
 * });
 * ```
 *
 * @example Avec filtres et pagination
 * ```ts
 * const { data, pagination, isLoading } = useSupabaseQuery<Paiement, PaiementFilters>({
 *   table: 'paiements',
 *   queryKey: 'paiements',
 *   select: '*, client:clients(nom, telephone)',
 *   pagination: { page: 1, pageSize: 20 },
 *   filters: { type_paiement: 'facture', date_debut: '2026-01-01' },
 *   applyFilters: (query, filters) => {
 *     if (filters.type_paiement) query = query.eq('type_paiement', filters.type_paiement);
 *     if (filters.date_debut) query = query.gte('date_paiement', filters.date_debut);
 *     return query;
 *   },
 * });
 * ```
 */
export function useSupabaseQuery<T, F = Record<string, unknown>>(
  config: UseSupabaseQueryConfig<T, F>
) {
  const {
    table,
    queryKey,
    select = '*',
    orderBy,
    pagination,
    filters,
    applyFilters,
    staleTime = 1000 * 60 * 5, // 5 minutes
    enabled = true,
    queryOptions,
  } = config;

  const queryResult = useQuery({
    queryKey: [queryKey, pagination?.page, filters],
    queryFn: async (): Promise<PaginatedResult<T> | T[]> => {
      // Build base query
      let query: any = supabase
        .from(table)
        .select(select, pagination ? { count: 'exact' } : undefined);

      // Apply custom filters
      if (filters && applyFilters) {
        query = applyFilters(query, filters);
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, {
          ascending: orderBy.ascending ?? false,
        });
      }

      // Apply pagination
      if (pagination) {
        const { page, pageSize } = pagination;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`[useSupabaseQuery] ${table} error:`, error);
        throw new Error(error.message || `Erreur lors du chargement de ${table}`);
      }

      // Return paginated result or raw array
      if (pagination) {
        const totalCount = count ?? 0;
        return {
          data: (data as T[]) ?? [],
          count: totalCount,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: Math.ceil(totalCount / pagination.pageSize),
        } satisfies PaginatedResult<T>;
      }

      return (data as T[]) ?? [];
    },
    staleTime,
    enabled,
    ...queryOptions,
  });

  // Determine if result is paginated
  const rawData = queryResult.data;
  const isPaginated = rawData && typeof rawData === 'object' && 'totalPages' in rawData;

  return {
    /** Données brutes (tableau ou résultat paginé) */
    rawData,
    /** Tableau de données (toujours un array, que ce soit paginé ou non) */
    data: isPaginated
      ? (rawData as PaginatedResult<T>).data
      : (rawData as T[] | undefined) ?? [],
    /** Infos de pagination (null si pas de pagination) */
    pagination: isPaginated
      ? {
          count: (rawData as PaginatedResult<T>).count,
          page: (rawData as PaginatedResult<T>).page,
          pageSize: (rawData as PaginatedResult<T>).pageSize,
          totalPages: (rawData as PaginatedResult<T>).totalPages,
        }
      : null,
    /** État de chargement */
    isLoading: queryResult.isLoading,
    /** État de refetch en arrière-plan */
    isFetching: queryResult.isFetching,
    /** Message d'erreur (string ou null) */
    error: queryResult.error?.message ?? null,
    /** Fonction pour rafraîchir les données */
    refetch: queryResult.refetch,
  };
}
