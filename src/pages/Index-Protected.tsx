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
  TrendingDown,
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

  // Stats pour Factures & Revenus uniquement (Vue d'ensemble)
  const overviewStats = [
    {
      title: 'Total Factures',
      value: isLoading ? '...' : (stats?.facturesCount || 0).toString(),
      change: stats?.facturesCount > 0 ? { value: 8, isPositive: true } : undefined,
      icon: <FileText className="h-6 w-6 text-white" />,
      iconBg: 'bg-green-500'
    },
    {
      title: 'Montant Facturé USD',
      value: isLoading ? '...' : formatCurrencyValue(stats?.facturesAmountUSD || 0, 'USD'),
      change: stats?.facturesAmountUSD > 0 ? { value: 12, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6 text-white" />,
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Total Frais',
      value: isLoading ? '...' : formatCurrencyValue(stats?.totalFrais || 0, 'USD'),
      change: stats?.totalFrais > 0 ? { value: 8, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6 text-white" />,
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Factures Validées',
      value: isLoading ? '...' : (stats?.facturesValidees || 0).toString(),
      change: stats?.facturesValidees > 0 ? { value: 10, isPositive: true } : undefined,
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      iconBg: 'bg-orange-500'
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
              {/* Stats avec icônes colorées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {overviewStats.map((stat, index) => (
                  <Card key={index} className="card-base transition-shadow-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                            {stat.value}
                          </p>
                          {stat.change && (
                            <div className="flex items-center gap-1 mt-2">
                              {stat.change.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-success" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-error" />
                              )}
                              <span className={stat.change.isPositive ? "text-success text-xs font-medium" : "text-error text-xs font-medium"}>
                                {stat.change.value}%
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">vs période précédente</span>
                            </div>
                          )}
                        </div>
                        <div className={`p-3 rounded-full ${stat.iconBg} flex-shrink-0`}>
                          {stat.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Activity Feed + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Feed */}
                <div className="lg:col-span-2">
                  <ActivityFeed showViewAll={true} />
                </div>
                
                {/* Quick Actions */}
                <Card className="card-base">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Actions Rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      <PermissionGuard module="transactions" permission="create">
                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700"
                        >
                          <a href="/transactions" className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Nouvelle Transaction</span>
                          </a>
                        </Button>
                      </PermissionGuard>
                      
                      <PermissionGuard module="clients" permission="create">
                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700"
                        >
                          <a href="/clients" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">Ajouter Client</span>
                          </a>
                        </Button>
                      </PermissionGuard>
                      
                      <Button 
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      >
                        <a href="/activity-logs" className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span className="text-sm">Voir Activités</span>
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
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default IndexProtected;