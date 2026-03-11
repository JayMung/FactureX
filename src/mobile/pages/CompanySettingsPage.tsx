import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export const CompanySettingsPage = ({ onBack }: { onBack: () => void }) => {
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
