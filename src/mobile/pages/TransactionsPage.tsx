import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRightLeft, Search, Filter } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useTransactions } from '@/hooks/useTransactions';

export const TransactionsPage = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [search, setSearch] = useState('');

  // Fetch real data from Supabase, applying search filter
  const { transactions, loading } = useTransactions(1, { search }, 'date_paiement', 'desc');

  // Map and filter data
  const filteredData = transactions.filter(t => t.type_transaction === activeTab).map(trx => ({
    id: trx.id?.substring(0, 8) || 'TRX-XXX',
    type: trx.type_transaction,
    client: trx.client?.nom || 'Client Inconnu',
    category: trx.categorie || trx.motif || 'Divers',
    source: trx.compte_source?.nom || 'Source',
    dest: trx.compte_destination?.nom || 'Destination',
    amount: trx.montant,
    devise: trx.devise,
    status: trx.statut,
    date: trx.date_paiement ? new Date(trx.date_paiement).toLocaleDateString() : 'N/A'
  }));

  return (
    <div className="px-6 py-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('accueil')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Transactions</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        {[
          { id: 'revenue', label: 'Revenus' },
          { id: 'depense', label: 'Dépenses' },
          { id: 'transfert', label: 'Transferts' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <button className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-transform">
          <Filter size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20 hide-scrollbar space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((trx, i) => (
             <motion.div 
               key={trx.id + i}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between"
             >
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                   trx.type === 'revenue' ? 'bg-blue-50 text-blue-500' :
                   trx.type === 'depense' ? 'bg-red-50 text-red-500' :
                   'bg-emerald-50 text-emerald-500'
                 }`}>
                   <ArrowRightLeft size={18} />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">
                     {trx.type === 'revenue' ? trx.client : trx.type === 'depense' ? trx.category : `${trx.source} → ${trx.dest}`}
                   </span>
                   <span className="text-[10px] text-slate-500 font-medium">{trx.id} • {trx.date}</span>
                 </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                 <span className={`text-sm font-bold ${trx.type === 'depense' ? 'text-red-600' : 'text-slate-900'}`}>
                   {trx.type === 'revenue' ? '+' : (trx.type === 'depense' ? '-' : '')}{trx.amount.toLocaleString()} {trx.devise}
                 </span>
                 <StatusBadge status={trx.status} />
               </div>
             </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
            <ArrowRightLeft size={32} className="mb-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-500">Aucune transaction trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
};
