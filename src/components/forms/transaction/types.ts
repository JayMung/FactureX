import { Transaction } from "@/types";

export interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    transaction?: Transaction | undefined;
}

export interface FinanceCategory {
    id: string;
    nom: string;
    type: string;
    is_active: boolean;
    code?: string;
    created_at?: string;
}

export const DEFAULT_REVENUE_CATS = ['Commande', 'Paiement Facture', 'Paiement Colis', 'Transfert', 'Transfert Reçu', 'Vente', 'Autre'];
export const DEFAULT_DEPENSE_CATS = ['Paiement Fournisseur', 'Paiement Shipping', 'Loyer', 'Salaires', 'Frais Installation', 'Achat Biens', 'Transport', 'Maintenance', 'Carburant', 'Autre'];
