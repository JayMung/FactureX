# Migration du Module Factures

## Instructions pour exécuter la migration

### Option 1: Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre projet Supabase: https://app.supabase.com
2. Allez dans **SQL Editor**
3. Cliquez sur **New query**
4. Copiez et collez tout le contenu du fichier `20250123_factures_module.sql`
5. Cliquez sur **Run** pour exécuter la migration

### Option 2: Via Supabase CLI

Si vous avez installé Supabase CLI:

```bash
# Naviguez vers le dossier du projet
cd C:\Users\jkmun\dyad-apps\CoxiPay

# Exécutez la migration
supabase db push
```

## Ce que la migration fait

Cette migration crée:

### Tables
- **`factures`**: Table principale pour stocker les factures et devis
- **`facture_items`**: Table pour les lignes/items de chaque facture  
- **`product_categories`**: Table pour les catégories de produits (Normal, Liquide, Batterie)

### Fonctionnalités
- **Génération automatique du numéro de facture** au format FAC-2025-2419-001
- **Triggers** pour mettre à jour automatiquement `updated_at`
- **Indexes** pour optimiser les recherches
- **Row Level Security (RLS)** activé avec policies appropriées

### Paramètres par défaut
- Informations entreprise (nom, RCCM, IDNAT, NIF, email, téléphone, adresse)
- Logo et signature de l'entreprise
- Frais de livraison:
  - Aérien: 16 USD/kg
  - Maritime: 450 USD/cbm
- Conditions de vente par défaut

### Catégories de produits
- Normal
- Liquide
- Batterie

## Vérification

Après l'exécution, vous pouvez vérifier que tout s'est bien passé:

```sql
-- Vérifier que les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('factures', 'facture_items', 'product_categories');

-- Vérifier les catégories de produits
SELECT * FROM public.product_categories;

-- Vérifier les nouveaux paramètres
SELECT * FROM public.settings WHERE categorie IN ('company', 'shipping', 'invoice');
```

## En cas de problème

Si vous rencontrez des erreurs:

1. Vérifiez que la table `clients` existe (référencée par `factures`)
2. Vérifiez que la table `settings` existe (pour les paramètres)
3. Vérifiez que vous avez les permissions nécessaires
4. Consultez les logs d'erreur dans Supabase Dashboard

## Rollback

Si vous devez annuler la migration:

```sql
-- Supprimer les tables (attention: perte de données!)
DROP TABLE IF EXISTS public.facture_items CASCADE;
DROP TABLE IF EXISTS public.factures CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS generate_facture_number() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Supprimer les paramètres
DELETE FROM public.settings WHERE categorie IN ('company', 'shipping', 'invoice');
```
