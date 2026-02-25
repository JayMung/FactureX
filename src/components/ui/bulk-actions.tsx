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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-card text-card-foreground border border-border shadow-2xl rounded-full px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <Badge variant="secondary" className="badge-info">
            {selectedCount}
          </Badge>
          <span className="small-text font-medium">
            client{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEmailSelected}
            className="text-muted-foreground hover:text-primary rounded-full h-8"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contacter
          </Button>

          {children}

          <Button
            variant="ghost"
            size="sm"
            onClick={onExportSelected}
            className="text-muted-foreground hover:text-success rounded-full h-8"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            className="text-muted-foreground hover:text-error hover:bg-red-500/10 rounded-full h-8"
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
        </div>

        <div className="pl-2 ml-2 border-l border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;