"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import StatCard from '../components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
  BarChart3
} from 'lucide-react';
import { useDashboardWithPermissions } from '../hooks/useDashboardWithPermissions';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { formatCurrency } from '../utils/formatCurrency';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import ActivityFeed from '../components/activity/ActivityFeed';
import NotificationCenter from '../components/activity/NotificationCenter';
import AdvancedDashboard from '../components/dashboard/AdvancedDashboard';

const IndexProtected: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
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
      color: 'text-green-600'
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
              className="btn-primary px-6 py-3"
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
          <div className="banner-gradient-green">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Bienvenue sur FactureX</h1>
            <p className="text-green-100">Gérez vos transferts USD/CDF en toute simplicité</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md"
              >
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Vue d'ensemble</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-md"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">Analytics avancés</span>
              </TabsTrigger>
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid-responsive-3">
                {dashboardStats.map((stat, index) => (
                  <StatCard
                    key={index}
                    title={stat.title}
                    value={stat.value}
                    change={stat.change}
                    icon={stat.icon}
                  />
                ))}
              </div>

              {/* Activity Feed + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Feed */}
                <div className="lg:col-span-2">
                  <ActivityFeed showViewAll={true} />
                </div>
                
                {/* Quick Actions */}
                <Card className="card-base h-fit">
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Actions Rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-3">
                      <PermissionGuard module="transactions" permission="create">
                        <Button 
                          asChild
                          variant="outline"
                          className="w-full h-16 flex items-center justify-start gap-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 rounded-md transition-base hover:shadow-md"
                        >
                          <a href="/transactions" className="flex items-center gap-3">
                            <Plus className="h-5 w-5" />
                            <span className="text-sm font-medium">Nouvelle Transaction</span>
                          </a>
                        </Button>
                      </PermissionGuard>
                      
                      <PermissionGuard module="clients" permission="create">
                        <Button 
                          asChild
                          variant="outline"
                          className="w-full h-16 flex items-center justify-start gap-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 rounded-md transition-base hover:shadow-md"
                        >
                          <a href="/clients">
                            <Users className="h-5 w-5" />
                            <span className="text-sm font-medium">Ajouter Client</span>
                          </a>
                        </Button>
                      </PermissionGuard>
                      
                      <Button 
                        asChild
                        className="w-full h-16 flex items-center justify-start space-x-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 rounded-lg transition-all duration-200 active:scale-95 hover:shadow-md"
                      >
                        <a href="/activity-logs">
                          <Activity className="h-5 w-5" />
                          <span className="text-sm font-medium">Voir Activités</span>
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics avancés */}
            <TabsContent value="analytics">
              <AdvancedDashboard />
            </TabsContent>
          </Tabs>

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