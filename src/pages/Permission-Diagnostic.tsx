"use client";

import React from 'react';
import { PermissionDiagnostic } from '@/components/admin/PermissionDiagnostic';

const PermissionDiagnosticPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Diagnostic des Permissions
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Utilisez cet outil pour diagnostiquer et corriger les problèmes d'accès administrateur
        </p>
      </div>
      
      <PermissionDiagnostic />
    </div>
  );
};

export default PermissionDiagnosticPage;
