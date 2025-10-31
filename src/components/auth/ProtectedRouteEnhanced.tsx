"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteEnhancedProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredModule?: string;
  requiredPermission?: 'read' | 'create' | 'update' | 'delete';
  fallbackPath?: string;
}

const ProtectedRouteEnhanced: React.FC<ProtectedRouteEnhancedProps> = ({ 
  children, 
  adminOnly = false,
  requiredModule,
  requiredPermission = 'read',
  fallbackPath = '/login'
}) => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { checkPermission, loading: permissionsLoading } = usePermissions();

  // Combiner les deux loading en un seul
  const isLoading = authLoading || permissionsLoading;

  // Fallback: Check metadata role if isAdmin is false
  const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
  const isUserAdmin = isAdmin || userRole === 'super_admin' || userRole === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 border-t-green-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Vérification du rôle admin avec fallback
  if (adminOnly && !isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions d'administrateur pour accéder à cette page.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Vérification du module requis (les admins ont tout accès)
  if (requiredModule && !isUserAdmin && !checkPermission(requiredModule as any, requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Vous n'avez pas la permission de {requiredPermission} sur le module {requiredModule}.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRouteEnhanced;