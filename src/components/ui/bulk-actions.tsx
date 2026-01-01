"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Mail, X } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onEmailSelected: () => void;
  isDeleting?: boolean;
  children?: React.ReactNode;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onEmailSelected,
  isDeleting = false,
  children
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {selectedCount} client{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
          </Badge>
          <span className="text-sm text-blue-700">
            Actions groupées disponibles
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEmailSelected}
            className="border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contacter
          </Button>

          {children}

          <Button
            variant="outline"
            size="sm"
            onClick={onExportSelected}
            className="border-green-200 text-green-700 hover:bg-green-100"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteSelected}
            className="border-red-200 text-red-700 hover:bg-red-100"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;