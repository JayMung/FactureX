-- Migration: Unify recalculation logic and ensure it fires after every transaction
-- This fixes the issue where movements created by transaction triggers had stale balances

-- 1. Ensure the core recalculation function is robust
CREATE OR REPLACE FUNCTION recalculate_compte_balances(p_compte_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Recalculate all `solde_avant` and `solde_apres` chronologically
    -- We use a CTE with a window function for performance on small-to-medium datasets
    -- ordering by date_mouvement and then created_at to preserve sequence
    WITH OrderedMouvements AS (
        SELECT 
            id,
            montant,
            type_mouvement,
            CASE WHEN type_mouvement = 'credit' THEN montant ELSE -montant END AS net_change,
            SUM(CASE WHEN type_mouvement = 'credit' THEN montant ELSE -montant END) 
                OVER (ORDER BY date_mouvement ASC, created_at ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total
        FROM mouvements_comptes
        WHERE compte_id = p_compte_id
    )
    UPDATE mouvements_comptes mc
    SET 
        solde_apres = om.running_total,
        solde_avant = om.running_total - om.net_change
    FROM OrderedMouvements om
    WHERE mc.id = om.id 
    AND (
        mc.solde_apres IS DISTINCT FROM om.running_total 
        OR mc.solde_avant IS DISTINCT FROM (om.running_total - om.net_change)
    );

    -- Force the actual account balance to match the final chronological balance
    UPDATE comptes_financiers
    SET solde_actuel = COALESCE((
        SELECT solde_apres 
        FROM mouvements_comptes 
        WHERE compte_id = p_compte_id 
        ORDER BY date_mouvement DESC, created_at DESC 
        LIMIT 1
    ), 0.00),
    updated_at = NOW()
    WHERE id = p_compte_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create the trigger function to be called after transaction changes
CREATE OR REPLACE FUNCTION trigger_recalculate_soldes_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger fires AFTER the transaction change and AFTER the create_mouvement_from_transaction trigger
    -- We allow it up to depth 2 to handle being called from other logic
    
    -- Recalculate for the affected accounts
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.compte_source_id IS NOT NULL THEN
            PERFORM recalculate_compte_balances(NEW.compte_source_id);
        END IF;
        IF NEW.compte_destination_id IS NOT NULL THEN
            PERFORM recalculate_compte_balances(NEW.compte_destination_id);
        END IF;
    END IF;

    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.compte_source_id IS NOT NULL THEN
            PERFORM recalculate_compte_balances(OLD.compte_source_id);
        END IF;
        IF OLD.compte_destination_id IS NOT NULL THEN
            PERFORM recalculate_compte_balances(OLD.compte_destination_id);
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Install the trigger on transactions table
-- We use a name that ensures it runs AFTER trigger_2_create_mouvement_after_transaction_insert
DROP TRIGGER IF EXISTS z_trigger_recalculate_after_transaction ON transactions;
CREATE TRIGGER z_trigger_recalculate_after_transaction
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_soldes_after_transaction();


-- 4. Initial pass to fix all accounts currently in an inconsistent state
DO $$
DECLARE
    v_compte RECORD;
BEGIN
    FOR v_compte IN SELECT id FROM comptes_financiers LOOP
        PERFORM recalculate_compte_balances(v_compte.id);
    END LOOP;
END $$;
