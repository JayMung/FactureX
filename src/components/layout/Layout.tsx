"use client";

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '@/components/auth/AuthProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Erreur lors de la récupération de l\'utilisateur');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          navigate('/login');
        } else {
          setUser(session.user);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Listen for menu toggle events
  useEffect(() => {
    const handleMenuToggle = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggle-main-menu', handleMenuToggle);
    return () => window.removeEventListener('toggle-main-menu', handleMenuToggle);
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

  // Afficher l'état de chargement ou d'erreur
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 border-t-emerald-400"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur de chargement</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;