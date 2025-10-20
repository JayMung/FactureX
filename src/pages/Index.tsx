"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/dashboard/StatCard';
import TransactionChart from '../components/charts/TransactionChart';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useDashboardStats, useRecentTransactions, useExchangeRates } from '../hooks/useDashboard';
import { useTransactions } from '../hooks/useTransactions';
import { Skeleton } from '../components/ui/skeleton';

const Index = () => {
  const { stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { transactions, isLoading: transactionsLoading } = useRecentTransactions(50); // Plus de données pour les graphiques
  const { rates, isLoading: ratesLoading } = useExchangeRates();
  const { transactions: allTransactions, isLoading: allTransactionsLoading } = useTransactions(1, {});

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} F`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toString();
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

  if (statsError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur de chargement des données</p>
            <p className="text-gray-500">{statsError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const dashboardStats = [
    {
      title: "Total USD reçu",
      value: formatCurrency(stats?.totalUSD || 0, 'USD'),
      change: "+12.5%",
      changeType: "increase" as const,
      icon: <DollarSign className="h-8 w-8" />
    },
    {
      title: "Total CDF reçu",
      value: formatCurrency(stats?.totalCDF || 0, 'CDF'),
      change: "+8.2%",
      changeType: "increase" as const,
      icon: <DollarSign className="h-8 w-8" />
    },
    {
      title: "Total CNY transféré",
      value: formatCurrency(stats?.totalCNY || 0, 'CNY'),
      change: "+15.3%",
      changeType: "increase" as const,
      icon: <TrendingUp className="h-8 w-8" />
    },
    {
      title: "Bénéfice net",
      value: formatCurrency(stats?.beneficeNet || 0, 'USD'),
      change: "+5.7%",
      changeType: "increase" as const,
      icon: <ArrowUpRight className="h-8 w-8" />
    },
    {
      title: "Transactions totales",
      value: (stats?.transactionsCount || 0).toString(),
      change: "+18.9%",
      changeType: "increase" as const,
      icon: <Receipt className="h-8 w-8" />
    },
    {
      title: "Clients actifs",
      value: (stats?.clientsCount || 0).toString(),
      change: "+3.2%",
      changeType: "increase" as const,
      icon: <Users className="h-8 w-8" />
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            dashboardStats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                changeType={stat.changeType}
                icon={stat.icon}
              />
            ))
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Analyse des transactions</h3>
            <Badge variant="outline">
              {allTransactions.length} transactions analysées
            </Badge>
          </div>
          
          {allTransactionsLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TransactionChart transactions={allTransactions} />
          )}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{transaction.client?.nom || 'Client inconnu'}</p>
                        <Badge variant="secondary" className={getStatusColor(transaction.statut)}>
                          {transaction.statut}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-gray-600">
                          {formatCurrency(transaction.montant, transaction.devise)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exchange Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Taux de change du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {ratesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <Skeleton className="h-4 w-20 mx-auto mb-2" />
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-3 w-24 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">USD → CNY</p>
                  <p className="text-2xl font-bold text-emerald-600">{rates?.usdToCny || '7.25'}</p>
                  <p className="text-xs text-gray-500 mt-1">+0.05 vs hier</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">USD → CDF</p>
                  <p className="text-2xl font-bold text-blue-600">{rates?.usdToCdf?.toLocaleString() || '2,850'}</p>
                  <p className="text-xs text-gray-500 mt-1">+50 vs hier</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Frais transfert</p>
                  <p className="text-2xl font-bold text-purple-600">5%</p>
                  <p className="text-xs text-gray-500 mt-1">Commission partenaire: 3%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;