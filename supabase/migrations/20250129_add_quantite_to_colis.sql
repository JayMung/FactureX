-- Ajouter la colonne quantite à la table colis
ALTER TABLE colis
ADD COLUMN quantite INTEGER NOT NULL DEFAULT 1;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN colis.quantite IS 'Nombre de colis dans cette expédition';

-- Ajouter une contrainte pour s'assurer que la quantité est positive
ALTER TABLE colis
ADD CONSTRAINT colis_quantite_positive CHECK (quantite > 0);
