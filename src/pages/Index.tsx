"use client";

import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import StatCard from '../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Receipt, 
  TrendingUp,
  Eye,
  Plus,
  Activity,
  User,
  Settings,
  FileText
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { formatCurrency } from '../utils/formatCurrency';

const Index = () => {
  usePageSetup({
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité'
  });

  const { stats, isLoading: statsLoading } = useDashboard();
  const { logs, isLoading: logsLoading } = useActivityLogs(1, 10);

  const formatCurrencyValue = (amount: number, currency: string = 'USD') => {
    if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const dashboardStats = [
    {
      title: 'Total USD',
      value: statsLoading ? '...' : formatCurrencyValue(stats?.totalUSD || 0, 'USD'),
      change: stats?.monthlyRevenue ? { value: 12, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-emerald-600'
    },
    {
      title: 'Total CDF',
      value: statsLoading ? '...' : formatCurrencyValue(stats?.totalCDF || 0, 'CDF'),
      change: stats?.monthlyRevenue ? { value: 8, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-blue-600'
    },
    {
      title: 'Bénéfice Net',
      value: statsLoading ? '...' : formatCurrencyValue(stats?.beneficeNet || 0, 'USD'),
      change: stats?.beneficeNet ? { value: 15, isPositive: true } : undefined,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'text-purple-600'
    },
    {
      title: 'Clients',
      value: statsLoading ? '...' : (stats?.clientsCount || 0).toString(),
      change: stats?.clientsCount ? { value: 5, isPositive: true } : undefined,
      icon: <Users className="h-6 w-6" />,
      color: 'text-orange-600'
    },
    {
      title: 'Transactions',
      value: statsLoading ? '...' : (stats?.transactionsCount || 0).toString(),
      change: stats?.transactionsCount ? { value: 10, isPositive: true } : undefined,
      icon: <Receipt className="h-6 w-6" />,
      color: 'text-indigo-600'
    },
    {
      title: 'Aujourd\'hui',
      value: statsLoading ? '...' : (stats?.todayTransactions || 0).toString(),
      change: stats?.todayTransactions ? { value: 25, isPositive: true } : undefined,
      icon: <Activity className="h-6 w-6" />,
      color: 'text-green-600'
    }
  ];

  const getActivityIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('client') || lowerAction.includes('création client')) {
      return <Users className="h-4 w-4 text-green-600" />;
    } else if (lowerAction.includes('transaction') || lowerAction.includes('création transaction')) {
      return <Receipt className="h-4 w-4 text-blue-600" />;
    } else if (lowerAction.includes('paramètre') || lowerAction.includes('modification paramètre')) {
      return <Settings className="h-4 w-4 text-orange-600" />;
    } else if (lowerAction.includes('suppression')) {
      return <FileText className="h-4 w-4 text-red-600" />;
    } else if (lowerAction.includes('modification') || lowerAction.includes('mise à jour')) {
      return <TrendingUp className="h-4 w-4 text-purple-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getEntityTypeLabel = (entityType?: string) => {
    switch (entityType) {
      case 'Client':
        return 'Client';
      case 'Transaction':
        return 'Transaction';
      case 'Settings':
        return 'Paramètres';
      case 'PaymentMethod':
        return 'Mode de paiement';
      case 'UserProfile':
        return 'Utilisateur';
      default:
        return entityType || 'Système';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Bienvenue sur CoxiPay</h1>
          <p className="text-emerald-100">Gérez vos transferts USD/CDF en toute simplicité</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardStats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              className="hover:shadow-lg transition-shadow"
            />
          ))}
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Activité Récente</CardTitle>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.data.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.data.map((log) => (
                  <div key={log.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0">
                      {getActivityIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getEntityTypeLabel(log.entity_type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          par {log.user?.email || 'Utilisateur inconnu'} • {new Date(log.date || log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200">
                <Plus className="h-6 w-6" />
                <span className="text-sm">Nouvelle Transaction</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6" />
                <span className="text-sm">Ajouter Client</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Receipt className="h-6 w-6" />
                <span className="text-sm">Voir Transactions</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">Rapports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;