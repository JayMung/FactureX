"use client";

import React, { useState, useEffect } from 'react';
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
  Activity,
  User,
  Settings,
  FileText,
  Eye,
  Plus,
  Shield
} from 'lucide-react';
import { useDashboardWithPermissions } from '../hooks/useDashboardWithPermissions';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { formatCurrency } from '../utils/formatCurrency';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import ActivityFeed from '../components/activity/ActivityFeed';
import NotificationCenter from '../components/activity/NotificationCenter';

const IndexProtected: React.FC = () => {
  usePageSetup({
    title: 'Tableau de bord',
    subtitle: "Vue d'ensemble de votre activité"
  });

  const { stats, isLoading, error } = useDashboardWithPermissions();
  const { logs, isLoading: logsLoading } = useActivityLogs(1, 5);

  const formatCurrencyValue = (amount: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    }
    return amount.toString();
  };

  const dashboardStats = [
    {
      title: 'Total USD',
      value: isLoading ? '...' : formatCurrencyValue(stats?.totalUSD || 0, 'USD'),
      change: stats?.monthlyRevenue ? { value: 12, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-emerald-600'
    },
    {
      title: 'Total CDF',
      value: isLoading ? '...' : formatCurrencyValue(stats?.totalCDF || 0, 'CDF'),
      change: stats?.monthlyRevenue ? { value: 8, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-blue-600'
    },
    {
      title: 'Bénéfice Net',
      value: isLoading ? '...' : formatCurrencyValue(stats?.beneficeNet || 0, 'USD'),
      change: stats?.beneficeNet ? { value: 15, isPositive: true } : undefined,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'text-purple-600'
    },
    {
      title: 'Clients',
      value: isLoading ? '...' : (stats?.clientsCount || 0).toString(),
      change: stats?.clientsCount ? { value: 5, isPositive: true } : undefined,
      icon: <Users className="h-6 w-6" />,
      color: 'text-orange-600'
    },
    {
      title: 'Transactions',
      value: isLoading ? '...' : (stats?.transactionsCount || 0).toString(),
      change: stats?.transactionsCount ? { value: 10, isPositive: true } : undefined,
      icon: <Receipt className="h-6 w-6" />,
      color: 'text-indigo-600'
    },
    {
      title: "Aujourd'hui",
      value: isLoading ? '...' : (stats?.todayTransactions || 0).toString(),
      change: stats?.todayTransactions ? { value: 25, isPositive: true } : undefined,
      icon: <Activity className="h-6 w-6" />,
      color: 'text-green-600'
    }
  ];

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur de chargement</h1>
            <p className="text-gray-600 mb-4">
              Impossible de charger les données du tableau de bord.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRouteEnhanced>
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Bienvenue sur CoxiPay</h1>
            <p className="text-emerald-100">Gérez vos transferts USD/CDF en toute simplicité</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

          {/* Activity Feed + Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <ActivityFeed />
            </div>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <PermissionGuard module="transactions" permission="create">
                    <Button 
                      asChild
                      className="h-20 flex flex-col items-center justify-center space-y-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 rounded-lg transition-all duration-200 active:scale-95 hover:shadow-md"
                    >
                      <a href="/transactions">
                        <Plus className="h-6 w-6" />
                        <span className="text-sm">Nouvelle Transaction</span>
                      </a>
                    </Button>
                  </PermissionGuard>
                  
                  <PermissionGuard module="clients" permission="create">
                    <Button 
                      asChild
                      className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-lg transition-all duration-200 active:scale-95 hover:shadow-md"
                    >
                      <a href="/clients">
                        <Users className="h-6 w-6" />
                        <span className="text-sm">Ajouter Client</span>
                      </a>
                    </Button>
                  </PermissionGuard>
                  
                  <Button 
                    asChild
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 rounded-lg transition-all duration-200 active:scale-95 hover:shadow-md"
                  >
                    <a href="/transactions">
                      <Receipt className="h-6 w-6" />
                      <span className="text-sm">Voir Transactions</span>
                    </a>
                  </Button>
                  
                  <Button 
                    disabled
                    className="h-20 flex flex-col items-center justify-center space-y-2 bg-purple-50 text-purple-400 border-purple-100 rounded-lg opacity-50 cursor-not-allowed"
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-sm">Rapports (Bientôt)</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NotificationCenter */}
          <div className="lg:col-span-1">
            <NotificationCenter />
          </div>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default IndexProtected;