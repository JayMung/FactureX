"use client";

import React from 'react';
import { Bell, Search, User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button - only show if onToggleMobileSidebar is provided */}
        {onToggleMobileSidebar && isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={onToggleMobileSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Welcome Message */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">Tableau de bord</h2>
          <p className="text-sm text-gray-500 hidden sm:block">
            Bienvenue sur CoxiPay - Gérez vos transferts USD/CDF en toute simplicité
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Search - hide on mobile */}
          {!isMobile && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                className="pl-10 w-64"
              />
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              3
            </Badge>
          </Button>

          {/* User */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@coxipay.com'}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;