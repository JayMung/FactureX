"use client";

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { ModuleType } from '@/types';

interface PermissionGuardProps {
  module: ModuleType;
  permission: 'read' | 'create' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  permission,
  children,
  fallback = null
}) => {
  const { checkPermission } = usePermissions();

  const hasPermission = checkPermission(module, permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;