import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  XCircle, 
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import type { Transaction } from '@/types';

interface StatusBadgeProps {
  status: string;
  transaction: Transaction;
  onStatusChange: (t: Transaction, status: string) => void;
  canUpdate: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  transaction,
  onStatusChange,
  canUpdate
}) => {
  const getStatusIcon = (s: string) => {
    switch (s) {
      case "Servi": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "En attente": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Remboursé": return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "Annulé": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Servi": return "bg-green-100 text-green-800";
      case "En attente": return "bg-yellow-100 text-yellow-800";
      case "Remboursé": return "bg-blue-100 text-blue-800";
      case "Annulé": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const BadgeContent = () => (
    <div className="flex items-center space-x-1">
      {getStatusIcon(status)}
      <Badge className={getStatusColor(status)}>
        {status}
      </Badge>
    </div>
  );

  if (!canUpdate) {
    return <BadgeContent />;
  }

  return (
    <div className="flex items-center gap-1.5">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          size="sm"
          className="h-8 flex items-center gap-2 hover:bg-gray-50"
        >
          <BadgeContent />
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onStatusChange(transaction, 'En attente')} className="cursor-pointer">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
            En attente
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange(transaction, 'Servi')} className="cursor-pointer">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Servi
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange(transaction, 'Remboursé')} className="cursor-pointer">
          <div className="flex items-center">
            <RotateCcw className="h-4 w-4 text-blue-600 mr-2" />
            Remboursé
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onStatusChange(transaction, 'Annulé')} className="cursor-pointer">
          <div className="flex items-center">
            <XCircle className="h-4 w-4 text-red-600 mr-2" />
            Annulé
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};
