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
import OfflinePrompt from './OfflinePrompt';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Détecter si on est sur desktop
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
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
      if (isDesktop) {
        // Sur desktop, toggle collapse au lieu de hide/show
        setSidebarCollapsed(prev => !prev);
      } else {
        setSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('toggle-main-menu', handleMenuToggle, true);
    return () => window.removeEventListener('toggle-main-menu', handleMenuToggle, true);
  }, [isDesktop]);

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
      <div className="h-screen flex bg-background">
        {/* Backdrop pour mobile */}
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
        {isDesktop ? (
          // Desktop: Sidebar toujours visible, peut être collapsed
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 80 : 260 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative inset-y-0 left-0 z-50 flex-shrink-0"
          >
            <Sidebar
              isMobileOpen={false}
              currentPath={location.pathname}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </motion.div>
        ) : (
          // Mobile: Sidebar slide-in
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-50"
              >
                <Sidebar
                  isMobileOpen={sidebarOpen}
                  currentPath={location.pathname}
                  collapsed={false}
                  onToggleCollapse={() => setSidebarOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header
            title={getPageTitle()}
            subtitle={getPageTitle() === 'Tableau de bord' ? "Vue d'ensemble de votre activité" : undefined}
            user={user}
            onMenuToggle={toggleMobileSidebar}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6 transition-opacity duration-200">
            {children}
          </main>
        </div>

        {/* Session timeout warning */}
        <SessionTimeoutWarning />

        {/* PWA / Offline notifications */}
        <OfflinePrompt />
      </div>
    </SessionActivityTracker>
  );
};

export default Layout;