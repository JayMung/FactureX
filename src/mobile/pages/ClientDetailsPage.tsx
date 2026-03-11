import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Edit2 } from 'lucide-react';
import { Client, ActivityItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const ClientDetailsPage = ({ client, invoices, onBack, onUpdateClient }: { client: Client, invoices: ActivityItem[], onBack: () => void, onUpdateClient: (id: string, data: Partial<Client>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    email: client.email,
    phone: client.phone || '',
    address: client.address || ''
  });

  const clientInvoices = invoices.filter(inv => inv.client === client.name);
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const handleSave = () => {
    onUpdateClient(client.id, editedData);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-primary active:scale-90 transition-transform"
        >
          {isEditing ? <Check size={20} /> : <Edit2 size={18} />}
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-6 py-4 flex flex-col items-center">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center font-black text-4xl shadow-lg shadow-black/5 mb-6 relative ${client.color}`}>
          {client.initials}
          <div className="absolute inset-0 rounded-full border border-white/40"></div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1 text-center">{client.name}</h2>
        
        {isEditing ? (
          <div className="w-full mt-6 space-y-4">
            <input 
              value={editedData.email}
              onChange={e => setEditedData({...editedData, email: e.target.value})}
              className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center"
              placeholder="Email"
            />
            <input 
              value={editedData.phone}
              onChange={e => setEditedData({...editedData, phone: e.target.value})}
              className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center"
              placeholder="Téléphone"
            />
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-500 mb-2">{client.email}</p>
            {client.phone && <p className="text-sm font-medium text-slate-500">{client.phone}</p>}
          </>
        )}
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-6 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Facturé</p>
          <p className="text-xl font-black text-slate-900">${totalInvoiced.toLocaleString()}</p>
        </div>
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <p className="text-[10px] font-bold text-primary opacity-80 uppercase tracking-widest mb-1">Restant Dû</p>
          <p className="text-xl font-black text-primary">$0</p>
        </div>
      </div>

      {/* Invoices History */}
      <div className="px-6 pt-2 pb-6 flex-1">
        <h3 className="text-base font-bold text-slate-900 mb-4">Historique des Factures</h3>
        <div className="flex flex-col gap-3">
          {clientInvoices.length > 0 ? (
            clientInvoices.map((item, i) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{item.number}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{item.date}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-slate-900">${item.amount.toLocaleString()}</span>
                  <StatusBadge status={item.status} />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-400 text-sm">Aucune facture pour ce client</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
