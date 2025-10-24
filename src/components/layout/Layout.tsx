"use client";

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '@/components/auth/AuthProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth(); // Utiliser le user depuis AuthProvider
  const location = useLocation();

  // Listen for menu toggle events
  useEffect(() => {
    const handleMenuToggle = (e: Event) => {
      e.stopPropagation();
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggle-main-menu', handleMenuToggle, true);
    return () => window.removeEventListener('toggle-main-menu', handleMenuToggle, true);
  }, []);

  const toggleMobileSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Get page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Tableau de bord';
    if (path === '/clients') return 'Clients';
    if (path === '/transactions') return 'Transactions';
    if (path === '/settings') return 'Paramètres';
    return 'Tableau de bord';
  };

  return (
    <div className="h-screen flex bg-gray-100 flex">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        currentPath={location.pathname}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getPageTitle()} 
          subtitle={getPageTitle() === 'Tableau de bord' ? "Vue d'ensemble de votre activité" : undefined}
          user={user}
          onMenuToggle={toggleMobileSidebar} 
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 transition-opacity duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;