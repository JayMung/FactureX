"use client";

import React, { useState } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleProfile = () => {
    setIsOpen(false);
    // TODO: Navigate to profile page
  };

  const handleSettings = () => {
    setIsOpen(false);
    // TODO: Navigate to settings page
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center space-x-2 hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role || 'Opérateur'}
              </p>
            </div>
            
            <button
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={handleProfile}
            >
              <User className="w-4 h-4" />
              <span>Profil</span>
            </button>
            
            <button
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              onClick={handleSettings}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
            
            <div className="border-t border-gray-100">
              <button
                className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileDropdown;