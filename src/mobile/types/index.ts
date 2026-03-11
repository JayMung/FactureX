export interface Client {
  id: string;
  name: string;
  initials: string;
  business: string;
  email: string;
  phone?: string;
  address?: string;
  color: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface ActivityItem {
  id: string;
  client: string;
  initials: string;
  type: 'Facture' | 'Devis';
  number: string;
  date: string;
  amount: number;
  status: 'Payé' | 'En attente' | 'Retard' | 'Brouillon';
  color: string;
}
