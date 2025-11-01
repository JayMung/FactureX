"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Settings,
  Package, 
  FileText,
  LogOut,
  Plane,
  Ship,
  Wallet,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

interface SidebarProps {
  isMobileOpen?: boolean;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPath 
}) => {
  const { user } = useAuth();
  const { getAccessibleModules } = usePermissions();
  const [colisMenuOpen, setColisMenuOpen] = useState(false);
  const [comptesMenuOpen, setComptesMenuOpen] = useState(false);

  // Obtenir les modules accessibles selon les permissions
  const accessibleModules = getAccessibleModules();

  // Menu items avec vérification des permissions
  const menuItems: Array<{
    icon: any;
    label: string;
    path: string;
    module: string | null;
    disabled?: boolean;
  }> = [
    { 
      icon: LayoutDashboard, 
      label: 'Tableau de bord', 
      path: '/',
      module: null // Toujours accessible
    },
    { 
      icon: Users, 
      label: 'Clients', 
      path: '/clients',
      module: 'clients'
    },
    { 
      icon: Receipt, 
      label: 'Transactions', 
      path: '/transactions',
      module: 'transactions'
    },
    { 
      icon: Wallet, 
      label: 'Comptes Financiers', 
      path: '/comptes',
      module: 'comptes'
    },
    { 
      icon: DollarSign, 
      label: 'Opérations Financières', 
      path: '/operations-financieres',
      module: 'transactions'
    },
    { 
      icon: Settings, 
      label: 'Paramètres', 
      path: '/settings',
      module: 'settings'
    },
    { 
      icon: FileText, 
      label: 'Factures', 
      path: '/factures',
      module: 'factures'
    },
  ];

  // Sous-menus pour Colis
  const colisSubMenuItems: Array<{
    icon: any;
    label: string;
    path: string;
    module: string;
    disabled?: boolean;
  }> = [
    {
      icon: Plane,
      label: 'Colis Aériens',
      path: '/colis/aeriens',
      module: 'colis'
    },
    {
      icon: Ship,
      label: 'Colis Maritimes',
      path: '/colis/maritimes',
      module: 'colis',
      disabled: true // Désactivé pour l'instant
    }
  ];

  // Sous-menus pour Comptes Financiers
  const comptesSubMenuItems: Array<{
    icon: any;
    label: string;
    path: string;
    module: string;
  }> = [
    {
      icon: Wallet,
      label: 'Vue d\'ensemble',
      path: '/comptes',
      module: 'comptes'
    },
    {
      icon: ArrowLeftRight,
      label: 'Mouvements',
      path: '/comptes/mouvements',
      module: 'comptes'
    }
  ];

  // Filtrer les items du menu selon les permissions
  const filteredMenuItems = menuItems.filter(item => {
    // Si l'item est désactivé, le masquer
    if (item.disabled) return false;
    
    // Si pas de module requis, toujours afficher
    if (!item.module) return true;
    
    // Vérifier si le module est accessible ou si l'utilisateur est admin
    return accessibleModules.some(module => module.id === item.module) || 
           (user?.app_metadata?.role === 'admin' || user?.app_metadata?.role === 'super_admin');
  });

  // Séparer Paramètres pour l'afficher en bas, et réordonner le menu principal
  const mainNavItems = filteredMenuItems
    .filter(item => item.label !== 'Paramètres')
    .sort((a, b) => {
      const order: Record<string, number> = {
        'Tableau de bord': 1,
        'Clients': 2,
        'Transactions': 3,
        'Opérations Financières': 4,
        'Comptes Financiers': 5,
        'Factures': 6,
      };
      return (order[a.label] ?? 99) - (order[b.label] ?? 99);
    });
  const settingsItem = filteredMenuItems.find(item => item.label === 'Paramètres');

  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    showSuccess('Déconnexion réussie');
  };


  return (
    <div className="bg-green-500 dark:bg-green-600 text-white flex flex-col h-full w-64 shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-green-600 dark:border-green-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-green-600 dark:text-green-700 font-bold">F</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">FactureX</h1>
            <p className="text-xs text-green-100 dark:text-green-200 truncate">Transferts simplifiés</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {mainNavItems.map((item) => {
            // Cas spécial pour Comptes Financiers : menu déroulant
            if (item.label === 'Comptes Financiers') {
              return (
                <li key={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg h-11 px-4",
                      (currentPath?.startsWith('/comptes')) && "bg-green-600 dark:bg-green-700"
                    )}
                    onClick={() => setComptesMenuOpen(!comptesMenuOpen)}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 truncate text-base font-medium flex-1 text-left">{item.label}</span>
                    {comptesMenuOpen ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                  </Button>

                  {/* Sous-menus Comptes */}
                  {comptesMenuOpen && (
                    <ul className="mt-2 ml-4 space-y-1">
                      {comptesSubMenuItems.map((subItem) => (
                        <li key={subItem.path}>
                          <Button
                            variant="ghost"
                            asChild
                            className={cn(
                              "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg h-10 px-3 text-sm",
                              currentPath === subItem.path && "bg-white dark:bg-white text-green-600 dark:text-green-600 shadow-md font-semibold hover:bg-white hover:text-green-600"
                            )}
                          >
                            <Link to={subItem.path}>
                              <subItem.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="ml-2 truncate">{subItem.label}</span>
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            // Autres items du menu
            return (
              <li key={item.path}>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 active:scale-95 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500 rounded-lg h-11 px-4",
                    currentPath === item.path && "bg-white dark:bg-white text-green-600 dark:text-green-600 shadow-lg font-semibold hover:bg-white hover:text-green-600"
                  )}
                >
                  <Link to={item.path}>
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3 truncate text-base font-medium">{item.label}</span>
                  </Link>
                </Button>
              </li>
            );
          })}

          {/* Menu Colis avec sous-menus */}
          <li>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg h-11 px-4",
                (currentPath?.startsWith('/colis')) && "bg-green-600 dark:bg-green-700"
              )}
              onClick={() => setColisMenuOpen(!colisMenuOpen)}
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3 truncate text-base font-medium flex-1 text-left">Colis</span>
              {colisMenuOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
            </Button>

            {/* Sous-menus Colis */}
            {colisMenuOpen && (
              <ul className="mt-2 ml-4 space-y-1">
                {colisSubMenuItems.filter(subItem => !subItem.disabled).map((subItem) => (
                  <li key={subItem.path}>
                    <Button
                      variant="ghost"
                      asChild
                      className={cn(
                        "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg h-10 px-3 text-sm",
                        currentPath === subItem.path && "bg-white dark:bg-white text-green-600 dark:text-green-600 shadow-md font-semibold hover:bg-white hover:text-green-600"
                      )}
                    >
                      <Link to={subItem.path}>
                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="ml-2 truncate">{subItem.label}</span>
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Paramètres placé en bas, au-dessus des infos utilisateur */}
      {settingsItem && (
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            asChild
            className={cn(
              "w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 active:scale-95 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500 rounded-lg h-11 px-4",
              currentPath === settingsItem.path && "bg-white dark:bg-white text-green-600 dark:text-green-600 shadow-lg font-semibold hover:bg-white hover:text-green-600"
            )}
          >
            <Link to={settingsItem.path}>
              <settingsItem.icon className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3 truncate text-base font-medium">{settingsItem.label}</span>
            </Link>
          </Button>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-t border-green-600 dark:border-green-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white dark:bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-green-600 dark:text-green-700 font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 text-left flex-1">
            <p className="text-white text-sm font-medium truncate">
              {user?.user_metadata?.first_name ? 
                `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}` : 
                user?.email || 'Utilisateur'
              }
            </p>
            <p className="text-xs text-green-100 dark:text-green-200 truncate">
              {user?.app_metadata?.role === 'super_admin' ? '👑 Super Admin' : 
               user?.app_metadata?.role === 'admin' ? '👑 Admin' : 'Opérateur'}
            </p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-green-600 dark:border-green-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-green-600 dark:hover:bg-green-700 hover:text-white transition-all duration-200 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500 rounded-md"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className="ml-3 truncate text-sm font-medium">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;