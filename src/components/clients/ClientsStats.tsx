"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, MapPin } from 'lucide-react';

interface ClientsStatsProps {
  totalClients: number;
  totalPaid: number;
  totalCities: number;
  selectedCount: number;
}

const ClientsStats: React.FC<ClientsStatsProps> = ({
  totalClients,
  totalPaid,
  totalCities,
  selectedCount
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-emerald-600">
                {totalClients}
              </p>
            </div>
            <div className="text-emerald-600">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payé</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="text-blue-600">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Villes</p>
              <p className="text-2xl font-bold text-purple-600">
                {totalCities}
              </p>
            </div>
            <div className="text-purple-600">
              <MapPin className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sélectionnés</p>
              <p className="text-2xl font-bold text-orange-600">
                {selectedCount}
              </p>
            </div>
            <div className="text-orange-600">
              <span className="text-2xl font-bold">✓</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsStats;