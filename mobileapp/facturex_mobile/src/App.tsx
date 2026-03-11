import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Plus, 
  Bell, 
  Clock, 
  Check, 
  MoreHorizontal, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  ChevronRight,
  Wallet,
  Percent,
  Scan,
  UserPlus,
  FileText,
  BarChart3,
  Camera,
  Upload,
  Globe,
  Shield,
  CreditCard,
  ReceiptText,
  BadgeCheck,
  Menu,
  Trash2,
  Download,
  Share2,
  FileSearch,
  History,
  Lock,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as d3 from 'd3';

// --- Types ---

interface Client {
  id: string;
  name: string;
  initials: string;
  business: string;
  email: string;
  phone?: string;
  address?: string;
  color: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface ActivityItem {
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

// --- Mock Data ---

const RECENT_ACTIVITY: ActivityItem[] = [
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

const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Tech Solutions SARL', initials: 'TS', business: '$12,450', email: 'contact@techsol.com', color: 'bg-blue-100 text-blue-600' },
  { id: '2', name: 'Logistique Plus', initials: 'LP', business: '$8,200', email: 'billing@logplus.fr', color: 'bg-amber-100 text-amber-600' },
  { id: '3', name: 'Global Consult', initials: 'GC', business: '$24,000', email: 'admin@global.com', color: 'bg-purple-100 text-purple-600' },
  { id: '4', name: 'Alpha Corp', initials: 'AC', business: '$3,100', email: 'info@alphacorp.io', color: 'bg-emerald-100 text-emerald-600' },
  { id: '5', name: 'Design Studio', initials: 'DS', business: '$5,600', email: 'hello@design.st', color: 'bg-pink-100 text-pink-600' },
];

// --- Components ---

const StatusBadge = ({ status }: { status: ActivityItem['status'] }) => {
  const styles = {
    'Payé': 'bg-emerald-50 text-emerald-600',
    'En attente': 'bg-amber-50 text-amber-600',
    'Retard': 'bg-red-50 text-red-600',
    'Brouillon': 'bg-gray-100 text-gray-600'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
};

const HomePage = ({ onNavigate }: { onNavigate: (tab: string) => void }) => (
  <>
    {/* Greeting & Date */}
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-6"
    >
      <p className="text-sm text-slate-500 font-medium">Lundi, 24 Octobre</p>
      <h2 className="text-2xl font-bold text-slate-900 leading-tight mt-1">
        Bonjour, <span className="text-primary">Sarah</span>
      </h2>
    </motion.div>

    {/* KPI Section */}
    <div className="px-6 flex flex-col gap-4">
      {/* Main Revenue Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => onNavigate('reports')}
        className="relative overflow-hidden rounded-2xl bg-primary p-6 shadow-soft text-white group cursor-pointer active:scale-95 transition-transform"
      >
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 opacity-90">
              <Wallet size={18} />
              <span className="text-sm font-semibold">Revenu Total</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">+12.5%</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold tracking-tight">$12,500.00</span>
            <p className="text-xs opacity-70 mt-1">Recettes ce mois-ci</p>
          </div>
        </div>
      </motion.div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* TVA Card */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-4 shadow-card border border-slate-100 flex flex-col justify-between h-32"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Percent size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">TVA</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 block">$2,000</span>
            <span className="text-[10px] text-slate-400">Collectée</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full w-3/4"></div>
          </div>
        </motion.div>

        {/* Pending Card */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate('factures')}
          className="rounded-2xl bg-white p-4 shadow-card border border-slate-100 flex flex-col justify-between h-32 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 text-amber-500">
            <Clock size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">En Attente</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 block">$850</span>
            <span className="text-[10px] text-slate-400">3 factures</span>
          </div>
          <div className="flex -space-x-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">JL</div>
            <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">MK</div>
            <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">+1</div>
          </div>
        </motion.div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="px-6 pt-8 pb-4">
      <h3 className="text-base font-bold text-slate-900 mb-4">Actions Rapides</h3>
      <div className="flex justify-between gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { icon: Scan, label: 'Scanner', tab: 'scanner' },
          { icon: UserPlus, label: 'Client', tab: 'create-client' },
          { icon: FileText, label: 'Devis', tab: 'create-invoice' },
          { icon: BarChart3, label: 'Rapports', tab: 'reports' },
        ].map((action, i) => (
          <motion.button 
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => onNavigate(action.tab)}
            className="flex flex-col items-center gap-2 min-w-[70px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform">
              <action.icon size={24} />
            </div>
            <span className="text-xs font-medium text-slate-600">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>

    {/* Recent Activity List */}
    <div className="px-6 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Activité Récente</h3>
        <button 
          onClick={() => onNavigate('factures')}
          className="text-xs font-bold text-primary hover:text-primary-dark"
        >
          Tout voir
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {RECENT_ACTIVITY.map((item, i) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            onClick={() => onNavigate('factures')}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between group cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${item.color}`}>
                {item.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{item.client}</span>
                <span className="text-[10px] text-slate-500 font-medium">{item.type} {item.number} • {item.date}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">${item.amount.toLocaleString()}</span>
              <StatusBadge status={item.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </>
);

const InvoicesPage = ({ invoices, onNavigate, onSelectInvoice }: { invoices: ActivityItem[], onNavigate: (tab: string) => void, onSelectInvoice: (invoice: ActivityItem) => void }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Toutes');

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.client.toLowerCase().includes(search.toLowerCase()) || 
                         inv.number.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'Toutes' || 
                         (filter === 'Payées' && inv.status === 'Payé') ||
                         (filter === 'En attente' && inv.status === 'En attente') ||
                         (filter === 'Retard' && inv.status === 'Retard');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Factures</h2>
        <button 
          onClick={() => onNavigate('create-invoice')}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft active:scale-90 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Rechercher une facture..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
        {['Toutes', 'Payées', 'En attente', 'Retard'].map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 mt-2">
        {filteredInvoices.map((item, i) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectInvoice(item)}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${item.color}`}>
                {item.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{item.client}</span>
                <span className="text-[10px] text-slate-500 font-medium">{item.number} • {item.date}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">${item.amount.toLocaleString()}</span>
              <StatusBadge status={item.status} />
            </div>
          </motion.div>
        ))}
        {filteredInvoices.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">Aucune facture trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InvoiceDetailsPage = ({ invoice, onBack, onUpdateStatus }: { invoice: ActivityItem, onBack: () => void, onUpdateStatus: (id: string, status: ActivityItem['status']) => void }) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      alert('Facture envoyée avec succès !');
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900">{invoice.type === 'Facture' ? 'Détails Facture' : 'Détails Devis'}</h2>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {/* Invoice Card */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${invoice.color}`}>
                {invoice.initials}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{invoice.client}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{invoice.number}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Montant Total</p>
              <h4 className="text-2xl font-black text-primary">${invoice.amount.toLocaleString()}</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date d'émission</p>
              <p className="text-sm font-bold text-slate-700">{invoice.date}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Échéance</p>
              <p className="text-sm font-bold text-slate-700">Dans 15 jours</p>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Prestation de service</span>
              <span className="text-slate-900 font-bold">${invoice.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">TVA (20%)</span>
              <span className="text-slate-900 font-bold">$0.00</span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t border-slate-50">
              <span className="text-slate-900 font-black">Total</span>
              <span className="text-primary font-black">${invoice.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 space-y-3">
        {invoice.status !== 'Payé' && (
          <button 
            onClick={() => onUpdateStatus(invoice.id, invoice.type === 'Facture' ? 'Payé' : 'Payé')}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check size={20} />
            {invoice.type === 'Facture' ? 'Marquer comme payée' : 'Accepter le devis'}
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleSendEmail}
            disabled={isSending}
            className="py-4 bg-white border border-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
            ) : (
              <Mail size={18} />
            )}
            Envoyer
          </button>
          <button className="py-4 bg-white border border-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
            <FileText size={18} />
            PDF
          </button>
        </div>

        {invoice.type === 'Devis' && invoice.status === 'En attente' && (
          <button 
            onClick={() => onUpdateStatus(invoice.id, 'Retard')}
            className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Refuser le devis
          </button>
        )}
      </div>
    </div>
  );
};

const CreateInvoicePage = ({ clients, nextNumber, onBack, onSave }: { clients: Client[], nextNumber: string, onBack: () => void, onSave: (invoice: any) => void }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(nextNumber);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || items.some(item => !item.description)) return;

    setIsSubmitting(true);
    
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    // Simulate API call
    setTimeout(() => {
      onSave({
        client: client.name,
        initials: client.initials,
        color: client.color,
        number: invoiceNumber,
        amount: totalAmount,
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        dueDate: dueDate
      });
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Nouvelle Facture</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Number & Client Selection */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">N° Facture</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-2xl py-4 px-4 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Client</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                required
              >
                <option value="">Sélectionner</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date d'échéance</label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Articles</label>
            <button 
              type="button"
              onClick={addItem}
              className="text-primary text-xs font-bold flex items-center gap-1"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-card space-y-3 relative">
                {items.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Plus size={18} className="rotate-45" />
                  </button>
                )}
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full text-sm font-bold text-slate-900 focus:outline-none"
                  required
                />
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Qté</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full text-sm font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Prix</span>
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 space-y-1 text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                    <div className="text-sm font-bold text-primary">
                      ${(item.quantity * item.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total à payer</p>
              <h3 className="text-3xl font-black">${totalAmount.toLocaleString()}</h3>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={28} />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ClientsPage = ({ clients, onNavigate, onSelectClient }: { clients: Client[], onNavigate: (tab: string) => void, onSelectClient: (client: Client) => void }) => {
  const [search, setSearch] = useState('');
  
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
        <button 
          onClick={() => onNavigate('create-client')}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft active:scale-90 transition-transform"
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="relative mb-6">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Rechercher un client..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="flex flex-col gap-3">
        {filteredClients.map((client, i) => (
          <motion.div 
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectClient(client)}
            className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between group cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base ${client.color}`}>
                {client.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{client.name}</span>
                <span className="text-[10px] text-slate-500 font-medium">{client.email}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{client.business}</span>
              <span className="text-[10px] text-slate-400 font-medium">Volume d'affaires</span>
            </div>
          </motion.div>
        ))}
        {filteredClients.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">Aucun client trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientDetailsPage = ({ client, invoices, onBack, onUpdateClient }: { client: Client, invoices: ActivityItem[], onBack: () => void, onUpdateClient: (id: string, data: Partial<Client>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    email: client.email,
    phone: client.phone || '',
    address: client.address || ''
  });

  const clientInvoices = invoices.filter(inv => inv.client === client.name);
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = clientInvoices.filter(inv => inv.status === 'En attente' || inv.status === 'Retard').reduce((sum, inv) => sum + inv.amount, 0);

  const handleSave = () => {
    onUpdateClient(client.id, editedData);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900">Détails Client</h2>
      </div>

      {/* Client Profile Card */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl mb-4 shadow-lg ${client.color}`}>
            {client.initials}
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 mb-1">{client.name}</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">{client.email}</p>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-slate-50 rounded-3xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Facturé</span>
              <span className="text-lg font-black text-slate-900">${totalInvoiced.toLocaleString()}</span>
            </div>
            <div className="bg-amber-50 rounded-3xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">En Attente</span>
              <span className="text-lg font-black text-amber-600">${pendingAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informations de contact</h4>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
              isEditing 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isEditing ? 'Enregistrer' : 'Modifier'}
          </button>
        </div>
        
        <div className="bg-white rounded-[2rem] p-6 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
              {isEditing ? (
                <input 
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                  className="text-sm font-bold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              ) : (
                <span className="text-sm font-bold text-slate-900">{client.email}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Phone size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Téléphone</span>
              {isEditing ? (
                <input 
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => setEditedData({...editedData, phone: e.target.value})}
                  className="text-sm font-bold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              ) : (
                <span className="text-sm font-bold text-slate-900">{client.phone || 'Non renseigné'}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Adresse</span>
              {isEditing ? (
                <textarea 
                  value={editedData.address}
                  onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                  rows={2}
                  className="text-sm font-bold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              ) : (
                <span className="text-sm font-bold text-slate-900 leading-tight">{client.address || 'Non renseignée'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="px-6 py-4 flex-1">
        <div className="flex items-center justify-between mb-4 ml-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historique des factures</h4>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {clientInvoices.length} Factures
          </span>
        </div>
        
        <div className="space-y-3 pb-8">
          {clientInvoices.length > 0 ? (
            clientInvoices.map((inv, i) => (
              <motion.div 
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{inv.number}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{inv.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-900">${inv.amount.toLocaleString()}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Aucune facture pour ce client</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateClientPage = ({ onBack, onSave }: { onBack: () => void, onSave: (client: Omit<Client, 'id' | 'business' | 'initials' | 'color'>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onSave(formData);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Nouveau Client</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nom du client / Entreprise</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              required
              placeholder="Ex: Tech Solutions SARL"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Adresse Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="email" 
              required
              placeholder="Ex: contact@entreprise.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Téléphone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="tel" 
              placeholder="Ex: +33 6 12 34 56 78"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Address Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Adresse</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
            <textarea 
              placeholder="Ex: 123 Rue de la Paix, Paris"
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.email}
          className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-2xl shadow-fab flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check size={20} />
              <span>Enregistrer le client</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const SettingsPage = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const sections = [
    { 
      title: 'Entreprise', 
      items: [
        { label: 'Informations société', icon: Building2, target: 'settings-company' },
        { label: 'Logo & Branding', icon: Camera, target: 'reglages' },
        { label: 'TVA & Taxes', icon: Percent, target: 'reglages' }
      ] 
    },
    { 
      title: 'Compte', 
      items: [
        { label: 'Profil', icon: Users, target: 'reglages' },
        { label: 'Abonnement', icon: CreditCard, target: 'reglages' },
        { label: 'Méthodes de paiement', icon: Wallet, target: 'reglages' }
      ] 
    },
    { 
      title: 'Sécurité', 
      items: [
        { label: 'Mot de passe', icon: Lock, target: 'reglages' },
        { label: 'Double authentification', icon: Shield, target: 'reglages' }
      ] 
    },
    { 
      title: 'Support', 
      items: [
        { label: 'Centre d\'aide', icon: HelpCircle, target: 'reglages' },
        { label: 'À propos', icon: Globe, target: 'reglages' }
      ] 
    },
  ];

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Réglages</h2>
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 mb-8 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xl">
          SA
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Sarah Anderson</h3>
          <p className="text-sm text-slate-500">sarah.a@facturex.com</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
            Plan Premium
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((section, i) => (
          <div key={i} className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{section.title}</h4>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {section.items.map((item, j) => (
                <button 
                  key={j}
                  onClick={() => onNavigate(item.target)}
                  className={`w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${j !== section.items.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
        
        <button className="w-full py-4 mt-4 flex items-center justify-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 transition-all">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

const CompanySettingsPage = ({ onBack }: { onBack: () => void }) => {
  const [formData, setFormData] = useState({
    name: 'Sarah Anderson Design',
    siret: '123 456 789 00012',
    vat: 'FR 12 345678901',
    address: '123 Rue de la Paix, 75002 Paris',
    email: 'contact@sarahdesign.com',
    phone: '+33 6 12 34 56 78'
  });

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Société</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nom de l'entreprise</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SIRET</label>
              <input 
                type="text"
                value={formData.siret}
                onChange={(e) => setFormData({...formData, siret: e.target.value})}
                className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">N° TVA</label>
              <input 
                type="text"
                value={formData.vat}
                onChange={(e) => setFormData({...formData, vat: e.target.value})}
                className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adresse</label>
            <textarea 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows={2}
              className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email de contact</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Téléphone</label>
            <input 
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <button className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
};

const ReportsPage = ({ invoices, onBack }: { invoices: ActivityItem[], onBack: () => void }) => {
  const data = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Fév', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Avr', revenue: 2780 },
    { name: 'Mai', revenue: 1890 },
    { name: 'Juin', revenue: 2390 },
    { name: 'Juil', revenue: 3490 },
  ];

  const pieData = [
    { name: 'Payé', value: invoices.filter(i => i.status === 'Payé').length, color: '#10b981' },
    { name: 'Attente', value: invoices.filter(i => i.status === 'En attente').length, color: '#3b82f6' },
    { name: 'Retard', value: invoices.filter(i => i.status === 'Retard').length, color: '#ef4444' },
  ];

  const totalRevenue = invoices.filter(i => i.status === 'Payé').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="px-6 py-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Rapports</h2>
      </div>

      <div className="space-y-6">
        {/* Revenue Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Chiffre d'affaires total</p>
          <h3 className="text-4xl font-black mb-6">${totalRevenue.toLocaleString()}</h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <h4 className="text-sm font-bold text-slate-900 mb-6">Répartition des factures</h4>
          <div className="flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-slate-500">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
          <h4 className="text-sm font-bold text-slate-900 mb-6">Top Clients</h4>
          <div className="space-y-4">
            {[
              { name: 'Tech Solutions', amount: 12450, growth: '+12%' },
              { name: 'Logistique Plus', amount: 8900, growth: '+5%' },
              { name: 'Design Studio', amount: 4200, growth: '-2%' },
            ].map((client, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <Users size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{client.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">${client.amount.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold ${client.growth.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {client.growth}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ScannerPage = ({ onBack }: { onBack: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        merchant: 'Amazon France',
        date: '10 Mars 2026',
        amount: 45.99,
        category: 'Fournitures'
      });
    }, 2500);
  };

  return (
    <div className="px-6 py-6 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Scanner</h2>
      </div>

      {!scanResult ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-64 h-64 border-2 border-dashed border-primary/30 rounded-[3rem] flex items-center justify-center overflow-hidden">
              {isScanning ? (
                <motion.div 
                  animate={{ y: [-100, 100, -100] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
                />
              ) : (
                <Camera size={48} className="text-slate-200" />
              )}
              <div className="absolute inset-0 bg-slate-50/50" />
            </div>
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Numérisez vos reçus</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">L'IA extrait automatiquement les données de vos documents.</p>
          </div>

          <div className="flex flex-col w-full gap-4">
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isScanning ? 'Analyse en cours...' : 'Prendre une photo'}
            </button>
            <button className="w-full py-4 bg-white border border-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Upload size={18} />
              Importer un fichier
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Document analysé !</h3>
            <p className="text-sm text-emerald-600">Les données ont été extraites avec succès.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Marchand</span>
              <span className="text-sm font-bold text-slate-900">{scanResult.merchant}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</span>
              <span className="text-sm font-bold text-slate-900">{scanResult.date}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Montant</span>
              <span className="text-sm font-bold text-primary">${scanResult.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catégorie</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">{scanResult.category}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setScanResult(null)}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl active:scale-95 transition-all"
            >
              Recommencer
            </button>
            <button className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
              Enregistrer la dépense
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('accueil');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [invoices, setInvoices] = useState<ActivityItem[]>(RECENT_ACTIVITY);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ActivityItem | null>(null);

  const handleAddInvoice = (newInvoiceData: any) => {
    const newInvoice: ActivityItem = {
      id: Math.random().toString(36).substr(2, 9),
      client: newInvoiceData.client,
      initials: newInvoiceData.initials,
      type: 'Facture',
      number: newInvoiceData.number,
      date: newInvoiceData.date,
      amount: newInvoiceData.amount,
      status: 'En attente',
      color: newInvoiceData.color
    };

    setInvoices([newInvoice, ...invoices]);
    setActiveTab('factures');
  };

  const handleAddClient = (newClientData: Omit<Client, 'id' | 'business' | 'initials' | 'color'>) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-amber-100 text-amber-600',
      'bg-purple-100 text-purple-600',
      'bg-emerald-100 text-emerald-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600'
    ];
    
    const initials = newClientData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newClient: Client = {
      ...newClientData,
      id: Math.random().toString(36).substr(2, 9),
      business: '$0',
      initials,
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    setClients([newClient, ...clients]);
    setActiveTab('clients');
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setActiveTab('client-details');
  };

  const handleSelectInvoice = (invoice: ActivityItem) => {
    setSelectedInvoice(invoice);
    setActiveTab('invoice-details');
  };

  const handleUpdateClient = (id: string, updatedData: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));
    if (selectedClient?.id === id) {
      setSelectedClient(prev => prev ? { ...prev, ...updatedData } : null);
    }
  };

  const handleUpdateInvoiceStatus = (id: string, status: ActivityItem['status']) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(prev => prev ? { ...prev, status } : null);
    }
  };

  const renderContent = () => {
    const nextInvoiceNumber = `#${(invoices.filter(inv => inv.type === 'Facture').length + 1).toString().padStart(3, '0')}`;

    switch (activeTab) {
      case 'accueil': return <HomePage onNavigate={setActiveTab} />;
      case 'factures': return <InvoicesPage invoices={invoices} onNavigate={setActiveTab} onSelectInvoice={handleSelectInvoice} />;
      case 'invoice-details': return selectedInvoice ? <InvoiceDetailsPage invoice={selectedInvoice} onBack={() => setActiveTab('factures')} onUpdateStatus={handleUpdateInvoiceStatus} /> : null;
      case 'create-invoice': return <CreateInvoicePage clients={clients} nextNumber={nextInvoiceNumber} onBack={() => setActiveTab('factures')} onSave={handleAddInvoice} />;
      case 'clients': return <ClientsPage clients={clients} onNavigate={setActiveTab} onSelectClient={handleSelectClient} />;
      case 'client-details': return selectedClient ? <ClientDetailsPage client={selectedClient} invoices={invoices} onBack={() => setActiveTab('clients')} onUpdateClient={handleUpdateClient} /> : null;
      case 'reports': return <ReportsPage invoices={invoices} onBack={() => setActiveTab('accueil')} />;
      case 'scanner': return <ScannerPage onBack={() => setActiveTab('accueil')} />;
      case 'create-client': return <CreateClientPage onBack={() => setActiveTab('clients')} onSave={handleAddClient} />;
      case 'reglages': return <SettingsPage onNavigate={setActiveTab} />;
      case 'settings-company': return <CompanySettingsPage onBack={() => setActiveTab('reglages')} />;
      default: return <HomePage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-200 p-4 sm:p-8">
      {/* Mobile Simulator Container */}
      <div className="relative w-full max-w-[400px] h-[850px] bg-[#f5f8f7] shadow-2xl rounded-[3rem] overflow-hidden flex flex-col border-[8px] border-slate-900 ring-1 ring-slate-900/5">
        
        {/* Status Bar Simulator */}
        <div className="h-8 w-full flex justify-between items-center px-8 pt-2 z-20 absolute top-0 left-0 bg-transparent">
          <span className="text-xs font-bold text-slate-900">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-2 bg-slate-900 rounded-full"></div>
              <div className="w-0.5 h-2.5 bg-slate-900 rounded-full"></div>
              <div className="w-0.5 h-3 bg-slate-900 rounded-full"></div>
              <div className="w-0.5 h-1.5 bg-slate-300 rounded-full"></div>
            </div>
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-slate-900 rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BadgeCheck size={20} fill="currentColor" fillOpacity={0.2} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">FactureX</h1>
          </div>
          <button 
            onClick={() => setActiveTab('reglages')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f8f7] hover:bg-slate-100 transition-colors text-slate-900 active:scale-90"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Main Content (Scrollable) */}
        <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 bg-[#f5f8f7]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Action Button (FAB) */}
        <div className="absolute bottom-6 right-6 z-30">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="w-16 h-16 rounded-full bg-primary text-white shadow-fab flex items-center justify-center"
          >
            <Plus size={32} />
          </motion.button>
        </div>

        {/* New Item Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] z-50 p-8 pt-10"
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                <h3 className="text-xl font-bold text-slate-900 mb-6">Créer Nouveau</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: ReceiptText, label: 'Facture', color: 'bg-blue-50 text-blue-600' },
                      { icon: FileText, label: 'Devis', color: 'bg-purple-50 text-purple-600' },
                      { icon: Users, label: 'Client', color: 'bg-emerald-50 text-emerald-600' },
                      { icon: BarChart3, label: 'Rapport', color: 'bg-indigo-50 text-indigo-600' },
                    ].map((item) => (
                    <button 
                      key={item.label}
                      onClick={() => {
                        setIsModalOpen(false);
                        if (item.label === 'Client') setActiveTab('create-client');
                        else if (item.label === 'Facture') setActiveTab('create-invoice');
                        else if (item.label === 'Rapport') setActiveTab('reports');
                        else setActiveTab('factures');
                      }}
                      className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <item.icon size={24} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full mt-8 py-4 text-slate-500 font-bold text-sm bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Navigation Bar */}
        <div className="absolute bottom-0 left-0 w-full h-[70px] bg-white border-t border-slate-100 flex justify-around items-center px-6 pb-4 pt-2 z-20 rounded-b-[2.5rem]">
          {[
            { id: 'accueil', icon: LayoutDashboard, label: 'Accueil' },
            { id: 'factures', icon: ReceiptText, label: 'Factures' },
            { id: 'clients', icon: Users, label: 'Clients' },
            { id: 'reglages', icon: Settings, label: 'Réglages' },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === tab.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className={`text-[10px] ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full z-40"></div>
      </div>
    </div>
  );
}
