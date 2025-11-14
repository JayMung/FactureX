-- Script pour corriger le solde du compte Rawbank
-- Le compte doit avoir $400 au lieu de $800

-- 1. Vérifier le solde actuel
SELECT nom, solde_actuel, devise 
FROM comptes_financiers 
WHERE nom = 'Rawbank';

-- 2. Vérifier les mouvements du compte
SELECT 
  m.date_mouvement,
  m.type_mouvement,
  m.montant,
  m.solde_avant,
  m.solde_apres,
  m.description
FROM mouvements_comptes m
JOIN comptes_financiers c ON m.compte_id = c.id
WHERE c.nom = 'Rawbank'
ORDER BY m.date_mouvement DESC;

-- 3. Vérifier les transactions liées au compte
SELECT 
  t.id,
  t.type_transaction,
  t.montant,
  t.motif,
  t.date_paiement,
  t.compte_destination_id
FROM transactions t
JOIN comptes_financiers c ON t.compte_destination_id = c.id
WHERE c.nom = 'Rawbank'
ORDER BY t.date_paiement DESC;

-- 4. Corriger le solde du compte Rawbank à $400
UPDATE comptes_financiers
SET solde_actuel = 400.00,
    updated_at = NOW()
WHERE nom = 'Rawbank';

-- 5. Vérifier la correction
SELECT nom, solde_actuel, devise 
FROM comptes_financiers 
WHERE nom = 'Rawbank';
