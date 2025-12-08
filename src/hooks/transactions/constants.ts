// Constantes pour les transactions

// Motifs commerciaux (transactions avec client)
export const COMMERCIAL_MOTIFS = [
  'Commande', 
  'Commande (Facture)', 
  'Transfert', 
  'Transfert Reçu', 
  'Paiement Colis'
];

// Mapping des nouveaux noms de catégories vers les anciens pour le calcul des frais
export const MOTIF_TO_FEE_KEY: Record<string, string> = {
  'commande': 'commande',
  'commande (facture)': 'commande',
  'transfert': 'transfert',
  'transfert reçu': 'transfert',
  'paiement colis': 'paiement colis'
};

// Taux par défaut
export const DEFAULT_RATES = {
  usdToCny: 7.25,
  usdToCdf: 2850
};

// Frais par défaut (en pourcentage)
export const DEFAULT_FEES = {
  transfert: 5,
  commande: 10,
  partenaire: 3
};
