# Guide de Référence : Statistiques Globales

## 🎯 Principe de Base

**Règle d'Or** : Les statistiques doivent TOUJOURS refléter toutes les données, pas seulement la page actuelle.

---

## 📊 Modules Implémentés

| Module | Hook Stats | Fichier | Statut |
|--------|-----------|---------|--------|
| Operations-Financieres | `useOperationsFinancieres` | `src/hooks/useOperationsFinancieres.ts` | ✅ |
| Transactions | `useTransactions` (modifié) | `src/hooks/useTransactions.ts` | ✅ |
| Factures | `useFactures` (modifié) | `src/hooks/useFactures.ts` | ✅ |
| Clients | `useClients` (modifié) | `src/hooks/useClients.ts` | ✅ |
| Mouvements-Comptes | `useMouvementsComptesStats` | `src/hooks/useMouvementsComptesStats.ts` | ✅ |
| Colis Aériens | Intégré dans `loadColis()` | `src/pages/Colis-Aeriens.tsx` | ✅ |

---

## 🔧 Comment Utiliser

### Exemple 1 : Hook Dédié (Operations-Financieres)

```tsx
import { useOperationsFinancieres } from '@/hooks/useOperationsFinancieres';

const MyComponent = () => {
  const { stats, loading, refetch } = useOperationsFinancieres();

  return (
    <Card>
      <CardContent>
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <>
            <div>{stats.totalDepenses}</div>
            <p>Toutes pages confondues</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

### Exemple 2 : Hook Existant Modifié (Transactions)

```tsx
import { useTransactions } from '@/hooks/useTransactions';

const MyComponent = () => {
  const { transactions, pagination, globalTotals } = useTransactions(page);

  return (
    <Card>
      <CardContent>
        <div>{globalTotals.totalCount}</div>
        <p>Toutes pages confondues</p>
      </CardContent>
    </Card>
  );
};
```

---

## 🏗️ Pattern : Créer un Nouveau Hook de Stats

### Template de Base

```typescript
// src/hooks/useMyModuleStats.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MyStats {
  total: number;
  count: number;
}

export const useMyModuleStats = (filters?: any) => {
  const [stats, setStats] = useState<MyStats>({
    total: 0,
    count: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Requête SANS pagination
      let query = supabase
        .from('my_table')
        .select('field1, field2');

      // Appliquer les filtres
      if (filters?.someFilter) {
        query = query.eq('field', filters.someFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Calculer les statistiques
      const total = data?.reduce((sum, item) => sum + item.field1, 0) || 0;

      setStats({
        total,
        count: data?.length || 0
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message);
      setStats({ total: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  }, [filters?.someFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
```

### Étapes d'Implémentation

1. **Créer le hook** dans `src/hooks/useMyModuleStats.ts`
2. **Exporter** dans `src/hooks/index.ts`
3. **Utiliser** dans la page concernée
4. **Remplacer** les calculs locaux par `globalStats`
5. **Ajouter** les indicateurs de chargement
6. **Tester** avec plusieurs pages de données

---

## ✅ Checklist de Validation

Avant de considérer une implémentation comme terminée :

- [ ] Les statistiques affichent le total global (pas seulement la page actuelle)
- [ ] Les statistiques restent constantes lors de la navigation entre pages
- [ ] Les indicateurs de chargement s'affichent correctement
- [ ] Les filtres sont appliqués aux statistiques globales
- [ ] Les statistiques se rafraîchissent après création/modification/suppression
- [ ] Le texte "Toutes pages confondues" est affiché
- [ ] Le hook est exporté dans `src/hooks/index.ts`
- [ ] La documentation est mise à jour

---

## 🚫 Erreurs Courantes à Éviter

### ❌ Mauvais : Calcul sur données paginées

```tsx
// NE PAS FAIRE ÇA
const stats = {
  total: items.reduce((sum, item) => sum + item.amount, 0)
};
// items contient seulement la page actuelle !
```

### ✅ Bon : Utiliser un hook dédié

```tsx
// FAIRE ÇA
const { stats, loading } = useMyModuleStats();
// stats contient TOUTES les données
```

### ❌ Mauvais : Utiliser pagination.count

```tsx
// NE PAS FAIRE ÇA
<div>{pagination?.count || 0}</div>
// count est le nombre d'items de la page actuelle
```

### ✅ Bon : Utiliser globalTotals

```tsx
// FAIRE ÇA
<div>{globalTotals.totalCount || 0}</div>
// totalCount est le nombre total d'items
```

---

## 🔍 Debugging

### Vérifier si les stats sont globales

```tsx
// Ajouter temporairement dans le composant
console.log('Items page actuelle:', items.length);
console.log('Total global:', globalStats.count);
// Si les deux sont égaux et vous avez plusieurs pages → PROBLÈME
```

### Vérifier la requête SQL

```tsx
// Dans le hook
const { data } = await supabase
  .from('table')
  .select('*');
  // ⚠️ PAS de .range() ici !
  // ⚠️ PAS de .limit() ici !

console.log('Nombre de lignes récupérées:', data?.length);
```

---

## 📈 Performance

### Optimisations Recommandées

1. **Sélectionner uniquement les champs nécessaires**
   ```typescript
   .select('montant, devise') // ✅ Bon
   .select('*')               // ❌ Éviter si possible
   ```

2. **Utiliser le cache React Query**
   ```typescript
   staleTime: 1000 * 60 * 5 // 5 minutes
   ```

3. **Charger les stats de manière asynchrone**
   ```typescript
   setTimeout(() => fetchGlobalTotals(), 0);
   ```

4. **Appliquer les filtres côté serveur**
   ```typescript
   if (filters?.status) {
     query = query.eq('statut', filters.status);
   }
   ```

---

## 📚 Ressources

### Documentation Complète
- `CORRECTION_STATISTIQUES_GLOBALES_COMPLETE.md` - Guide complet
- `AUDIT_STATISTIQUES_GLOBALES.md` - Audit détaillé
- `OPERATIONS_FINANCIERES_STATS_FIX.md` - Exemple détaillé

### Exemples de Code
- `src/hooks/useOperationsFinancieres.ts` - Hook dédié simple
- `src/hooks/useMouvementsComptesStats.ts` - Hook avec filtres
- `src/hooks/useTransactions.ts` - Hook existant modifié

---

## 🆘 Support

### Problème : Les stats changent entre les pages
**Solution** : Vous calculez probablement sur les données paginées. Créez un hook dédié.

### Problème : Les stats ne se rafraîchissent pas
**Solution** : Appelez `refetch()` après les opérations CRUD.

### Problème : Performance lente
**Solution** : Sélectionnez uniquement les champs nécessaires et utilisez le cache.

### Problème : Les filtres ne fonctionnent pas
**Solution** : Assurez-vous d'appliquer les mêmes filtres dans le hook de stats.

---

## 🎓 Bonnes Pratiques

1. **Toujours** créer un hook dédié pour les statistiques globales
2. **Toujours** ajouter des indicateurs de chargement
3. **Toujours** gérer les erreurs gracieusement
4. **Toujours** appliquer les filtres aux statistiques
5. **Toujours** tester avec plusieurs pages de données
6. **Toujours** documenter les calculs complexes
7. **Toujours** utiliser le cache pour améliorer les performances

---

**Dernière mise à jour** : 4 novembre 2025
**Version** : 1.0.0
**Auteur** : Équipe FactureX
