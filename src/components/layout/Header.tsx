"use client";

import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileDropdown from '@/components/ProfileDropdown';

interface HeaderProps {
  title?: string;
  description?: string;
  onToggleMobileSidebar?: () => void;
  isMobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "Tableau de bord", 
  description = "Vue d'ensemble de votre activité",
  onToggleMobileSidebar,
  isMobile 
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button - only show if onToggleMobileSidebar is provided */}
        {onToggleMobileSidebar && isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileSidebar}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Title Section */}
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>

        {/* Profile Section */}
        <div className="flex items-center space-x-4">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;