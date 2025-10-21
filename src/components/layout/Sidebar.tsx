"use client";

import React from 'react';
import { 
  Home, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPath = '/dashboard',
  onNavigate,
  isMobile = false,
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  const menuItems = [
    { icon: Home, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Users, label: 'Clients', path: '/clients' },
    { icon: CreditCard, label: 'Transactions', path: '/transactions' },
    { icon: BarChart3, label: 'Rapports', path: '/reports' },
    { icon: Settings, label: 'Paramètres', path: '/settings' },
  ];

  const currentPathToUse = location.pathname || currentPath;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'relative bg-white shadow-lg h-screen'
        }
        ${!isMobile && isCollapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isMobile && !isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900">CoxiPay</h1>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          {!isMobile && onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPathToUse === item.path || 
                             (currentPathToUse.startsWith(item.path) && item.path !== '/dashboard');
              
              return (
                <li key={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={`w-full justify-start ${
                      isActive 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className="h-5 w-5" />
                    {(!isMobile && !isCollapsed) && (
                      <span className="ml-3">{item.label}</span>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;