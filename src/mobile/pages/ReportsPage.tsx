import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ActivityItem } from '../types';

export const ReportsPage = ({ invoices, onBack }: { invoices: ActivityItem[], onBack: () => void }) => {
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
