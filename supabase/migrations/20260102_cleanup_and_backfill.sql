-- 1. Remove duplicate finance_categories (keeping the oldest one)
DELETE FROM finance_categories
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (partition BY nom, type ORDER BY created_at ASC) as r_num
    FROM finance_categories
  ) t
  WHERE t.r_num > 1
);

-- 2. Backfill category_id for transactions using exact name match
-- CASE 1: Revenue transactions
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND (t.type_transaction = 'revenue' OR t.type_transaction = 'transfert') -- Transferts use Revenue categories usually
AND (t.categorie = fc.nom OR t.motif = fc.nom)
AND fc.type = 'revenue';

-- CASE 2: Expense transactions
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND t.type_transaction = 'depense'
AND (t.categorie = fc.nom OR t.motif = fc.nom)
AND fc.type = 'depense';

-- 3. Backfill common mappings (Specific fixes)

-- "Commande" -> "Commande (Facture)" (Revenue)
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND (t.categorie = 'Commande' OR t.motif = 'Commande')
AND fc.nom = 'Commande (Facture)'
AND fc.type = 'revenue';

-- "Transfert" -> "Transfert (Argent)" (Revenue/Transfert)
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND (t.categorie = 'Transfert' OR t.motif = 'Transfert')
AND fc.nom = 'Transfert (Argent)'
AND fc.type = 'revenue';

-- "Autres Paiement" -> "Autres Paiements" (Revenue)
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND (t.categorie LIKE 'Autres Paiement%' OR t.motif LIKE 'Autres Paiement%')
AND fc.nom = 'Autres Paiements'
AND fc.type = 'revenue';

-- "Frais d'installation..." -> "Frais d'installation" (Depense usually?)
-- Let's check type of "Frais d'installation" in DB. It's likely Depense.
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND t.motif ILIKE 'Frais d%'
AND fc.nom = 'Frais d''installation';

-- "Réconciliation..." -> "Autre Dépense" (Depense)
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND t.motif ILIKE 'Réconciliation%'
AND fc.nom = 'Autre Dépense'
AND fc.type = 'depense';

-- "Carburant" -> "Carburant" (Depense)
UPDATE transactions t
SET category_id = fc.id
FROM finance_categories fc
WHERE t.category_id IS NULL
AND (t.categorie = 'Carburant' OR t.motif = 'Carburant')
AND fc.nom = 'Carburant'
AND fc.type = 'depense';
