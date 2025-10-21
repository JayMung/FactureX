// Base types
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Client types
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

export interface ClientFilters {
  search?: string;
  ville?: string;
}

export interface CreateClientData {
  nom: string;
  telephone: string;
  ville: string;
}

// Transaction types
export interface Transaction {
  id: string;
  client_id: string;
  montant: number;
  devise: string;
  motif: string;
  mode_paiement: string;
  statut: string;
  frais: number;
  benefice: number;
  montant_cny: number;
  taux_usd_cny: number;
  taux_usd_cdf: number;
  date_paiement?: string;
  valide_par?: string;
  date_validation?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  client?: Client;
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
  statut?: string;
  date_paiement?: string;
  valide_par?: string;
  date_validation?: string;
}

// Settings types
export interface Setting {
  id: string;
  categorie: string;
  cle: string;
  valeur: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface ExchangeRates {
  usdToCny: number;
  usdToCdf: number;
  lastUpdated: string;
}

export interface Fees {
  transfert: number;
  commande: number;
  partenaire: number;
}

// Payment Method types
export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  icon?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// User Profile types
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'operateur';
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
  user?: {
    email: string;
  };
}

// Activity Log types
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
  date: string;
  created_at: string;
  entity_type?: string;
  user?: {
    email: string;
  };
}