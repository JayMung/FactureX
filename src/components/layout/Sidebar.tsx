"use client";

import React, { useState, useEffect } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Users,
  Receipt,
  Settings,
  Package,
  FileText,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Menu,
  Box,
  Wallet,
  ArrowRightLeft,
  Bell,
  Shield,
  BarChart3,
  Ship,
  Plane,
  Tag,
  ChevronDown,
  ChevronRight
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
  const { getAccessibleModules, checkPermission, isAdmin } = usePermissions();
  const [colisMenuOpen, setColisMenuOpen] = useState(false);

  // Garder le menu Finances ouvert si on est sur une page de finances
  const isOnFinancesPage = currentPath?.startsWith('/finances') ||
    currentPath?.startsWith('/transactions') ||
    currentPath?.startsWith('/operations-financieres') ||
    currentPath?.startsWith('/comptes');
  const [financesMenuOpen, setFinancesMenuOpen] = useState(isOnFinancesPage);

  // Synchroniser l'état du menu Finances avec le currentPath
  useEffect(() => {
    if (isOnFinancesPage) {
      setFinancesMenuOpen(true);
    }
  }, [isOnFinancesPage]);

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
        path: '/colis/maritime',
        module: 'colis'
      }
    ];

  // Sous-menus pour Finances (simplifié après fusion)
  const financesSubMenuItems: Array<{
    icon: any;
    label: string;
    path: string;
    permission?: string;
  }> = [
      {
        icon: LayoutDashboard,
        label: 'Trésorerie',
        path: '/finances/dashboard',
      },
      {
        icon: Receipt,
        label: 'Transactions',
        path: '/transactions',
      },
      {
        icon: Wallet,
        label: 'Comptes & Mouvements',
        path: '/comptes',
      },
      {
        icon: Tag,
        label: 'Catégories',
        path: '/finances/categories',
      },
      {
        icon: BarChart3,
        label: 'Statistiques',
        path: '/finances/statistiques',
      },
      {
        icon: FileText,
        label: 'Rapports',
        path: '/rapports',
      },
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

  // Vérifier si l'utilisateur a accès au module finances
  const hasFinancesAccess = checkPermission('finances', 'read') || isAdmin;

  // Séparer Paramètres pour l'afficher en bas, et réordonner le menu principal
  const mainNavItems = filteredMenuItems
    .filter(item => item.label !== 'Paramètres')
    .sort((a, b) => {
      const order: Record<string, number> = {
        'Tableau de bord': 1,
        'Clients': 2,
        'Factures': 3,
      };
      return (order[a.label] ?? 99) - (order[b.label] ?? 99);
    });
  const settingsItem = filteredMenuItems.find(item => item.label === 'Paramètres');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess('Déconnexion réussie');
  };


  return (
    <div className="bg-sidebar text-sidebar-foreground flex flex-col h-full w-[260px] border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#21ac74' }}>
            <span className="text-white font-bold text-base">F</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">FactureX</h1>
            <p className="text-2xs text-muted-foreground">Transferts simplifiés</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  currentPath === item.path
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}

          {/* Menu Finances avec sous-menus */}
          {hasFinancesAccess && (
            <li>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isOnFinancesPage
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                onClick={() => setFinancesMenuOpen(!financesMenuOpen)}
              >
                <Wallet className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Finances</span>
                {financesMenuOpen ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                )}
              </button>

              {/* Sous-menus Finances */}
              {financesMenuOpen && (
                <ul className="mt-1 ml-3 pl-3 border-l-2 border-sidebar-border space-y-0.5">
                  {financesSubMenuItems.map((subItem) => {
                    // Vérifier les permissions pour chaque sous-menu
                    if (subItem.permission && !isAdmin) {
                      return null;
                    }
                    return (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            currentPath === subItem.path
                              ? "bg-sidebar-accent text-sidebar-primary font-medium"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <subItem.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{subItem.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

          {/* Menu Colis avec sous-menus */}
          <li>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                currentPath?.startsWith('/colis')
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              onClick={() => setColisMenuOpen(!colisMenuOpen)}
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left truncate">Colis</span>
              {colisMenuOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
              )}
            </button>

            {/* Sous-menus Colis */}
            {colisMenuOpen && (
              <ul className="mt-1 ml-3 pl-3 border-l-2 border-sidebar-border space-y-0.5">
                {colisSubMenuItems.filter(subItem => !subItem.disabled).map((subItem) => (
                  <li key={subItem.path}>
                    <Link
                      to={subItem.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        currentPath === subItem.path
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <subItem.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{subItem.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Paramètres placé en bas, au-dessus des infos utilisateur */}
      {settingsItem && (
        <div className="px-3 pb-2">
          <Link
            to={settingsItem.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              currentPath === settingsItem.path
                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <settingsItem.icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{settingsItem.label}</span>
          </Link>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#21ac74' }}>
            <span className="text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.first_name ?
                `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}` :
                user?.email || 'Utilisateur'
              }
            </p>
            <p className="text-2xs text-muted-foreground truncate">
              {user?.app_metadata?.role === 'super_admin' ? 'Super Admin' :
                user?.app_metadata?.role === 'admin' ? 'Admin' : 'Opérateur'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
