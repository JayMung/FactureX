DO $$
DECLARE
    target_account_id UUID := 'c5969d86-6035-432c-9b2a-a385be6f7d65'; -- Alipay
    current_bal NUMERIC;
    rec RECORD;
    running_bal NUMERIC;
    prev_bal NUMERIC;
BEGIN
    SELECT solde_actuel INTO current_bal 
    FROM comptes_financiers 
    WHERE id = target_account_id;

    running_bal := current_bal;

    -- Iterate backwards through movements (newest first)
    FOR rec IN 
        SELECT id, montant, type_mouvement 
        FROM mouvements_comptes 
        WHERE compte_id = target_account_id 
        ORDER BY date_mouvement DESC, created_at DESC
    LOOP
        -- Calculate what the balance WAS before this transaction
        prev_bal := running_bal;
        
        IF rec.type_mouvement = 'credit' THEN
            -- We added money. So before was (current - amount)
            prev_bal := running_bal - rec.montant;
        ELSIF rec.type_mouvement = 'debit' THEN
            -- We removed money. So before was (current + amount)
            prev_bal := running_bal + rec.montant;
        END IF;

        -- Update both at once to satisfy any consistency constraints
        UPDATE mouvements_comptes
        SET solde_apres = running_bal,
            solde_avant = prev_bal
        WHERE id = rec.id;
        
        -- Move the "running balance" pointer back in time
        running_bal := prev_bal;
        
    END LOOP;
END $$;
