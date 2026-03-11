import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Client } from '../types';

const PAGE_SIZE = 15;

export const ClientsPage = ({ clients, onNavigate, onSelectClient }: {
  clients: Client[];
  onNavigate: (tab: string) => void;
  onSelectClient: (client: Client) => void;
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.business || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase())
    ),
    [clients, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc: (number | 'dot')[], p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dot');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="px-6 py-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Clients</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''} sur {clients.length}
          </p>
        </div>
        <button
          onClick={() => onNavigate('create-client')}
          className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #21ac74, #178a5c)' }}
        >
          <UserPlus size={22} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input
          type="text"
          placeholder={`Rechercher un client...`}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-white border border-slate-100/80 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-medium placeholder:text-slate-300"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {paginated.map((client, i) => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelectClient(client)}
              className="p-4 rounded-3xl bg-white border border-slate-100/50 shadow-card flex items-center justify-between group cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 shadow-sm ${client.color}`}>
                  {client.initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-900">{client.name}</span>
                  <span className="text-[11px] text-slate-400 font-bold">{client.email || 'Pas d\'email'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{client.business}</span>
                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{client.address || client.phone || '—'}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold">Aucun client trouvé</p>
            <p className="text-slate-400 text-xs mt-1 font-medium">Réessayez avec un autre nom</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between bg-white rounded-[2rem] border border-slate-100/80 shadow-card px-3 py-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 disabled:opacity-20 active:scale-90 transition-all bg-slate-50 hover:bg-slate-100"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1.5">
              {pageNumbers.map((p, i) =>
                p === 'dot' ? (
                  <span key={`dot-${i}`} className="text-slate-300 font-black px-1">•</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                      p === safePage
                        ? 'bg-slate-900 text-white shadow-lg scale-110'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 disabled:opacity-20 active:scale-90 transition-all bg-slate-50 hover:bg-slate-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {safePage} sur {totalPages} — {filtered.length} résultats
          </p>
        </div>
      )}
    </div>
  );
};
