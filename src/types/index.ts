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

export interface ClientFilters {
  search?: string;
  ville?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
  message?: string;
}

export interface Client {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  total_paye: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateClientData {
  nom: string;
  telephone: string;
  ville: string;
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
  benefice: number;
  montant_cny: number;
  mode_paiement: string;
  statut: string;
  valide_par?: string;
  date_validation?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  client?: Client;
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
  statut?: string;
  valide_par?: string;
  date_validation?: string;
  mode_paiement?: string;
  motif?: string;
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
  user_id: string;
  full_name: string;
  role: 'admin' | 'operateur';
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
  };
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
  date: string;
  user?: {
    email: string;
  };
  entity_type?: string;
  created_at?: string;
}