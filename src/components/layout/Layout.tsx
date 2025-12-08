"use client";

import { useState, useEffect, memo, useCallback } from 'react';
// @ts-ignore - Temporary workaround for react-router-dom types
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '@/components/auth/AuthProvider';
import SessionActivityTracker from '@/components/auth/SessionActivityTracker';
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Ouverte par défaut
  const [isDesktop, setIsDesktop] = useState(false);
  const { user } = useAuth(); // Utiliser le user depuis AuthProvider
  const location = useLocation();

  // Détecter si on est sur desktop
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      // Sur mobile, fermer la sidebar par défaut
      if (!desktop) {
        setSidebarOpen(false);
      }
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Listen for menu toggle events
  useEffect(() => {
    const handleMenuToggle = (e: Event) => {
      e.stopPropagation();
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggle-main-menu', handleMenuToggle, true);
    return () => window.removeEventListener('toggle-main-menu', handleMenuToggle, true);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

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
    <SessionActivityTracker>
      <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
        {/* Backdrop pour mobile avec animation */}
        <AnimatePresence>
          {sidebarOpen && !isDesktop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        
        {/* Sidebar avec animation fluide */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ x: isDesktop ? 0 : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isDesktop ? 0 : '-100%' }}
              transition={
                isDesktop 
                  ? { duration: 0.2, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 300, damping: 30 }
              }
              className={`${isDesktop ? 'relative' : 'fixed'} inset-y-0 left-0 z-50`}
            >
              <Sidebar 
                isMobileOpen={false} 
                currentPath={location.pathname}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header 
            title={getPageTitle()} 
            subtitle={getPageTitle() === 'Tableau de bord' ? "Vue d'ensemble de votre activité" : undefined}
            user={user}
            onMenuToggle={toggleMobileSidebar} 
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-bg-dark p-4 md:p-6 transition-opacity duration-200">
            {children}
          </main>
        </div>
        
        {/* Session timeout warning */}
        <SessionTimeoutWarning />
      </div>
    </SessionActivityTracker>
  );
};

export default Layout;