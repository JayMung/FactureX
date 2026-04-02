import React from 'react';
import { LayoutDashboard, ReceiptText, ArrowRightLeft, Package, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const tabs = [
    { id: 'accueil', path: '/', icon: LayoutDashboard, label: 'Accueil' },
    { id: 'clients', path: '/clients', icon: Users, label: 'Clients' },
    { id: 'factures', path: '/factures', icon: ReceiptText, label: 'Factures' },
    { id: 'transactions', path: '/transactions', icon: ArrowRightLeft, label: 'Transac.' },
    { id: 'colis', path: '/colis/aeriens', icon: Package, label: 'Colis' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full h-[72px] bg-white border-t border-slate-100 flex justify-around items-center px-2 pb-safe pt-2 z-40 lg:hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
      {tabs.map((tab) => {
        // Active si on est sur la racine pour l'accueil, sinon on vérifie si le chemin commence par (et n'est pas /)
        const isActive = tab.path === '/' 
            ? currentPath === '/' 
            : currentPath.startsWith(tab.path);
            
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 transition-colors w-16 flex-1 py-1 ${
              isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5" />
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'} truncate w-full text-center leading-none`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
