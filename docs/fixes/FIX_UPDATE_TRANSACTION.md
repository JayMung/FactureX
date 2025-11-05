# Fix pour l'erreur "Cannot coerce the result to a single JSON object"

## Problème
L'erreur survient lors de la mise à jour d'une transaction car `.single()` attend exactement un résultat.

## Solution temporaire
Supprimez `.single()` de la ligne 305 dans `src/hooks/useTransactions.ts`

### Avant (ligne 297-305):
```typescript
const { data, error } = await supabase
  .from('transactions')
  .update(updatedData)
  .eq('id', id)
  .select(`
    *,
    client:clients(*)
  `)
  .single();  // <-- SUPPRIMER CETTE LIGNE
```

### Après:
```typescript
const { data, error } = await supabase
  .from('transactions')
  .update(updatedData)
  .eq('id', id)
  .select(`
    *,
    client:clients(*)
  `);

if (error) throw error;

// Prendre le premier résultat
const updatedTransaction = data && data.length > 0 ? data[0] : null;
if (!updatedTransaction) {
  throw new Error('Transaction not found after update');
}
```

### Et modifier la ligne 316:
```typescript
// Avant:
after: data

// Après:
after: updatedTransaction
```

### Et modifier la ligne 326:
```typescript
// Avant:
return data;

// Après:
return updatedTransaction;
```

Cela devrait résoudre l'erreur de mise à jour des transactions.
