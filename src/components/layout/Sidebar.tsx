"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Settings,
  Package, 
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  isMobileOpen?: boolean;
  currentPath?: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Receipt, label: 'Transactions', path: '/transactions' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
  { icon: Package, label: 'Colis', path: '/packages', disabled: true },
  { icon: FileText, label: 'Factures', path: '/invoices', disabled: true },
];

const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileOpen = false, 
  currentPath 
}) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
  };

  return (
    <div className={cn(
      "bg-emerald-600 text-white flex flex-col transition-all duration-300 ease-in-out",
      isMobile ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "p-6 border-b border-emerald-700 transition-all duration-300",
        isMobile && "px-3"
      )}>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0",
            isMobile && "w-8 h-8"
          )}>
            <span className={cn(
              "text-emerald-600 font-bold",
              isMobile && "text-sm"
            )}>C</span>
          </div>
          <div className={cn(
            "min-w-0 flex-1",
            isMobile && "hidden"
          )}>
            <h1 className={cn(
              "text-xl font-bold truncate",
              isMobile && "text-sm"
            )}>CoxiPay</h1>
            <p className={cn(
              "text-xs text-emerald-100 truncate",
              isMobile && "hidden"
            )}>Transferts simplifiés</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 p-4 transition-all duration-300",
        isMobile && "p-2"
      )}>
        <ul className={cn(
          "space-y-2",
          isMobile && "space-y-1"
        )}>
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            
            return item.disabled ? (
              <li key={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-emerald-200 cursor-not-allowed opacity-50 transition-all duration-200",
                    isMobile && "px-3 justify-center"
                  )}
                  disabled
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-5 w-5")} />
                  {isMobile ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span className="ml-3 truncate">{item.label}</span>
                  )}
                </Button>
              </li>
            ) : (
              <li key={item.path}>
                <a href={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-white hover:bg-emerald-700 hover:text-white transition-all duration-200",
                      isActive && "bg-emerald-700 text-white",
                      isMobile && "px-3 justify-center"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-5 w-5")} />
                    {isMobile ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="ml-3 truncate">{item.label}</span>
                    )}
                  </Button>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className={cn(
        "p-4 border-t border-emerald-700 transition-all duration-300",
        isMobile && "p-2"
      )}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-emerald-700 hover:text-white transition-all duration-200",
            isMobile && "px-3 justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-5 w-5")} />
          {isMobile ? (
            <span className="sr-only">Déconnexion</span>
          ) : (
            <span className="ml-3 truncate">Déconnexion</span>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;