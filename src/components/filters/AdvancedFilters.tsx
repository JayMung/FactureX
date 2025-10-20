"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, X, Search } from 'lucide-react';
import type { TransactionFilters } from '@/types';

interface AdvancedFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onToggle
}) => {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const resetFilters = () => {
    const emptyFilters: TransactionFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onReset();
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== 'all' && value !== ''
    ).length;
  };

  const paymentMethods = [
    'Cash',
    'Airtel Money',
    'Orange Money',
    'M-Pesa',
    'Banque',
    'Wave',
    'Express Union'
  ];

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={onToggle} className="relative">
        <Filter className="mr-2 h-4 w-4" />
        Filtres avancés
        {getActiveFiltersCount() > 0 && (
          <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {getActiveFiltersCount()}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtres avancés
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Statut */}
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={localFilters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="Servi">Servi</SelectItem>
                <SelectItem value="Remboursé">Remboursé</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Devise */}
          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <Select
              value={localFilters.currency || 'all'}
              onValueChange={(value) => handleFilterChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes devises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes devises</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CDF">CDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label htmlFor="modePaiement">Mode de paiement</Label>
            <Select
              value={localFilters.modePaiement || ''}
              onValueChange={(value) => handleFilterChange('modePaiement', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les modes</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="clientId">ID Client</Label>
            <Input
              id="clientId"
              placeholder="ID du client..."
              value={localFilters.clientId || ''}
              onChange={(e) => handleFilterChange('clientId', e.target.value)}
            />
          </div>

          {/* Date de début */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Date de début</Label>
            <Input
              id="dateFrom"
              type="date"
              value={localFilters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          {/* Date de fin */}
          <div className="space-y-2">
            <Label htmlFor="dateTo">Date de fin</Label>
            <Input
              id="dateTo"
              type="date"
              value={localFilters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* Montant minimum */}
          <div className="space-y-2">
            <Label htmlFor="minAmount">Montant minimum</Label>
            <Input
              id="minAmount"
              type="number"
              placeholder="0.00"
              value={localFilters.minAmount || ''}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            />
          </div>

          {/* Montant maximum */}
          <div className="space-y-2">
            <Label htmlFor="maxAmount">Montant maximum</Label>
            <Input
              id="maxAmount"
              type="number"
              placeholder="0.00"
              value={localFilters.maxAmount || ''}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {getActiveFiltersCount()} filtre{getActiveFiltersCount() > 1 ? 's' : ''} actif{getActiveFiltersCount() > 1 ? 's' : ''}
            </span>
            {getActiveFiltersCount() > 0 && (
              <div className="flex items-center space-x-1">
                {Object.entries(localFilters).map(([key, value]) => 
                  value && value !== 'all' && value !== '' ? (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {typeof value === 'string' && value.length > 10 ? value.slice(0, 10) + '...' : value}
                    </Badge>
                  ) : null
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={resetFilters}>
              <X className="mr-2 h-4 w-4" />
              Effacer
            </Button>
            <Button onClick={applyFilters}>
              <Search className="mr-2 h-4 w-4" />
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;