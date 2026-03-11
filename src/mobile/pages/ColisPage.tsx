import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Search, Filter, Plane, Ship } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useColisList } from '@/hooks/useColisList';

export const ColisPage = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [activeTab, setActiveTab] = useState('aeriens');
  const [search, setSearch] = useState('');

  // Fetch real colis from Supabase
  const { data: allColis, isLoading } = useColisList();

  // Filter and map real data
  const filteredData = (allColis || [])
    .filter(c => c.type_livraison === (activeTab === 'aeriens' ? 'aerien' : 'maritime'))
    .filter(c => 
      !search || 
      c.tracking_chine?.toLowerCase().includes(search.toLowerCase()) ||
      c.numero_commande?.toLowerCase().includes(search.toLowerCase())
    )
    .map(c => ({
      id: c.tracking_chine || c.numero_commande || c.id.substring(0, 8),
      type: activeTab,
      client: c.client_id ? 'Client' : 'Inconnu', // Ideally joined with Clients
      weight: c.poids ? `${c.poids} kg` : '-',
      cbm: c.poids ? `${c.poids} CBM` : '-',
      status: c.statut,
      date: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'
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
          <h2 className="text-2xl font-bold text-slate-900">Gestion Colis</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        {[
          { id: 'aeriens', label: 'Aériens', icon: Plane },
          { id: 'maritimes', label: 'Maritimes', icon: Ship }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
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
            placeholder="Rechercher un colis..." 
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
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
          </div>
        ) : filteredData.length > 0 ? (
          filteredData.map((colis, i) => (
            <motion.div 
              key={colis.id + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  colis.type === 'aeriens' ? 'bg-sky-50 text-sky-500' : 'bg-indigo-50 text-indigo-500'
                }`}>
                  {colis.type === 'aeriens' ? <Plane size={18} /> : <Ship size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
                    {colis.client}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">#{colis.id} • {colis.date}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-slate-900">
                  {colis.type === 'aeriens' ? colis.weight : colis.cbm}
                </span>
                <StatusBadge status={colis.status} />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
            <Package size={32} className="mb-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-500">Aucun colis trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};
