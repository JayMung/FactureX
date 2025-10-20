"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Phone,
  MapPin
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import Pagination from '../components/ui/pagination-custom';
import { Skeleton } from '../components/ui/skeleton';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    clients,
    pagination,
    isLoading,
    error,
    deleteClient
  } = useClients(currentPage, {
    search: searchTerm
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      deleteClient(clientId);
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur de chargement des clients</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate stats from current page data
  const uniqueCities = [...new Set(clients.map(client => client.ville))].length;
  const totalPayed = clients.reduce((sum, client) => sum + client.total_paye, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Clients</h2>
            <p className="text-gray-500">Centralisez les informations clients et leur historique</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold">{pagination?.count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <MapPin className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Villes couvertes</p>
                  <p className="text-2xl font-bold">{uniqueCities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Contacts actifs</p>
                  <p className="text-2xl font-bold">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 text-orange-600">$</div>
                <div>
                  <p className="text-sm text-gray-600">Total cumulé</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPayed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par nom, téléphone ou ville..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Téléphone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ville</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total payé</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Transactions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        Aucun client trouvé
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-emerald-600 font-medium">
                                {client.nom.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{client.nom}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{client.telephone}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{client.ville}</Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-emerald-600">
                          {formatCurrency(client.total_paye)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">
                            {/* TODO: Get transaction count from service */}
                            0 transactions
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clients;