import React from 'react';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Copy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { Transaction } from '@/types';

interface ActionMenuProps {
  transaction: Transaction;
  onView: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDuplicate: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  transaction,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  canUpdate,
  canDelete
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all duration-200"
        >
          <MoreHorizontal className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95">
        <DropdownMenuItem 
          onClick={() => onView(transaction)}
          className="cursor-pointer"
        >
          <Eye className="h-4 w-4 mr-2 text-blue-600" />
          Voir les détails
        </DropdownMenuItem>
        
        {canUpdate && (
          <DropdownMenuItem 
            onClick={() => onEdit(transaction)}
            className="cursor-pointer"
          >
            <Edit className="h-4 w-4 mr-2 text-green-600" />
            Modifier
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          onClick={() => onDuplicate(transaction)}
          className="cursor-pointer"
        >
          <Copy className="h-4 w-4 mr-2 text-purple-600" />
          Dupliquer
        </DropdownMenuItem>
        
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(transaction)}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
