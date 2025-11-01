"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  RefreshCw,
  User,
  Key,
  Database
} from 'lucide-react';
import { 
  diagnoseCurrentUser, 
  fixCurrentUserPermissions,
  type PermissionDiagnostic as PermissionDiagnosticType
} from '@/utils/permission-diagnostic';

export const PermissionDiagnostic: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<PermissionDiagnosticType | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await diagnoseCurrentUser();
      setDiagnostic(result);
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const fixPermissions = async () => {
    setFixing(true);
    setError(null);
    
    try {
      const result = await fixCurrentUserPermissions();
      
      if (result.success) {
        // Re-run diagnostic after fixing
        setTimeout(() => {
          runDiagnostic();
        }, 1000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fix permissions');
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getStatusColor = (isAdmin: boolean) => {
    return isAdmin ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusIcon = (isAdmin: boolean) => {
    return isAdmin ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 animate-spin" />
            Diagnostic des Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Analyse des permissions en cours...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostic) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Erreur de Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error || 'Impossible de diagnostiquer les permissions'}
            </AlertDescription>
          </Alert>
          <Button onClick={runDiagnostic} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            État des Permissions - {diagnostic.email}
          </CardTitle>
          <CardDescription>
            Diagnostic complet des permissions d'accès administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Admin Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getStatusColor(diagnostic.isAdmin)}`}>
                {getStatusIcon(diagnostic.isAdmin)}
              </div>
              <div>
                <div className="font-medium">Statut Administrateur</div>
                <div className="text-sm text-gray-600">
                  {diagnostic.isAdmin ? 'Accès administrateur confirmé' : 'Accès administrateur refusé'}
                </div>
              </div>
            </div>
            <Badge variant={diagnostic.isAdmin ? 'default' : 'destructive'}>
              {diagnostic.isAdmin ? 'ADMIN' : 'NON-ADMIN'}
            </Badge>
          </div>

          {/* Permission Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Rôle Admin</div>
                <div className="text-xs text-gray-600">
                  {diagnostic.hasAdminRole ? 'Configuré' : 'Manquant'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Key className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Métadonnées</div>
                <div className="text-xs text-gray-600">
                  {diagnostic.hasAppMetadataRole ? 'Présentes' : 'Manquantes'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <User className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Permissions</div>
                <div className="text-xs text-gray-600">
                  {diagnostic.permissionCount}/8 modules
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          {diagnostic.issues.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-medium mb-2">Problèmes détectés:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {diagnostic.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {diagnostic.recommendations.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Settings className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-medium mb-2">Recommandations:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {diagnostic.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={runDiagnostic} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            
            {!diagnostic.isAdmin && (
              <Button 
                onClick={fixPermissions}
                disabled={fixing}
                className="bg-green-600 hover:bg-green-700"
              >
                {fixing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Correction en cours...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Corriger les Permissions
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails Techniques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div>ID Utilisateur: {diagnostic.userId}</div>
            <div>Email: {diagnostic.email}</div>
            <div>Rôle Admin: {diagnostic.hasAdminRole ? '✅' : '❌'}</div>
            <div>Métadonnées: {diagnostic.hasAppMetadataRole ? '✅' : '❌'}</div>
            <div>Modules: {diagnostic.permissionCount}/8</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionDiagnostic;
