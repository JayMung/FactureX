export interface Client {
  id: string;
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  total_paye: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  client_id: string;
  montant: number;
  devise: 'USD' | 'CDF' | 'CNY';
  taux_usd_cny: number;
  taux_usd_cdf: number;
  montant_cny: number;
  frais: number;
  benefice: number;
  motif: 'Commande' | 'Transfert';
  mode_paiement: string;
  statut: 'En attente' | 'Servi' | 'Remboursé' | 'Annulé';
  date_paiement: string;
  date_validation?: string;
  valide_par?: string;
  created_at: string;
  updated_at: string;
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
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
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
    created_at: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionFilters {
  status?: string;
  currency?: string;
  clientId?: string;
  modePaiement?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ClientFilters {
  search?: string;
  ville?: string;
}

export interface DashboardStats {
  totalUSD: number;
  totalCDF: number;
  totalCNY: number;
  beneficeNet: number;
  transactionsCount: number;
  clientsCount: number;
  todayTransactions: number;
  monthlyRevenue: number;
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

export interface CreateClientData {
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
}

export interface CreateTransactionData {
  reference?: string;
  client_id: string;
  montant: number;
  devise: 'USD' | 'CDF' | 'CNY';
  motif: 'Commande' | 'Transfert';
  mode_paiement: string;
}

export interface UpdateTransactionData {
  statut?: 'En attente' | 'Servi' | 'Remboursé' | 'Annulé';
  mode_paiement?: string;
  valide_par?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at: string;
}