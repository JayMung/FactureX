// Constantes pour les transactions

// Motifs commerciaux (transactions avec client)
// Note: Paiement Colis est exclu car il fait partie des Opérations Internes
// Seuls les nouveaux termes standardisés sont listés
export const COMMERCIAL_MOTIFS = [
  'Commande (Facture)',
  'Commande', // Legacy
  'Transfert (Argent)',
  'Transfert', // Legacy
  'Transfert Reçu'
];

// Mapping des nouveaux noms de catégories vers les anciens pour le calcul des frais
export const MOTIF_TO_FEE_KEY: Record<string, string> = {
  // Nouveaux termes standardisés
  'commande (facture)': 'commande',
  'transfert (argent)': 'transfert',
  'transfert reçu': 'transfert',
  'autres paiements': 'transfert',

  // Support legacy (pour les anciens enregistrements avant migration)
  'commande': 'commande',
  'transfert': 'transfert',
  'paiement colis': 'paiement colis'
};

// Taux par défaut (synchronisés avec la DB settings)
export const DEFAULT_RATES = {
  usdToCny: 6.95,
  usdToCdf: 2200
};

// Frais par défaut (en pourcentage, synchronisés avec la DB settings)
export const DEFAULT_FEES = {
  transfert: 5,
  commande: 15,
  partenaire: 3
};
