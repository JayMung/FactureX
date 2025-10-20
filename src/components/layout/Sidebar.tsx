"use client";

import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Settings, 
  Package, 
  FileText,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { showSuccess } from '@/utils/toast';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Receipt, label: 'Transactions', path: '/transactions' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
  { icon: Package, label: 'Colis', path: '/packages', disabled: true },
  { icon: FileText, label: 'Factures', path: '/invoices', disabled: true },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-emerald-600 text-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-emerald-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">CoxiPay</h1>
            <p className="text-xs text-emerald-100">Transferts simplifiés</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                {item.disabled ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-emerald-200 cursor-not-allowed opacity-50"
                    disabled
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                ) : (
                  <Link to={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-white hover:bg-emerald-700 hover:text-white",
                        isActive && "bg-emerald-700 text-white"
                      )}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-emerald-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-emerald-700 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;