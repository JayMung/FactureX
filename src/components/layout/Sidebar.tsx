"use client";

import React, { useState, useEffect } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  collapsed = false,
  onToggleCollapse
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

  // Helper pour obtenir la classe de l'icône selon l'état
  const getIconClass = (isActive: boolean) => {
    const baseClass = collapsed ? "h-7 w-7" : "h-5 w-5";
    return `${baseClass} flex-shrink-0 transition-all duration-300 ${isActive ? 'text-[#21ac74]' : 'text-[#21ac74]/70 group-hover:text-[#21ac74]'}`;
  };

  return (
    <div className="bg-sidebar text-sidebar-foreground flex flex-col h-full w-full border-r border-sidebar-border overflow-hidden">
      {/* Logo */}
      <div className={`h-16 ${collapsed ? 'px-3' : 'px-5'} flex items-center border-b border-sidebar-border transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden flex-1`}>
          <motion.div 
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#21ac74]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-white font-bold text-base">F</span>
          </motion.div>
          {!collapsed && (
            <motion.div 
              className="min-w-0 flex-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-base font-semibold tracking-tight text-sidebar-foreground">FactureX</h1>
              <p className="text-2xs text-muted-foreground">Transferts simplifiés</p>
            </motion.div>
          )}
        </div>
        {/* Bouton collapse */}
        {onToggleCollapse && (
          <motion.button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-all duration-200 flex-shrink-0"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            title={collapsed ? "Développer" : "Réduire"}
          >
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground/60" />
          </motion.button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 overflow-y-auto overflow-x-hidden`}>
        <ul className="space-y-2">
          {mainNavItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "group flex items-center rounded-xl text-sm font-medium transition-all duration-300 relative",
                    collapsed 
                      ? "justify-center px-2 py-3" 
                      : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon className={getIconClass(isActive)} />
                  </motion.div>
                  {!collapsed && (
                    <motion.span 
                      className="truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {/* Tooltip pour mode collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}

          {/* Menu Finances */}
          {hasFinancesAccess && (
            <li>
              <button
                className={cn(
                  "group w-full flex items-center rounded-xl text-sm font-medium transition-all duration-300",
                  collapsed 
                    ? "justify-center px-2 py-3" 
                    : "gap-3 px-3 py-2.5",
                  isOnFinancesPage
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                onClick={() => !collapsed && setFinancesMenuOpen(!financesMenuOpen)}
                disabled={collapsed}
                title={collapsed ? "Finances" : undefined}
              >
                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
                  <Wallet className={getIconClass(isOnFinancesPage)} />
                </motion.div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">Finances</span>
                    {financesMenuOpen ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                    )}
                  </>
                )}
              </button>

              {/* Sous-menus Finances - cachés en mode collapsed */}
              {!collapsed && financesMenuOpen && (
                <motion.ul 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-1 ml-3 pl-3 border-l-2 border-sidebar-border space-y-0.5"
                >
                  {financesSubMenuItems.map((subItem) => {
                    if (subItem.permission && !isAdmin) {
                      return null;
                    }
                    const isSubActive = currentPath === subItem.path;
                    return (
                      <li key={subItem.path}>
                        <Link
                          to={subItem.path}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            isSubActive
                              ? "bg-sidebar-accent text-sidebar-primary font-medium"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <subItem.icon className="h-4 w-4 flex-shrink-0 text-[#21ac74]" />
                          <span className="truncate">{subItem.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </li>
          )}

          {/* Menu Colis */}
          <li>
            <button
              className={cn(
                "group w-full flex items-center rounded-xl text-sm font-medium transition-all duration-300",
                collapsed 
                  ? "justify-center px-2 py-3" 
                  : "gap-3 px-3 py-2.5",
                currentPath?.startsWith('/colis')
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              onClick={() => !collapsed && setColisMenuOpen(!colisMenuOpen)}
              disabled={collapsed}
              title={collapsed ? "Colis" : undefined}
            >
              <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
                <Package className={getIconClass(currentPath?.startsWith('/colis') || false)} />
              </motion.div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">Colis</span>
                  {colisMenuOpen ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                  )}
                </>
              )}
            </button>

            {/* Sous-menus Colis - cachés en mode collapsed */}
            {!collapsed && colisMenuOpen && (
              <motion.ul 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-1 ml-3 pl-3 border-l-2 border-sidebar-border space-y-0.5"
              >
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
                      <subItem.icon className="h-4 w-4 flex-shrink-0 text-[#21ac74]" />
                      <span className="truncate">{subItem.label}</span>
                    </Link>
                  </li>
                ))}
              </motion.ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Paramètres */}
      {settingsItem && (
        <div className={`${collapsed ? 'px-2' : 'px-3'} pb-2`}>
          <Link
            to={settingsItem.path}
            className={cn(
              "group flex items-center rounded-xl text-sm font-medium transition-all duration-300 relative",
              collapsed 
                ? "justify-center px-2 py-3" 
                : "gap-3 px-3 py-2.5",
              currentPath === settingsItem.path
                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
            title={collapsed ? settingsItem.label : undefined}
          >
            <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
              <settingsItem.icon className={getIconClass(currentPath === settingsItem.path)} />
            </motion.div>
            {!collapsed && (
              <motion.span 
                className="truncate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {settingsItem.label}
              </motion.span>
            )}
            {/* Tooltip pour mode collapsed */}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                {settingsItem.label}
              </div>
            )}
          </Link>
        </div>
      )}

      {/* User Info */}
      <div className={`p-4 border-t border-sidebar-border ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'space-x-3'} overflow-hidden`}>
          <motion.div 
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#21ac74]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </motion.div>
          {!collapsed && (
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
