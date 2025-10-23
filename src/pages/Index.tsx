"use client";

import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import StatCard from '../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useRealTimeActivity } from '../hooks/useRealTimeActivity';
import { formatCurrency } from '../utils/formatCurrency';
import ActivityFeed from '../components/activity/ActivityFeed';
import TopActiveUsers from '../components/dashboard/TopActiveUsers';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  usePageSetup({
    title: 'Tableau de bord',
    subtitle: "Vue d'ensemble de votre activité"
  });

  const navigate = useNavigate();
  const { stats, isLoading: statsLoading } = useDashboard();
  const { logs, isLoading: logsLoading } = useActivityLogs(1, 50);
  const { activities } = useRealTimeActivity(50);

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
      title: "Aujourd'hui",
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

        {/* Activity Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Activités Aujourd'hui</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {activities.filter(a => {
                    const today = new Date().toDateString();
                    return new Date(a.created_at).toDateString() === today;
                  }).length}
                </span>
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Dernières 24h</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Créations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.action.includes('Création')).length}
                </span>
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Nouveaux éléments</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Modifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-yellow-600">
                  {activities.filter(a => a.action.includes('Modification')).length}
                </span>
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Éléments modifiés</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Utilisateurs Actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-purple-600">
                  {new Set(activities.map(a => a.user_id)).size}
                </span>
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Dernière période</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed et Top Users en grille */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed showViewAll={true} />
          </div>
          <div className="lg:col-span-1">
            <TopActiveUsers limit={5} />
          </div>
        </div>

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
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/transactions')}
              >
                <Receipt className="h-6 w-6" />
                <span className="text-sm">Voir Transactions</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/activity-logs')}
              >
                <Activity className="h-6 w-6" />
                <span className="text-sm">Logs d'Activité</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;