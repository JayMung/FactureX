import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Clock, Users, FileText, BarChart3, ReceiptText, ArrowRightLeft, Package } from 'lucide-react';
import { ActivityItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardWithPermissions } from '@/hooks/useDashboardWithPermissions';
import { formatCurrency } from '@/utils/formatCurrency';
import { supabase } from '@/integrations/supabase/client';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  recentActivity: ActivityItem[];
}

export const HomePage = ({ onNavigate, recentActivity }: HomePageProps) => {
  const { stats, isLoading } = useDashboardWithPermissions();
  const [userName, setUserName] = useState('');

  // Get real user name from Supabase session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) {
        const first = user.user_metadata?.first_name || '';
        const fullEmail = user.email || '';
        setUserName(first || fullEmail.split('@')[0] || 'Utilisateur');
      }
    });
  }, []);

  // Real current date
  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return (
  <>
    {/* Greeting & Date */}
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-6"
    >
      <p className="text-sm text-slate-500 font-medium">{dateStr}</p>
      <h2 className="text-2xl font-bold text-slate-900 leading-tight mt-1">
        Bonjour, <span className="text-primary">{userName || '...'}</span>
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
              <span className="text-sm font-semibold">Montant Facturé</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">USD</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold tracking-tight">
              {isLoading ? '...' : (stats?.facturesAmountUSD ? `$${stats.facturesAmountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00')}
            </span>
            <p className="text-xs opacity-70 mt-1">Ce mois-ci</p>
          </div>
        </div>
      </motion.div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Clients Card */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate('clients')}
          className="rounded-2xl bg-white p-4 shadow-card border border-slate-100 flex flex-col justify-between h-32 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 text-indigo-500">
            <Users size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clients</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 block">{isLoading ? '...' : (stats?.clientsCount || 0)}</span>
            <span className="text-[10px] text-slate-400">Total enregistrés</span>
          </div>
          <div className="flex -space-x-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-500">C</div>
            <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">+</div>
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
            <span className="text-xl font-bold text-slate-900 block">{isLoading ? '...' : (stats?.facturesEnAttente || 0)}</span>
            <span className="text-[10px] text-slate-400">Factures non payées</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full w-1/4"></div>
          </div>
        </motion.div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="px-6 pt-8 pb-4">
      <h3 className="text-base font-bold text-slate-900 mb-4">Actions Rapides</h3>
      <div className="flex justify-between gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { icon: ReceiptText, label: 'Facture', tab: 'create-invoice' },
          { icon: Wallet, label: 'Trésorerie', tab: 'finances' },
          { icon: ArrowRightLeft, label: 'Transfert', tab: 'transactions' },
          { icon: Package, label: 'Nouveau Colis', tab: 'colis' },
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
        {recentActivity.map((item, i) => (
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
};
