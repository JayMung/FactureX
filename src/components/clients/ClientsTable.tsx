"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHeader from '@/components/ui/sortable-header';
import { Eye, Edit, Trash2, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client, SortConfig } from '@/types';

interface ClientsTableProps {
  clients: Client[];
  isLoading: boolean;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onTogglePageSelection: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
  onViewClient: (client: Client) => void;
  isPageFullySelected: boolean;
  isPagePartiallySelected: boolean;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  isLoading,
  sortConfig,
  onSort,
  selectedIds,
  onToggleSelection,
  onTogglePageSelection,
  onEditClient,
  onDeleteClient,
  onViewClient,
  isPageFullySelected,
  isPagePartiallySelected
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateReadableId = (index: number) => {
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `CL${paddedNumber}`;
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-gray-700 w-12">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 w-20">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <Skeleton className="h-4 w-16" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, index) => (
              <tr key={index} className="border-b">
                <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                Aucun client trouvé
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-gray-700 w-12">
              <input
                type="checkbox"
                checked={isPageFullySelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPagePartiallySelected;
                }}
                onChange={onTogglePageSelection}
                className="rounded border-gray-300"
              />
            </th>
            <SortableHeader
              title="ID"
              sortKey="id"
              currentSort={sortConfig}
              onSort={onSort}
              className="w-20"
            />
            <SortableHeader
              title="Nom"
              sortKey="nom"
              currentSort={sortConfig}
              onSort={onSort}
            />
            <SortableHeader
              title="Téléphone"
              sortKey="telephone"
              currentSort={sortConfig}
              onSort={onSort}
            />
            <SortableHeader
              title="Ville"
              sortKey="ville"
              currentSort={sortConfig}
              onSort={onSort}
            />
            <SortableHeader
              title="Total Payé"
              sortKey="total_paye"
              currentSort={sortConfig}
              onSort={onSort}
            />
            <SortableHeader
              title="Date"
              sortKey="created_at"
              currentSort={sortConfig}
              onSort={onSort}
            />
            <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr 
              key={client.id} 
              className={cn(
                "border-b hover:bg-gray-50",
                selectedIds.has(client.id) && "bg-blue-50"
              )}
            >
              <td className="py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(client.id)}
                  onChange={() => onToggleSelection(client.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="py-3 px-4 font-medium">
                {generateReadableId(index)}
              </td>
              <td className="py-3 px-4 font-medium">{client.nom}</td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{client.telephone}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{client.ville}</span>
                </div>
              </td>
              <td className="py-3 px-4 font-medium text-emerald-600">
                {formatCurrency(client.total_paye || 0)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {new Date(client.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => onViewClient(client)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onEditClient(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-600"
                    onClick={() => onDeleteClient(client)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;