"use client";

import { useState, useEffect } from 'react';
import {
  Bell,
  Menu,
  X,
  Settings,
  LogOut,
  Home,
  Users,
  CreditCard,
  FileText,
  User,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import NotificationCenter from '@/components/activity/NotificationCenter';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle: () => void;
  user: any;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onMenuToggle,
  user
}) => {
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Fonction pour obtenir le nom d'affichage de l'utilisateur
  const getDisplayName = () => {
    // Priorité 1: full_name des métadonnées
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }

    // Priorité 2: first_name + last_name des métadonnées
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      const firstName = user.user_metadata.first_name || '';
      const lastName = user.user_metadata.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Utilisateur';
    }

    // Priorité 3: email (partie avant @)
    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'Utilisateur';
  };

  // Fonction pour obtenir les initiales
  const getInitials = () => {
    const name = getDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Fonction pour obtenir l'URL de l'avatar
  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || null;
  };

  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();
  const initials = getInitials();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left side - Menu button and title */}
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-shrink-0"
              aria-label="Basculer le menu"
              title="Afficher/Masquer le menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="ml-2 sm:ml-4 min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold leading-tight text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Notifications temps réel */}
            <NotificationCenter />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 sm:gap-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 h-auto"
                >
                  <div className="hidden lg:block text-left max-w-[140px]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email || 'admin@facturex.com'}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white dark:ring-gray-800">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Photo de profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-xs sm:text-sm">{initials}</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-1">
                {/* User info header */}
                <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Photo de profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:bg-emerald-50 dark:focus:bg-emerald-900/20 rounded-lg mx-1 px-3 py-2.5"
                  >
                    <Settings className="mr-3 h-4 w-4 text-gray-500" />
                    <span>Paramètres</span>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />

                <div className="py-1">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/20 rounded-lg mx-1 px-3 py-2.5"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;