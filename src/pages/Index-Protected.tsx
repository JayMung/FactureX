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
  BarChart3,
  ArrowUpRight
} from 'lucide-react';

import { useDashboardWithPermissions } from '../hooks/useDashboardWithPermissions';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { usePermissions } from '../hooks/usePermissions';
import { formatCurrency } from '../utils/formatCurrency';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import ActivityFeed from '../components/activity/ActivityFeed';
import AdvancedDashboard from '../components/dashboard/AdvancedDashboard';

const IndexProtected: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAdmin } = usePermissions();
  
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

  // Stats pour Factures & Revenus uniquement (Vue d'ensemble) - Admin seulement
  const overviewStats = isAdmin ? [
    {
      title: 'Total Factures',
      value: isLoading ? '...' : (stats?.facturesCount || 0).toString(),
      change: stats?.facturesCount > 0 ? { value: 8, isPositive: true } : undefined,
      icon: <FileText className="h-6 w-6 text-white" />,
      iconBg: 'bg-green-500',
      borderColor: 'border-l-green-400'
    },
    {
      title: 'Montant Facturé USD',
      value: isLoading ? '...' : formatCurrencyValue(stats?.facturesAmountUSD || 0, 'USD'),
      change: stats?.facturesAmountUSD > 0 ? { value: 12, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6 text-white" />,
      iconBg: 'bg-blue-500',
      borderColor: 'border-l-blue-400'
    },
    {
      title: 'Total Frais',
      value: isLoading ? '...' : formatCurrencyValue(stats?.totalFrais || 0, 'USD'),
      change: stats?.totalFrais > 0 ? { value: 8, isPositive: true } : undefined,
      icon: <DollarSign className="h-6 w-6 text-white" />,
      iconBg: 'bg-purple-500',
      borderColor: 'border-l-purple-400'
    },
    {
      title: 'Factures Validées',
      value: isLoading ? '...' : (stats?.facturesValidees || 0).toString(),
      change: stats?.facturesValidees > 0 ? { value: 10, isPositive: true } : undefined,
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      iconBg: 'bg-orange-500',
      borderColor: 'border-l-orange-400'
    }
  ] : [
    // Stats pour opérateurs (uniquement factures de base, sans montants)
    {
      title: 'Total Factures',
      value: isLoading ? '...' : (stats?.facturesCount || 0).toString(),
      change: stats?.facturesCount > 0 ? { value: 5, isPositive: true } : undefined,
      icon: <FileText className="h-6 w-6 text-white" />,
      iconBg: 'bg-green-500',
      borderColor: 'border-l-green-400'
    },
    {
      title: 'Factures Validées',
      value: isLoading ? '...' : (stats?.facturesValidees || 0).toString(),
      change: stats?.facturesValidees > 0 ? { value: 3, isPositive: true } : undefined,
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      iconBg: 'bg-blue-500',
      borderColor: 'border-l-blue-400'
    },
    {
      title: 'Total Clients',
      value: isLoading ? '...' : (stats?.clientsCount || 0).toString(),
      change: stats?.clientsCount > 0 ? { value: 2, isPositive: true } : undefined,
      icon: <Users className="h-6 w-6 text-white" />,
      iconBg: 'bg-orange-500',
      borderColor: 'border-l-orange-400'
    },
    {
      title: 'Factures en Attente',
      value: isLoading ? '...' : (stats?.facturesEnAttente || 0).toString(),
      change: stats?.facturesEnAttente > 0 ? { value: 1, isPositive: false } : undefined,
      icon: <Activity className="h-6 w-6 text-white" />,
      iconBg: 'bg-purple-500',
      borderColor: 'border-l-purple-400'
    }
  ];

  const quickActions = [
    {
      id: 'transaction',
      title: 'Nouvelle transaction',
      description: 'Créez une opération financière en USD ou CDF.',
      icon: Plus,
      href: '/transactions',
      badge: 'Finance',
      badgeClasses: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      iconClasses: 'bg-emerald-500/15 text-emerald-600',
      borderClasses: 'border-emerald-100/60 hover:border-emerald-200/80',
      adminOnly: true,
      guard: { module: 'finances', permission: 'create' } as const
    },
    {
      id: 'client',
      title: 'Ajouter un client',
      description: 'Enregistrez un client pour les prochains devis.',
      icon: Users,
      href: '/clients',
      badge: 'CRM',
      badgeClasses: 'bg-sky-50 text-sky-700 border border-sky-100',
      iconClasses: 'bg-sky-500/15 text-sky-600',
      borderClasses: 'border-sky-100/70 hover:border-sky-200/80',
      guard: { module: 'clients', permission: 'create' } as const
    },
    {
      id: 'activity',
      title: "Journal d'activités",
      description: 'Suivez les validations, connexions et alertes.',
      icon: Activity,
      href: '/activity-logs',
      badge: 'Sécurité',
      badgeClasses: 'bg-slate-100 text-slate-700 border border-slate-200',
      iconClasses: 'bg-slate-500/15 text-slate-600',
      borderClasses: 'border-slate-100/80 hover:border-slate-200'
    }
  ].filter(action => !action.adminOnly || isAdmin);

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
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Welcome Section - Plus compact */}
          <div className="banner-compact flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Bienvenue sur FactureX</h1>
              <p className="text-green-100/90 text-sm mt-0.5">Gérez vos transferts USD/CDF en toute simplicité</p>
            </div>
          </div>

          {/* Tabs - Plus épuré */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="inline-flex bg-gray-100/80 dark:bg-gray-800/50 p-1 rounded-lg gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all rounded-md text-gray-600 dark:text-gray-400"
              >
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Vue d'ensemble</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all rounded-md text-gray-600 dark:text-gray-400"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Analytics avancés</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-5">
              {/* Stats - Design épuré avec bordures colorées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {overviewStats.map((stat, index) => (
                  <div key={index} className={`stat-card border-l-4 ${stat.borderColor}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                        {stat.change && (
                          <div className={`mt-2 ${stat.change.isPositive ? 'trend-positive' : 'trend-negative'}`}>
                            {stat.change.isPositive ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            <span>{stat.change.value}%</span>
                          </div>
                        )}
                      </div>
                      <div className={`p-2.5 rounded-xl ${stat.iconBg} flex-shrink-0`}>
                        {stat.icon}
                      </div>
                    </div>
                  </div>
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
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Productivité</p>
                        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Actions rapides</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                        {quickActions.length} raccourci{quickActions.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      {quickActions.map((action) => {
                        const content = (
                          <a
                            key={action.id}
                            href={action.href}
                            className={`group block rounded-xl border bg-white/60 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg ${action.borderClasses}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{action.description}</p>
                              </div>
                              <span className={`rounded-full p-2 ${action.iconClasses}`}>
                                <action.icon className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${action.badgeClasses}`}>
                                {action.badge}
                              </span>
                              <span className="inline-flex items-center gap-1 text-gray-500 group-hover:text-gray-900 font-medium">
                                Accéder
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </a>
                        );

                        if (action.guard) {
                          return (
                            <PermissionGuard
                              key={action.id}
                              module={action.guard.module}
                              permission={action.guard.permission}
                            >
                              {content}
                            </PermissionGuard>
                          );
                        }

                        return content;
                      })}
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