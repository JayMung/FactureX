"use client";

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react';

interface Transaction {
  id: string;
  client: string;
  datePaiement: string;
  montant: string;
  devise: string;
  motif: string;
  frais: string;
  taux: string;
  benefice: string;
  montantCny: string;
  modePaiement: string;
  statut: string;
  validePar: string;
}

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  
  // Mock data - will be replaced with Supabase data
  const transactions: Transaction[] = [
    {
      id: "TRX-001",
      client: "Jean Mukendi",
      datePaiement: "20/10/2025 14:30",
      montant: "500",
      devise: "USD",
      motif: "Commande",
      frais: "50 (10%)",
      taux: "7.25",
      benefice: "35",
      montantCny: "3,262.50",
      modePaiement: "Airtel Money",
      statut: "Servi",
      validePar: "Admin"
    },
    {
      id: "TRX-002",
      client: "Marie Kabeya", 
      datePaiement: "20/10/2025 13:15",
      montant: "280,000",
      devise: "CDF",
      motif: "Transfert",
      frais: "14,000 (5%)",
      taux: "2,850",
      benefice: "5,600",
      montantCny: "468.42",
      modePaiement: "Orange Money",
      statut: "En attente",
      validePar: "-"
    },
    {
      id: "TRX-003",
      client: "Pierre Ntumba",
      datePaiement: "19/10/2025 16:45",
      montant: "1,200",
      devise: "USD",
      motif: "Transfert", 
      frais: "60 (5%)",
      taux: "7.25",
      benefice: "24",
      montantCny: "8,190",
      modePaiement: "Cash",
      statut: "Servi",
      validePar: "Admin"
    },
    {
      id: "TRX-004",
      client: "Sophie Mbuyi",
      datePaiement: "19/10/2025 11:20",
      montant: "150,000",
      devise: "CDF",
      motif: "Commande",
      frais: "15,000 (10%)",
      taux: "2,850",
      benefice: "10,500",
      montantCny: "473.68",
      modePaiement: "M-Pesa",
      statut: "Remboursé",
      validePar: "Admin"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Servi":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "En attente":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Remboursé":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "Annulé":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Servi":
        return "bg-green-100 text-green-800";
      case "En attente":
        return "bg-yellow-100 text-yellow-800";
      case "Remboursé":
        return "bg-blue-100 text-blue-800";
      case "Annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.modePaiement.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.statut === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || transaction.devise === currencyFilter;
    
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  const totalUSD = transactions
    .filter(t => t.devise === 'USD')
    .reduce((sum, t) => sum + parseFloat(t.montant.replace(',', '')), 0);
  
  const totalCDF = transactions
    .filter(t => t.devise === 'CDF')
    .reduce((sum, t) => sum + parseFloat(t.montant.replace(',', '')), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Transactions</h2>
            <p className="text-gray-500">Enregistrez, suivez et validez chaque transfert</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Transaction
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total USD</p>
                  <p className="text-2xl font-bold text-emerald-600">${totalUSD.toLocaleString()}</p>
                </div>
                <div className="text-emerald-600">
                  <span className="text-2xl font-bold">$</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total CDF</p>
                  <p className="text-2xl font-bold text-blue-600">{totalCDF.toLocaleString()}</p>
                </div>
                <div className="text-blue-600">
                  <span className="text-2xl font-bold">F</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bénéfice total</p>
                  <p className="text-2xl font-bold text-purple-600">$16,159</p>
                </div>
                <div className="text-purple-600">
                  <span className="text-2xl font-bold">↑</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
                </div>
                <div className="text-gray-600">
                  <span className="text-2xl font-bold">T</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher par client, ID ou mode de paiement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="Servi">Servi</SelectItem>
              <SelectItem value="En attente">En attente</SelectItem>
              <SelectItem value="Remboursé">Remboursé</SelectItem>
              <SelectItem value="Annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes devises</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CDF">CDF</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Plus de filtres
          </Button>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Montant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Motif</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Frais</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Bénéfice</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">CNY</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mode</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{transaction.id}</td>
                      <td className="py-3 px-4">{transaction.client}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{transaction.datePaiement}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{transaction.montant} {transaction.devise}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.motif === 'Commande' ? 'default' : 'secondary'}>
                          {transaction.motif}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{transaction.frais}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">{transaction.benefice}</td>
                      <td className="py-3 px-4 text-sm font-medium text-blue-600">{transaction.montantCny}</td>
                      <td className="py-3 px-4 text-sm">{transaction.modePaiement}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(transaction.statut)}
                          <Badge className={getStatusColor(transaction.statut)}>
                            {transaction.statut}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {transaction.statut === 'En attente' && (
                            <Button variant="ghost" size="icon" className="text-green-600">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Transactions;