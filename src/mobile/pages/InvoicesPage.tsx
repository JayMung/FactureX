import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Scan, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActivityItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency } from '@/utils/formatCurrency';

const PAGE_SIZE = 15;

export const InvoicesPage = ({ invoices, onNavigate, onSelectInvoice }: {
  invoices: ActivityItem[];
  onNavigate: (tab: string) => void;
  onSelectInvoice: (invoice: ActivityItem) => void;
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Toutes');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = inv.client.toLowerCase().includes(search.toLowerCase()) ||
        inv.number.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === 'Toutes' ||
        (filter === 'Payées' && inv.status === 'Payé') ||
        (filter === 'En attente' && inv.status === 'En attente') ||
        (filter === 'Retard' && inv.status === 'Retard') ||
        (filter === 'Brouillon' && inv.status === 'Brouillon');
      return matchSearch && matchFilter;
    });
  }, [invoices, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFilter = (f: string) => { setFilter(f); setPage(1); };

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Factures</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => onNavigate('create-invoice')}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft active:scale-90 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Rechercher par client ou numéro..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar mb-2">
        {['Toutes', 'Payées', 'En attente', 'Retard', 'Brouillon'].map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
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
        <AnimatePresence mode="popLayout">
          {paginated.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.03 }}
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
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-slate-900">${item.amount.toLocaleString()}</span>
                <StatusBadge status={item.status} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">Aucune facture trouvée</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc: (number | 'dot')[], p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dot');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === 'dot' ? (
                  <span key={`dot-${i}`} className="text-slate-400 text-xs px-1">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      p === safePage
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
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
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Page {safePage} / {totalPages} — {filtered.length} factures
        </p>
      )}
    </div>
  );
};
