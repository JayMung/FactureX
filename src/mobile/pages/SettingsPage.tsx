import React, { useEffect, useState } from 'react';
import { Building2, Percent, Users, Wallet, Lock, Shield, Bell, ChevronRight, LogOut, FileText, LayoutList, Webhook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

interface SettingsPageProps {
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
}

export const SettingsPage = ({ onNavigate, onLogout }: SettingsPageProps) => {
  const [userEmail, setUserEmail] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userInitials, setUserInitials] = useState('?');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) {
        const email = user.email || '';
        const first = user.user_metadata?.first_name || '';
        const last = user.user_metadata?.last_name || '';
        const fullName = `${first} ${last}`.trim();
        setUserEmail(email);
        setUserFirstName(fullName || email.split('@')[0]);
        const initials = fullName
          ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
          : email.substring(0, 2).toUpperCase();
        setUserInitials(initials);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Déconnexion réussie');
    // The auth listener in MobileApp will detect session = null and show login
    if (onLogout) onLogout();
  };
  const sections = [
    { 
      title: 'Facturation & Finances', 
      items: [
        { label: 'Paramètres Factures', icon: FileText, target: 'settings-facture' },
        { label: 'Comptes Bancaires', icon: Wallet, target: 'comptes' },
        { label: 'Catégories', icon: LayoutList, target: 'categories' }
      ] 
    },
    { 
      title: 'Sécurité & Accès', 
      items: [
        { label: 'Rôles & Permissions', icon: Shield, target: 'permissions' },
        { label: 'Tableau de bord Sécurité', icon: Lock, target: 'security' },
        { label: 'Clés API & Webhooks', icon: Webhook, target: 'api' }
      ] 
    },
    { 
      title: 'Préférences', 
      items: [
        { label: 'Informations Entreprise', icon: Building2, target: 'settings-company' },
        { label: 'Notifications', icon: Bell, target: 'notifications' }
      ] 
    }
  ];

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Réglages</h2>
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 mb-8 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white" style={{ background: 'linear-gradient(135deg, #21ac74 0%, #178a5c 100%)' }}>
          {userInitials}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{userFirstName || 'Utilisateur'}</h3>
          <p className="text-sm text-slate-500">{userEmail}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
            FactureX
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
        
        <button onClick={handleLogout} className="w-full py-4 mt-4 flex items-center justify-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 transition-all">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
};
