"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  UserCheck,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UserProfile, UserPermissionsMap } from '@/types';
import { useUserPermissions } from '@/hooks/usePermissions';
import { MODULES_INFO, PREDEFINED_ROLES } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

interface PermissionsManagerProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { permissions, loading, updatePermission, applyRole } = useUserPermissions(user.id);
  const [isSaving, setIsSaving] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('modules');

  const handlePermissionChange = async (
    moduleId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    value: boolean
  ) => {
    try {
      await updatePermission(moduleId as any, {
        ...permissions[moduleId],
        [`can_${action}`]: value
      });
      showSuccess('Permission mise à jour avec succès');
    } catch (error: any) {
      console.error('Error updating permission:', error);
      showError(error.message || 'Erreur lors de la mise à jour de la permission');
    }
  };

  const handleRoleApply = async (roleName: string, event?: React.MouseEvent) => {
    // Empêcher la propagation de l'événement
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Empêcher les clics multiples
    if (isSaving || savingRole) return;
    
    setIsSaving(true);
    setSavingRole(roleName);
    
    try {
      await applyRole(roleName);
      showSuccess(`Rôle ${roleName} appliqué avec succès`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error applying role:', error);
      showError(error.message || 'Erreur lors de l\'application du rôle');
    } finally {
      setIsSaving(false);
      setSavingRole(null);
    }
  };

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users className="h-4 w-4" />;
      case 'Receipt': return <Shield className="h-4 w-4" />;
      case 'Settings': return <Settings className="h-4 w-4" />;
      case 'CreditCard': return <Shield className="h-4 w-4" />;
      case 'FileText': return <BookOpen className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getCurrentRole = () => {
    for (const role of PREDEFINED_ROLES) {
      let matches = true;
      for (const [moduleId, modulePerms] of Object.entries(role.permissions)) {
        const userModulePerms = permissions[moduleId];
        if (!userModulePerms || 
            userModulePerms.can_read !== modulePerms.can_read ||
            userModulePerms.can_create !== modulePerms.can_create ||
            userModulePerms.can_update !== modulePerms.can_update ||
            userModulePerms.can_delete !== modulePerms.can_delete) {
          matches = false;
          break;
        }
      }
      if (matches) return role.name;
    }
    return 'custom';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Gérer les permissions de {user.first_name} {user.last_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info utilisateur */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-gray-500">Rôle actuel : {user.role}</p>
              </div>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role === 'admin' ? (
                  <>
                    <Crown className="mr-1 h-3 w-3" />
                    Administrateur
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-1 h-3 w-3" />
                    Opérateur
                  </>
                )}
              </Badge>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="roles">Rôles prédéfinis</TabsTrigger>
            </TabsList>

            {/* Gestion par modules */}
            <TabsContent value="modules" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {MODULES_INFO.map((module) => {
                    const modulePerms = permissions[module.id] || {
                      can_read: false,
                      can_create: false,
                      can_update: false,
                      can_delete: false
                    };

                    return (
                      <Card key={module.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center space-x-2 text-base">
                            {getModuleIcon(module.icon)}
                            <span>{module.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {module.description}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${module.id}-read`}
                                checked={modulePerms.can_read}
                                onChange={(e) => handlePermissionChange(module.id, 'read', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`${module.id}-read`} className="text-sm">
                                <Eye className="h-3 w-3 inline mr-1" />
                                Lire
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${module.id}-create`}
                                checked={modulePerms.can_create}
                                onChange={(e) => handlePermissionChange(module.id, 'create', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`${module.id}-create`} className="text-sm">
                                <Plus className="h-3 w-3 inline mr-1" />
                                Créer
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${module.id}-update`}
                                checked={modulePerms.can_update}
                                onChange={(e) => handlePermissionChange(module.id, 'update', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`${module.id}-update`} className="text-sm">
                                <Edit className="h-3 w-3 inline mr-1" />
                                Modifier
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${module.id}-delete`}
                                checked={modulePerms.can_delete}
                                onChange={(e) => handlePermissionChange(module.id, 'delete', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`${module.id}-delete`} className="text-sm">
                                <Trash2 className="h-3 w-3 inline mr-1" />
                                Supprimer
                              </Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Gestion par rôles prédéfinis */}
            <TabsContent value="roles" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Les rôles prédéfinis appliquent un ensemble de permissions cohérentes. 
                  Le rôle actuel est : <strong>{getCurrentRole()}</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PREDEFINED_ROLES.map((role) => (
                  <Card key={role.name} className={getCurrentRole() === role.name ? 'border-green-500' : ''}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        {role.name === 'super_admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                        {role.name === 'admin' && <Crown className="h-4 w-4 text-orange-500" />}
                        {role.name === 'operateur' && <UserCheck className="h-4 w-4 text-blue-500" />}
                        <span>{role.name === 'super_admin' ? 'Super Administrateur' : 
                              role.name === 'admin' ? 'Administrateur' :
                              role.name === 'operateur' ? 'Opérateur' : role.name}</span>
                        {getCurrentRole() === role.name && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        {Object.entries(role.permissions).map(([moduleId, perms]) => {
                          const module = MODULES_INFO.find(m => m.id === moduleId);
                          if (!module) return null;
                          
                          return (
                            <div key={moduleId} className="flex items-center justify-between text-xs">
                              <span className="flex items-center space-x-1">
                                {getModuleIcon(module.icon)}
                                <span>{module.name}</span>
                              </span>
                              <div className="flex space-x-1">
                                {perms.can_read && <Eye className="h-3 w-3 text-green-500" />}
                                {perms.can_create && <Plus className="h-3 w-3 text-blue-500" />}
                                {perms.can_update && <Edit className="h-3 w-3 text-yellow-500" />}
                                {perms.can_delete && <Trash2 className="h-3 w-3 text-red-500" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        onClick={(e) => handleRoleApply(role.name, e)}
                        disabled={isSaving || getCurrentRole() === role.name}
                        className="w-full"
                        variant={getCurrentRole() === role.name ? 'outline' : 'default'}
                        type="button"
                      >
                        {savingRole === role.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Application...
                          </>
                        ) : getCurrentRole() === role.name ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Actif
                          </>
                        ) : (
                          'Appliquer ce rôle'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsManager;