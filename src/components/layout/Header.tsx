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
  User
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

  // Fonction pour obtenir l'URL de l'avatar
  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || null;
  };

  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu button and title */}
          <div className="flex items-center">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications temps réel */}
            <NotificationCenter />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2"
                >
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Photo de profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || 'admin@coxipay.com'}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;