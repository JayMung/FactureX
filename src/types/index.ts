export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'operateur';
  avatar_url?: string;
  updated_at: string;
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

export interface Transaction {
  id: string;
  client_id: string;
  date_paiement: string;
  montant: number;
  devise: 'USD' | 'CDF';
  motif: 'Commande' | 'Transfert';
  frais: number;
  taux_usd_cny: number;
  taux_usd_cdf: number;
  benefice: number;
  montant_cny: number;
  mode_paiement: string;
  statut: 'En attente' | 'Servi' | 'Remboursé' | 'Annulé';
  valide_par?: string;
  date_validation?: string;
  created_at: string;
  updated_at: string;
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
  dateFrom?: string;
  dateTo?: string;
  modePaiement?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ClientFilters {
  search?: string;
  ville?: string;
  telephone?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
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
  ville: string;
}

export interface CreateTransactionData {
  client_id: string;
  montant: number;
  devise: 'USD' | 'CDF';
  motif: 'Commande' | 'Transfert';
  mode_paiement: string;
}

export interface UpdateTransactionData {
  statut?: 'En attente' | 'Servi' | 'Remboursé' | 'Annulé';
  valide_par?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ChartData {
  month: string;
  USD: number;
  CDF: number;
  CNY: number;
}

export interface MotifData {
  name: string;
  value: number;
  count: number;
}

export interface StatusData {
  name: string;
  value: number;
}