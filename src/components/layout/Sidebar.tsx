"use client";

import React, { useState, useEffect } from 'react';
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
  X,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  isMobileOpen?: boolean;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileOpen = false, 
  currentPath 
}) => {
  const { user, signOut } = useAuth();
  const { getAccessibleModules, loading, checkPermission } = usePermissions();
  const isMobile = useIsMobile();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Obtenir les modules accessibles selon les permissions
  const accessibleModules = getAccessibleModules();

  // Menu items avec vérification des permissions
  const menuItems = [
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
      icon: Settings, 
      label: 'Paramètres', 
      path: '/settings',
      module: 'settings'
    },
    { 
      icon: Package, 
      label: 'Colis', 
      path: '/packages', 
      module: null,
      disabled: true
    },
    { 
      icon: FileText, 
      label: 'Factures', 
      path: '/invoices', 
      module: null,
      disabled: true
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
           (user?.user_metadata?.role === 'admin');
  });

  // Gérer l'état de chargement initial
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100); // Petit délai pour s'assurer que tout est chargé
      return () => clearTimeout(timer);
    };
  }, [loading]);

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
  };

  // Fonction pour naviguer vers un module
  const handleNavigate = (path: string) => {
    if (currentPath !== path) {
      window.location.href = path;
    }
  };

  // Afficher l'état de chargement pendant le chargement initial
  if (isInitialLoad) {
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

        {/* Loading State */}
        <nav className={cn(
          "flex-1 p-4 transition-all duration-300",
          isMobile && "p-2"
        )}>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-200" />
            <p className="text-emerald-100 text-sm mt-2">Chargement des permissions...</p>
          </div>
        </nav>

        {/* User Info */}
        <div className={cn(
          "p-4 border-t border-emerald-700 transition-all duration-300",
          isMobile && "p-2"
        )}>
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-xs">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className={cn(
              "ml-3 text-right",
              isMobile && "hidden"
            )}>
              <p className="text-emerald-100 text-xs">
                {user?.email || 'Chargement...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <a href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-white hover:bg-emerald-700 hover:text-white transition-all duration-200",
                    currentPath === item.path && "bg-emerald-700 text-white",
                    isMobile && "px-3 justify-center"
                  )}
                  onClick={() => handleNavigate(item.path)}
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
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className={cn(
        "p-4 border-t border-emerald-700 transition-all duration-300",
        isMobile && "p-2"
      )}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className={cn(
            "ml-3 text-right",
            isMobile && "hidden"
          )}>
            <p className="text-emerald-100 text-xs">
              {user?.user_metadata?.first_name ? 
                `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}` : 
                user?.email || 'Utilisateur'
              }
            </p>
            <p className="text-xs text-emerald-200">
              {user?.user_metadata?.role === 'admin' ? 'Admin' : 'Opérateur'}
            </p>
          </div>
        </div>
      </div>

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