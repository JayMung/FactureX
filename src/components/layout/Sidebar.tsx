"use client";

import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
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

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Receipt, label: 'Transactions', path: '/transactions' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
  { icon: Package, label: 'Colis', path: '/packages', disabled: true },
  { icon: FileText, label: 'Factures', path: '/invoices', disabled: true },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onToggleMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed = false, 
  onToggleCollapse,
  isMobileOpen = false,
  onToggleMobile
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={cn(
        "p-6 border-b border-emerald-700 transition-all duration-300",
        isCollapsed && !isMobile && "px-3"
      )}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-bold text-lg">C</span>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold truncate">CoxiPay</h1>
              <p className="text-xs text-emerald-100 truncate">Transferts simplifiés</p>
            </div>
          )}
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
                    className={cn(
                      "w-full justify-start text-emerald-200 cursor-not-allowed opacity-50",
                      isCollapsed && !isMobile && "px-3 justify-center"
                    )}
                    disabled
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && (
                      <span className="ml-3 truncate">{item.label}</span>
                    )}
                  </Button>
                ) : (
                  <Link to={item.path}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-white hover:bg-emerald-700 hover:text-white transition-all duration-200",
                        isActive && "bg-emerald-700 text-white",
                        isCollapsed && !isMobile && "px-3 justify-center"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {(!isCollapsed || isMobile) && (
                        <span className="ml-3 truncate">{item.label}</span>
                      )}
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
          className={cn(
            "w-full justify-start text-white hover:bg-emerald-700 hover:text-white transition-all duration-200",
            isCollapsed && !isMobile && "px-3 justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(!isCollapsed || isMobile) && (
            <span className="ml-3 truncate">Déconnexion</span>
          )}
        </Button>
      </div>
    </>
  );

  // Mobile sidebar overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white shadow-lg hover:bg-gray-50 md:hidden"
          onClick={onToggleMobile}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={onToggleMobile}
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-emerald-600 text-white flex flex-col shadow-2xl">
              <SidebarContent />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className={cn(
      "bg-emerald-600 text-white flex flex-col transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent />
      
      {/* Collapse toggle button */}
      <div className="p-4 border-t border-emerald-700">
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-white hover:bg-emerald-700 hover:text-white"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;