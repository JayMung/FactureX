import { ActivityItem, Client } from '../types';

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    client: 'Tech Solutions SARL',
    initials: 'TS',
    type: 'Facture',
    number: '#004',
    date: "Aujourd'hui",
    amount: 450.00,
    status: 'Payé',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: '2',
    client: 'Logistique Plus',
    initials: 'LP',
    type: 'Facture',
    number: '#005',
    date: 'Hier',
    amount: 1200.00,
    status: 'En attente',
    color: 'bg-amber-100 text-amber-600'
  },
  {
    id: '3',
    client: 'Global Consult',
    initials: 'GC',
    type: 'Facture',
    number: '#006',
    date: '20 Oct',
    amount: 3450.00,
    status: 'Retard',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: '4',
    client: 'Alpha Corp',
    initials: 'AC',
    type: 'Devis',
    number: '#021',
    date: '18 Oct',
    amount: 800.00,
    status: 'Brouillon',
    color: 'bg-gray-100 text-gray-600'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Tech Solutions SARL', initials: 'TS', business: '$12,450', email: 'contact@techsol.com', color: 'bg-blue-100 text-blue-600' },
  { id: '2', name: 'Logistique Plus', initials: 'LP', business: '$8,200', email: 'billing@logplus.fr', color: 'bg-amber-100 text-amber-600' },
  { id: '3', name: 'Global Consult', initials: 'GC', business: '$24,000', email: 'admin@global.com', color: 'bg-purple-100 text-purple-600' },
  { id: '4', name: 'Alpha Corp', initials: 'AC', business: '$3,100', email: 'info@alphacorp.io', color: 'bg-emerald-100 text-emerald-600' },
  { id: '5', name: 'Design Studio', initials: 'DS', business: '$5,600', email: 'hello@design.st', color: 'bg-pink-100 text-pink-600' },
];
