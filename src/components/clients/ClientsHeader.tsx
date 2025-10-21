"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Upload, Download, Plus } from 'lucide-react';

interface ClientsHeaderProps {
  onDuplicateDetection: () => void;
  onImport: () => void;
  onExport: () => void;
  onAddClient: () => void;
  isExportDisabled?: boolean;
}

const ClientsHeader: React.FC<ClientsHeaderProps> = ({
  onDuplicateDetection,
  onImport,
  onExport,
  onAddClient,
  isExportDisabled = false
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestion des Clients</h2>
        <p className="text-gray-500">Gérez les informations de vos clients</p>
      </div>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={onDuplicateDetection}
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Doublons
        </Button>
        <Button 
          variant="outline" 
          onClick={onImport}
          className="border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Upload className="mr-2 h-4 w-4" />
          Importer
        </Button>
        <Button 
          variant="outline" 
          onClick={onExport}
          disabled={isExportDisabled}
        >
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onAddClient}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Client
        </Button>
      </div>
    </div>
  );
};

export default ClientsHeader;