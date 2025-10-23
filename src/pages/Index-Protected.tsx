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

const IndexProtected: React.FC = () => {
  usePageSetup({
    title: 'Tableau de bord',
    subtitle: "Vue d'ensemble de votre activité"
  });

  const { stats, isLoading, error } = useDashboardWithPermissions();
  const { logs, isLoading: logsLoading, refetch: refetchLogs } = useActivityLogs(1, 10);

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

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Activité Récente
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !logs || logs.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.data.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        {log.action.includes('client') ? (
                          <Users className="h-4 w-4 text-green-600" />
                        ) : log.action.includes('transaction') ? (
                          <Receipt className="h-4 w-4 text-blue-600" />
                        ) : log.action.includes('paramètre') ? (
                          <Settings className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {log.cible || 'Système'}
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
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default IndexProtected;