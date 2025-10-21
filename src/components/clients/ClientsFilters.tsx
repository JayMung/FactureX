"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

interface ClientsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  cities: string[];
}

const ClientsFilters: React.FC<ClientsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  cityFilter,
  onCityFilterChange,
  cities
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={cityFilter} onValueChange={onCityFilterChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Toutes les villes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les villes</SelectItem>
          {cities.map((city: string) => (
            <SelectItem key={city} value={city}>{city}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline">
        <Filter className="mr-2 h-4 w-4" />
        Plus de filtres
      </Button>
    </div>
  );
};

export default ClientsFilters;