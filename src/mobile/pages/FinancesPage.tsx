import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { useFactures } from '@/hooks/useFactures';
import { useTransactions } from '@/hooks/useTransactions';

export const FinancesPage = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const { comptes } = useComptesFinanciers();
  const { factures } = useFactures(1, undefined, { pageSize: 100 });
  const { globalTotals } = useTransactions(1, undefined, 'date_paiement', 'desc');

  // Compute total balance in USD (assuming base for simplicity or standardizing)
  const totalBalance = comptes.filter(c => c.is_active).reduce((sum, c) => sum + Number(c.solde_actuel), 0);
  
  // Unpaid factures
  const unpaidFactures = factures
    .filter(f => f.statut === 'validee' || f.statut === 'en_attente')
    .map(f => ({
      id: f.id,
      client: f.clients?.nom || 'Client Inconnu',
      amount: f.total_general,
      isLate: f.date_echeance ? new Date(f.date_echeance) < new Date() : false
    }))
    .slice(0, 5);

  const totalUnpaid = unpaidFactures.reduce((sum, f) => sum + f.amount, 0);

  const stats = {
    totalBalance: totalBalance,
    revenues: globalTotals.totalUSD,
    expenses: globalTotals.totalDepenses,
    unpaid: totalUnpaid
  };

  const activeComptes = comptes.filter(c => c.is_active).map(c => ({
    id: c.id,
    nom: c.nom,
    total: c.solde_actuel,
    type: c.type_compte
  }));

  return (
    <div className="px-6 py-6 h-full flex flex-col overflow-y-auto pb-24 hide-scrollbar">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => onNavigate('accueil')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trésorerie</h2>
          <p className="text-xs text-slate-500">Vue d'ensemble financière</p>
        </div>
      </div>

      {/* Main KPI */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(59,130,246,0.3)] mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Wallet size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Wallet size={16} />
            <span className="text-sm font-medium">Solde Total Actif</span>
          </div>
          <span className="text-4xl font-extrabold block mb-1">${stats.totalBalance.toLocaleString()}</span>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">+15% ce mois</span>
        </div>
      </motion.div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenus</span>
          </div>
          <span className="text-xl font-bold text-slate-900">${stats.revenues.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <TrendingDown size={16} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dépenses</span>
          </div>
          <span className="text-xl font-bold text-slate-900">${stats.expenses.toLocaleString()}</span>
        </div>
      </div>

      {/* Comptes */}
      <h3 className="text-base font-bold text-slate-900 mb-4">Mes Comptes</h3>
      <div className="space-y-3 mb-6">
        {activeComptes.map((compte, i) => (
          <motion.div 
            key={compte.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                compte.type === 'banque' ? 'bg-blue-50 text-blue-500' :
                compte.type === 'mobile_money' ? 'bg-emerald-50 text-emerald-500' :
                'bg-amber-50 text-amber-500'
              }`}>
                <Wallet size={18} />
              </div>
              <span className="font-bold text-slate-700">{compte.nom}</span>
            </div>
            <span className="font-bold text-slate-900">${compte.total.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>

      {/* Unpaid */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          À recouvrer
        </h3>
        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
          ${stats.unpaid.toLocaleString()}
        </span>
      </div>
      <div className="space-y-3">
        {unpaidFactures.map((facture) => (
          <div key={facture.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-sm">{facture.client}</span>
              {facture.isLate && <span className="text-[10px] text-red-500 font-bold mt-0.5">En retard</span>}
            </div>
            <span className={`font-bold ${facture.isLate ? 'text-red-600' : 'text-amber-600'}`}>
              ${facture.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
