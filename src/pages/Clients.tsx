"use client";

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface Client {
  id: string;
  nom: string;
  telephone: string;
  ville: string;
  totalPaye: string;
  transactionCount: number;
}

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data - will be replaced with Supabase data
  const clients: Client[] = [
    {
      id: "1",
      nom: "Jean Mukendi",
      telephone: "+243 812 345 678",
      ville: "Kinshasa",
      totalPaye: "$5,500",
      transactionCount: 12
    },
    {
      id: "2", 
      nom: "Marie Kabeya",
      telephone: "+243 823 456 789",
      ville: "Lubumbashi",
      totalPaye: "$3,200",
      transactionCount: 8
    },
    {
      id: "3",
      nom: "Pierre Ntumba",
      telephone: "+243 834 567 890",
      ville: "Goma",
      totalPaye: "$7,800",
      transactionCount: 15
    },
    {
      id: "4",
      nom: "Sophie Mbuyi",
      telephone: "+243 845 678 901",
      ville: "Bukavu",
      totalPaye: "$2,100",
      transactionCount: 5
    }
  ];

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone.includes(searchTerm) ||
    client.ville.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <p className="text-2xl font-bold">{clients.length}</p>
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
                  <p className="text-2xl font-bold">4</p>
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
                  <p className="text-2xl font-bold">$18.6K</p>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  {filteredClients.map((client) => (
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
                      <td className="py-3 px-4 font-medium text-emerald-600">{client.totalPaye}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{client.transactionCount} transactions</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

export default Clients;