"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Square, 
  ChevronDown,
  Users,
  Trash2,
  Download,
  Mail,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AdvancedBulkActionsProps {
  selectedCount: number;
  selectedPages: number;
  totalPages: number;
  currentPageFullySelected: boolean;
  currentPagePartiallySelected: boolean;
  isAllSelected: boolean;
  isProcessing?: boolean;
  onClearSelection: () => void;
  onSelectCurrentPage: () => void;
  onSelectAllPages: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onEmailSelected: () => void;
}

const AdvancedBulkActions: React.FC<AdvancedBulkActionsProps> = ({
  selectedCount,
  selectedPages,
  totalPages,
  currentPageFullySelected,
  currentPagePartiallySelected,
  isAllSelected,
  isProcessing = false,
  onClearSelection,
  onSelectCurrentPage,
  onSelectAllPages,
  onDeleteSelected,
  onExportSelected,
  onEmailSelected
}) => {
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);

  const getSelectionText = () => {
    if (selectedCount === 0) return "Aucune sélection";
    if (isAllSelected) return `${selectedCount} éléments sélectionnés (tout)`;
    if (selectedPages === 1) return `${selectedCount} élément(s) sélectionné(s)`;
    return `${selectedCount} élément(s) sur ${selectedPages} page(s)`;
  };

  const getSelectionColor = () => {
    if (selectedCount === 0) return "text-gray-500";
    if (isAllSelected) return "text-green-500";
    return "text-blue-600";
  };

  return (
    <div className="space-y-4">
      {/* Barre de sélection principale */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-4">
          {/* Case à cocher principale */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectCurrentPage}
              className={cn(
                "p-1 rounded hover:bg-gray-200 transition-colors",
                currentPageFullySelected && "text-green-500",
                currentPagePartiallySelected && "text-blue-600"
              )}
              disabled={isProcessing}
            >
              {currentPageFullySelected ? (
                <CheckSquare className="h-5 w-5" />
              ) : currentPagePartiallySelected ? (
                <div className="h-5 w-5 relative">
                  <Square className="h-5 w-5" />
                  <div className="absolute inset-1 bg-blue-600 rounded-sm" />
                </div>
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            
            {/* Menu déroulant de sélection */}
            <DropdownMenu open={isSelectDropdownOpen} onOpenChange={setIsSelectDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-1"
                  disabled={isProcessing}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={onSelectCurrentPage}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {currentPageFullySelected ? 'Désélectionner cette page' : 'Sélectionner cette page'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSelectAllPages}>
                  <Users className="mr-2 h-4 w-4" />
                  {isAllSelected ? 'Désélectionner tout' : 'Sélectionner toutes les pages'}
                </DropdownMenuItem>
                {selectedCount > 0 && (
                  <DropdownMenuItem onClick={onClearSelection} className="text-red-600">
                    <Square className="mr-2 h-4 w-4" />
                    Tout désélectionner
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Texte de sélection */}
          <div>
            <p className={cn("text-sm font-medium", getSelectionColor())}>
              {getSelectionText()}
            </p>
            {selectedPages > 1 && (
              <p className="text-xs text-gray-500">
                Sélection répartie sur {selectedPages} page(s)
              </p>
            )}
          </div>
        </div>

        {/* Actions groupées */}
        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedCount} sélectionné(s)
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSelected}
              disabled={isProcessing}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onEmailSelected}
              disabled={isProcessing}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contacter
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteSelected}
              disabled={isProcessing}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Indicateur de progression si nécessaire */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-800">
            Traitement de {selectedCount} élément(s) en cours...
          </span>
        </div>
      )}

      {/* Informations supplémentaires */}
      {!isAllSelected && selectedCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-800">
            💡 Astuce : Utilisez le menu déroulant à côté de la case à cocher pour sélectionner tous les éléments de toutes les pages
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedBulkActions;