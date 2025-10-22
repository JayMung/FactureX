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
  const { user, loading, isAdmin } = useAuth();
  const { checkPermission } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Vérification du rôle admin
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions d'administrateur pour accéder à cette page.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Vérification du module requis
  if (requiredModule && !checkPermission(requiredModule as any, requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">
            Vous n'avez pas la permission de {requiredPermission} sur le module {requiredModule}.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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