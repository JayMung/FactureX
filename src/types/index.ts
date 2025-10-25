// Basic types
export interface Client {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  total_paye?: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface Transaction {
  id: string;
  client_id: string;
  date_paiement: string;
  montant: number;
  devise: string;
  motif: string;
  frais: number;
  taux_usd_cny: number;
  taux_usd_cdf: number;
  montant_cny: number;
  benefice: number;
  mode_paiement: string;
  statut: string;
  valide_par?: string;
  date_validation?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  client?: Client;
}

export interface Setting {
  id: string;
  categorie: string;
  cle: string;
  valeur: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
  date: string;
  created_at?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  icon?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ClientFilters {
  search?: string;
  ville?: string;
}

export interface TransactionFilters {
  status?: string;
  currency?: string;
  clientId?: string;
  modePaiement?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface CreateClientData {
  nom: string;
  telephone: string;
  ville: string;
}

export interface CreateTransactionData {
  client_id: string;
  montant: number;
  devise: string;
  motif: string;
  mode_paiement: string;
  date_paiement?: string;
  statut?: string;
}

export interface UpdateTransactionData {
  client_id?: string;
  montant?: number;
  devise?: string;
  motif?: string;
  mode_paiement?: string;
  date_paiement?: string;
  statut?: string;
  valide_par?: string;
  date_validation?: string;
  taux_usd_cny?: number;
  taux_usd_cdf?: number;
  montant_cny?: number;
  frais?: number;
  benefice?: number;
}

export interface ExchangeRates {
  usdToCny: number;
  usdToCdf: number;
  lastUpdated?: string;
}

export interface Fees {
  transfert: number;
  commande: number;
  partenaire: number;
}

// Facture types
export interface Facture {
  id: string;
  facture_number: string;
  type: 'devis' | 'facture';
  statut: 'brouillon' | 'en_attente' | 'validee' | 'annulee';
  client_id: string;
  date_emission: string;
  date_validation?: string;
  valide_par?: string;
  mode_livraison: 'aerien' | 'maritime';
  devise: 'USD' | 'CDF';
  shipping_fee: number;
  subtotal: number;
  total_poids: number;
  frais_transport_douane: number;
  total_general: number;
  conditions_vente?: string;
  notes?: string;
  informations_bancaires?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  client?: Client;
  clients?: Client;
  items?: FactureItem[];
}

export interface FactureItem {
  id?: string;
  facture_id?: string;
  numero_ligne: number;
  image_url?: string;
  product_url?: string;
  quantite: number;
  description: string;
  prix_unitaire: number;
  poids: number;
  montant_total: number;
  created_at?: string;
  tempId?: string; // For temporary items before saving
}

export interface CreateFactureData {
  client_id: string;
  type: 'devis' | 'facture';
  mode_livraison: 'aerien' | 'maritime';
  devise: 'USD' | 'CDF';
  date_emission: string;
  statut?: 'brouillon' | 'en_attente' | 'validee' | 'annulee';
  conditions_vente?: string;
  notes?: string;
  informations_bancaires?: string;
  items: Omit<FactureItem, 'id' | 'facture_id' | 'created_at'>[];
  created_by?: string;
}

export interface UpdateFactureData {
  client_id?: string;
  mode_livraison?: 'aerien' | 'maritime';
  devise?: 'USD' | 'CDF';
  date_emission?: string;
  statut?: 'brouillon' | 'en_attente' | 'validee' | 'annulee';
  conditions_vente?: string;
  notes?: string;
  informations_bancaires?: string;
  items?: Omit<FactureItem, 'id' | 'facture_id' | 'created_at'>[];
}

export interface FactureFilters {
  type?: 'devis' | 'facture';
  statut?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  modeLivraison?: 'aerien' | 'maritime';
}

// Permissions types
export interface UserPermission {
  id: string;
  user_id: string;
  module: ModuleType;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export type ModuleType = 'clients' | 'transactions' | 'settings' | 'payment_methods' | 'activity_logs' | 'factures' | 'exchange_rates' | 'transaction_fees';

export interface ModuleInfo {
  id: ModuleType;
  name: string;
  description: string;
  icon: string;
  adminOnly: boolean;
}

export interface UserPermissionsMap {
  [module: string]: {
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}

export interface PermissionRole {
  name: string;
  description: string;
  permissions: {
    [module: string]: {
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    };
  };
}

// Rôles prédéfinis
export const PREDEFINED_ROLES: PermissionRole[] = [
  {
    name: 'admin',
    description: 'Administrateur - Accès complet à tout',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: true },
      transactions: { can_read: true, can_create: true, can_update: true, can_delete: true },
      settings: { can_read: true, can_create: true, can_update: true, can_delete: true },
      payment_methods: { can_read: true, can_create: true, can_update: true, can_delete: true },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false },
      factures: { can_read: true, can_create: true, can_update: true, can_delete: true },
      exchange_rates: { can_read: true, can_create: true, can_update: true, can_delete: true },
      transaction_fees: { can_read: true, can_create: true, can_update: true, can_delete: true }
    }
  },
  {
    name: 'operateur',
    description: 'Opérateur - Gestion quotidienne limitée',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: false },
      transactions: { can_read: true, can_create: true, can_update: true, can_delete: false },
      settings: { can_read: false, can_create: false, can_update: false, can_delete: false },
      payment_methods: { can_read: true, can_create: false, can_update: false, can_delete: false },
      activity_logs: { can_read: false, can_create: false, can_update: false, can_delete: false },
      factures: { can_read: true, can_create: true, can_update: true, can_delete: false },
      exchange_rates: { can_read: true, can_create: false, can_update: false, can_delete: false },
      transaction_fees: { can_read: true, can_create: false, can_update: false, can_delete: false }
    }
  },
  {
    name: 'lecteur',
    description: 'Lecteur - Accès en lecture seule',
    permissions: {
      clients: { can_read: true, can_create: false, can_update: false, can_delete: false },
      transactions: { can_read: true, can_create: false, can_update: false, can_delete: false },
      settings: { can_read: false, can_create: false, can_update: false, can_delete: false },
      payment_methods: { can_read: true, can_create: false, can_update: false, can_delete: false },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false },
      factures: { can_read: true, can_create: false, can_update: false, can_delete: false },
      exchange_rates: { can_read: true, can_create: false, can_update: false, can_delete: false },
      transaction_fees: { can_read: true, can_create: false, can_update: false, can_delete: false }
    }
  }
];

// Informations sur les modules
export const MODULES_INFO: ModuleInfo[] = [
  { id: 'clients', name: 'Clients', description: 'Gestion des clients', icon: 'Users', adminOnly: false },
  { id: 'transactions', name: 'Transactions', description: 'Gestion des transactions', icon: 'Receipt', adminOnly: false },
  { id: 'settings', name: 'Paramètres', description: 'Configuration système', icon: 'Settings', adminOnly: true },
  { id: 'payment_methods', name: 'Moyens de paiement', description: 'Modes de paiement', icon: 'CreditCard', adminOnly: true },
  { id: 'activity_logs', name: 'Logs d\'activité', description: 'Historique des actions', icon: 'FileText', adminOnly: true },
  { id: 'factures', name: 'Factures', description: 'Gestion des factures et devis', icon: 'FileText', adminOnly: false },
  { id: 'exchange_rates', name: 'Taux de change', description: 'Configuration des taux', icon: 'DollarSign', adminOnly: true },
  { id: 'transaction_fees', name: 'Frais de transaction', description: 'Configuration des frais', icon: 'Settings', adminOnly: true }
];