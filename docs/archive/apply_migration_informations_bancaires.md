# Migration : Ajouter la colonne informations_bancaires

## Erreur rencontrée
```
Could not find the 'informations_bancaires' column of 'factures' in the schema cache
```

## Solution

La colonne `informations_bancaires` n'existe pas dans la table `factures`. Elle doit être ajoutée.

## Méthode 1 : Via le Dashboard Supabase (Recommandé)

1. Allez sur **https://supabase.com/dashboard**
2. Sélectionnez votre projet **CoxiPay**
3. Allez dans **SQL Editor**
4. Copiez et exécutez le script suivant :

```sql
-- Migration pour ajouter la colonne informations_bancaires à la table factures
-- Date: 2025-01-24

-- Ajouter la colonne informations_bancaires
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS informations_bancaires TEXT;

-- Commentaire
COMMENT ON COLUMN public.factures.informations_bancaires IS 'Informations bancaires affichées au pied de la facture';
```

5. Cliquez sur **Run** pour exécuter la migration

## Méthode 2 : Via Supabase CLI (Si installé)

```bash
# Assurez-vous d'être dans le répertoire du projet
cd C:\Users\jkmun\dyad-apps\CoxiPay

# Appliquer la migration
supabase db push
```

## Vérification

Après avoir exécuté la migration, vérifiez que la colonne a été ajoutée :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'factures' 
AND column_name = 'informations_bancaires';
```

Résultat attendu :
```
column_name            | data_type
-----------------------|----------
informations_bancaires | text
```

## Ensuite

Une fois la migration appliquée, vous pourrez créer des factures avec les informations bancaires.
