"use client";

import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
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
  Activity
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useTransactions } from '../hooks/useTransactions';
import { useClients } from '../hooks/useClients';
import { formatCurrency } from '../utils/formatCurrency';

const Index = () => {
  const { stats, isLoading: statsLoading } = useDashboard();
  const { transactions, isLoading: transactionsLoading } = useTransactions(1);
  const { clients, isLoading: clientsLoading } = useClients(1);

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Mock recent activity data
    setRecentActivity([
      { id: 1, action: 'Nouvelle transaction', user: 'Admin', time: '2 min ago', type: 'transaction' },
      { id: 2, action: 'Client ajouté', user: 'Admin', time: '15 min ago', type: 'client' },
      { id: 3, action: 'Transaction validée', user: 'Admin', time: '1h ago', type: 'validation' },
      { id: 4, action: 'Paramètres mis à jour', user: 'Admin', time: '2h ago', type: 'settings' },
      { id: 5, action: 'Rapport généré', user: 'Admin', time: '3h ago', type: 'report' },
    ]);
  }, []);

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <Receipt className="h-4 w-4 text-blue-600" />;
      case 'client':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'validation':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'settings':
        return <Activity className="h-4 w-4 text-orange-600" />;
      case 'report':
        return <Eye className="h-4 w-4 text-indigo-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
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

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Transactions Récentes</CardTitle>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune transaction récente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.client?.nom || 'Client inconnu'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatCurrency(transaction.montant, transaction.devise)}
                        </p>
                        <Badge 
                          variant={transaction.statut === 'Servi' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {transaction.statut}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Clients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Clients Récents</CardTitle>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun client récent</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.nom}</p>
                          <p className="text-xs text-gray-500">{client.ville}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(client.total_paye, 'USD')}
                        </p>
                        <p className="text-xs text-gray-500">Total payé</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
            <div className="space-y-4">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">par {activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
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