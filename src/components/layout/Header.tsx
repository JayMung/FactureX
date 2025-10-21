"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Menu, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePageInfo } from '@/contexts/PageContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { pageInfo } = usePageInfo();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    showSuccess('Déconnexion réussie');
    setIsProfileDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

        {/* Page Title */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{pageInfo.title}</h2>
          {pageInfo.subtitle && (
            <p className="text-sm text-gray-500 hidden sm:block truncate">
              {pageInfo.subtitle}
            </p>
          )}
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

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 md:space-x-3 p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@coxipay.com'}</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                isProfileDropdownOpen && "rotate-180"
              )} />
            </Button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@coxipay.com'}</p>
                </div>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-100 rounded-none"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <User className="h-4 w-4 mr-3" />
                  Mon Profil
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-100 rounded-none"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Paramètres
                </Button>
                
                <hr className="my-1" />
                
                <Button
                  variant="ghost"
                  className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-100 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Déconnexion
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;