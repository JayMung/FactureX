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