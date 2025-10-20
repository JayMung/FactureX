"use client";

import React from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  // Mock data - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Total USD reçu",
      value: "$125,430",
      change: "12.5%",
      changeType: "increase" as const,
      icon: <DollarSign className="h-8 w-8" />
    },
    {
      title: "Total CDF reçu",
      value: "45,230,000",
      change: "8.2%",
      changeType: "increase" as const,
      icon: <DollarSign className="h-8 w-8" />
    },
    {
      title: "Total CNY transféré",
      value: "¥876,540",
      change: "15.3%",
      changeType: "increase" as const,
      icon: <TrendingUp className="h-8 w-8" />
    },
    {
      title: "Bénéfice net",
      value: "$8,750",
      change: "5.7%",
      changeType: "increase" as const,
      icon: <ArrowUpRight className="h-8 w-8" />
    },
    {
      title: "Transactions totales",
      value: "1,247",
      change: "18.9%",
      changeType: "increase" as const,
      icon: <Receipt className="h-8 w-8" />
    },
    {
      title: "Clients actifs",
      value: "342",
      change: "3.2%",
      changeType: "decrease" as const,
      icon: <Users className="h-8 w-8" />
    }
  ];

  const recentTransactions = [
    {
      id: "TRX-001",
      client: "Jean Mukendi",
      amount: "$500",
      currency: "USD",
      status: "Servi",
      date: "20/10/2025",
      mode: "Airtel Money"
    },
    {
      id: "TRX-002", 
      client: "Marie Kabeya",
      amount: "280,000",
      currency: "CDF",
      status: "En attente",
      date: "20/10/2025",
      mode: "Orange Money"
    },
    {
      id: "TRX-003",
      client: "Pierre Ntumba",
      amount: "$1,200",
      currency: "USD", 
      status: "Servi",
      date: "19/10/2025",
      mode: "Cash"
    },
    {
      id: "TRX-004",
      client: "Sophie Mbuyi",
      amount: "150,000",
      currency: "CDF",
      status: "Remboursé",
      date: "19/10/2025",
      mode: "M-Pesa"
    }
  ];

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              changeType={stat.changeType}
              icon={stat.icon}
            />
          ))}
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Évolution des transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Graphique Recharts</p>
                  <p className="text-sm text-gray-400">Volume mensuel USD/CDF</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{transaction.client}</p>
                        <Badge variant="secondary" className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-gray-600">{transaction.amount} {transaction.currency}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exchange Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Taux de change du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">USD → CNY</p>
                <p className="text-2xl font-bold text-emerald-600">7.25</p>
                <p className="text-xs text-gray-500 mt-1">+0.05 vs hier</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">USD → CDF</p>
                <p className="text-2xl font-bold text-blue-600">2,850</p>
                <p className="text-xs text-gray-500 mt-1">+50 vs hier</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Frais transfert</p>
                <p className="text-2xl font-bold text-purple-600">5%</p>
                <p className="text-xs text-gray-500 mt-1">Commission partenaire: 3%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;