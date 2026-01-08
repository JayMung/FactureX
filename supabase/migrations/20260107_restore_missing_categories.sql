-- Restore missing categories requested by user
-- These might have been lost or never inserted
-- Only insert if they don't exist (using conflict handling or check)

DO $$ 
BEGIN
    -- Insert 'Paiement Facture'
    IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Paiement Facture') THEN
        INSERT INTO finance_categories (nom, type, is_active)
        VALUES ('Paiement Facture', 'revenue', true);
    END IF;

    -- Insert 'Paiement Colis' (distinct from 'Retrait Colis' if needed, or alias?)
    -- User asked for "Paiement Colis", so we add it exactly.
    IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Paiement Colis') THEN
        INSERT INTO finance_categories (nom, type, is_active)
        VALUES ('Paiement Colis', 'revenue', true);
    END IF;

    -- Insert 'Paiement Commande'
    IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Paiement Commande') THEN
        INSERT INTO finance_categories (nom, type, is_active)
        VALUES ('Paiement Commande', 'revenue', true);
    END IF;
    
    -- Ensure 'Transfert Reçu' exists as well (seen in screenshot, but ensuring consistancy)
    IF NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Transfert Reçu') THEN
        INSERT INTO finance_categories (nom, type, is_active)
        VALUES ('Transfert Reçu', 'revenue', true);
    END IF;

END $$;
