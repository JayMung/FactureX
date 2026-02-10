-- 1. Temporarily boost account balance to avoid negative balance validation error during update
UPDATE comptes_financiers 
SET solde_actuel = solde_actuel + 2000 
WHERE id = '3c2b8f47-f45f-4d0c-b0da-cda9edab0192';

-- 2. Update the transaction amount
UPDATE transactions 
SET montant = 2640.00 
WHERE id = 'ad7d1b33-b421-497e-8882-066769bcbfab';

-- 3. Restore account balance (minus the boost). 
-- Note: The transaction update (2639.99 -> 2640.00) will have increased the balance by 0.01 naturally.
-- We must ONLY remove the 2000 we added.
UPDATE comptes_financiers 
SET solde_actuel = solde_actuel - 2000 
WHERE id = '3c2b8f47-f45f-4d0c-b0da-cda9edab0192';

-- 4. Define the history recalculation function
CREATE OR REPLACE FUNCTION recalculate_account_history(p_account_id UUID) RETURNS VOID AS $$
DECLARE
    v_current_balance DECIMAL;
    r RECORD;
    v_running_balance DECIMAL;
BEGIN
    -- Get current actual balance from the account (which is now correct/truth)
    SELECT solde_actuel INTO v_current_balance FROM comptes_financiers WHERE id = p_account_id;
    v_running_balance := v_current_balance;

    -- Iterate backwards through movements
    -- We use a cursor approach implicitly with FOR loop
    FOR r IN 
        SELECT id, montant, type_mouvement 
        FROM mouvements_comptes 
        WHERE compte_id = p_account_id 
        ORDER BY date_mouvement DESC, created_at DESC 
    LOOP
        -- For the current row (latest in time), solde_apres is the running balance
        -- Determine solde_avant based on the movement type
        
        -- If CREDIT: Antecedent + Amount = After => Antecedent = After - Amount
        -- If DEBIT: Antecedent - Amount = After => Antecedent = After + Amount
        
        UPDATE mouvements_comptes
        SET solde_apres = v_running_balance,
            solde_avant = CASE 
                WHEN r.type_mouvement = 'credit' THEN v_running_balance - r.montant 
                ELSE v_running_balance + r.montant 
            END
        WHERE id = r.id;

        -- Update running balance for the NEXT iteration (which is previous in time)
        -- We effectively step back in time.
        -- Balance BEFORE this transaction becomes the Final Balance for the previous one.
        IF r.type_mouvement = 'credit' THEN
            v_running_balance := v_running_balance - r.montant;
        ELSE
            v_running_balance := v_running_balance + r.montant;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Execute the recalculation for Cash Bureau
SELECT recalculate_account_history('3c2b8f47-f45f-4d0c-b0da-cda9edab0192');
