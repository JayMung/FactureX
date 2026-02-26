"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  FileText,
  Plus,
  Shield,
  BarChart3,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';

import { useDashboardWithPermissions } from '../hooks/useDashboardWithPermissions';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { useSensitiveDataValue, maskCurrency } from '../hooks/useSensitiveData';

import { usePermissions } from '../hooks/usePermissions';
import { formatCurrency } from '../utils/formatCurrency';
import { getDateRange, PeriodFilter } from '@/utils/dateUtils';
import { PeriodFilterTabs } from '@/components/ui/period-filter-tabs';
import { format } from 'date-fns';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import ActivityFeed from '../components/activity/ActivityFeed';
import AdvancedDashboard from '../components/dashboard/AdvancedDashboard';

const IndexProtected: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAdmin } = usePermissions();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [dateRange, setDateRange] = useState<{ dateFrom?: string; dateTo?: string }>({});

  // Mettre à jour les dates quand la période change
  React.useEffect(() => {
    if (periodFilter !== 'all') {
      const { current } = getDateRange(periodFilter);
      if (current.start && current.end) {
        setDateRange({
          dateFrom: format(current.start, 'yyyy-MM-dd'),
          dateTo: format(current.end, 'yyyy-MM-dd')
        });
      }
    } else {
      setDateRange({});
    }
  }, [periodFilter]);

  usePageSetup({
    title: 'Tableau de bord',
    subtitle: "Vue d'ensemble de votre activité"
  });

  const { stats, isLoading, error } = useDashboardWithPermissions(dateRange);
  const { logs, isLoading: logsLoading } = useActivityLogs(1, 5);

  const isHidden = useSensitiveDataValue();

  const formatCurrencyValue = (amount: number, currency: string = 'USD') => {
    let formatted: string;
    if (currency === 'USD') {
      formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      formatted = `${amount.toLocaleString('fr-FR')} CDF`;
    } else {
      formatted = amount.toString();
    }
    return isHidden ? maskCurrency(formatted, true) : formatted;
  };

  // Stats pour Factures & Revenus uniquement (Vue d'ensemble) - Admin seulement
  const overviewStats = isAdmin ? [
    {
      title: 'Montant Facturé',
      value: isLoading ? '...' : formatCurrencyValue(stats?.facturesAmountUSD || 0, 'USD'),
      icon: DollarSign,
      iconColor: '#21ac74',
      iconBg: '#dcfce7'
    },
    {
      title: 'Total Factures',
      value: isLoading ? '...' : (stats?.facturesCount || 0).toString(),
      icon: FileText,
      iconColor: '#3b82f6',
      iconBg: '#dbeafe'
    },
    {
      title: 'Commissions Perçues',
      value: isLoading ? '...' : formatCurrencyValue(stats?.totalFrais || 0, 'USD'),
      icon: DollarSign,
      iconColor: '#8b5cf6',
      iconBg: '#ede9fe'
    },
    {
      title: 'Factures Validées',
      value: isLoading ? '...' : (stats?.facturesValidees || 0).toString(),
      icon: TrendingUp,
      iconColor: '#f59e0b',
      iconBg: '#fef3c7'
    }
  ] : [
    {
      title: 'Total Factures',
      value: isLoading ? '...' : (stats?.facturesCount || 0).toString(),
      icon: FileText,
      iconColor: '#21ac74',
      iconBg: '#dcfce7'
    },
    {
      title: 'Factures Validées',
      value: isLoading ? '...' : (stats?.facturesValidees || 0).toString(),
      icon: TrendingUp,
      iconColor: '#3b82f6',
      iconBg: '#dbeafe'
    },
    {
      title: 'Total Clients',
      value: isLoading ? '...' : (stats?.clientsCount || 0).toString(),
      icon: Users,
      iconColor: '#f59e0b',
      iconBg: '#fef3c7'
    },
    {
      title: 'Factures en Attente',
      value: isLoading ? '...' : (stats?.facturesEnAttente || 0).toString(),
      icon: Activity,
      iconColor: '#8b5cf6',
      iconBg: '#ede9fe'
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
      badgeClasses: 'bg-success/10 text-success border border-success/20',
      iconClasses: 'bg-primary/15 text-primary',
      borderClasses: 'border-primary/20 hover:border-primary/40',
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
      badgeClasses: 'bg-info/10 text-info border border-info/20',
      iconClasses: 'bg-info/15 text-info',
      borderClasses: 'border-info/20 hover:border-info/40',
      guard: { module: 'clients', permission: 'create' } as const
    },
    {
      id: 'activity',
      title: "Journal d'activités",
      description: 'Suivez les validations, connexions et alertes.',
      icon: Activity,
      href: '/activity-logs',
      badge: 'Sécurité',
      badgeClasses: 'bg-muted text-muted-foreground border border-border',
      iconClasses: 'bg-muted text-muted-foreground',
      borderClasses: 'border-border hover:border-border/80'
    }
  ].filter(action => !action.adminOnly || isAdmin);

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="heading-3 mb-2">Erreur de chargement</h1>
            <p className="body-text mb-4">
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
        <div className="container-section animate-in fade-in duration-300">
          {/* Welcome Section - Plus compact */}
          <div className="banner-compact flex items-center justify-between">
            <div>
              <h1 className="heading-3 text-white">Bienvenue sur FactureX</h1>
              <p className="body-text text-white/80 mt-0.5">Gérez vos transferts USD/CDF en toute simplicité</p>
            </div>
          </div>

          {/* Incomplete transactions warning badge — admin only */}
          {isAdmin && stats?.incompleteTransactionsCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg badge-warning px-4 py-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">
                {stats.incompleteTransactionsCount} transaction{stats.incompleteTransactionsCount > 1 ? 's' : ''} incomplète{stats.incompleteTransactionsCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Tabs - Plus épuré */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="container-section">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList className="inline-flex bg-muted/80 p-1.5 rounded-xl gap-1 w-auto">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-base text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Vue d&apos;ensemble</span>
                  <span className="sm:hidden">Aperçu</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger
                    value="analytics"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-base text-muted-foreground hover:text-foreground hover:bg-accent/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics avancés</span>
                    <span className="sm:hidden">Analytics</span>
                  </TabsTrigger>
                )}
              </TabsList>
              <PeriodFilterTabs
                period={periodFilter}
                onPeriodChange={setPeriodFilter}
                showAllOption={true}
              />
            </div>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="container-section">
              {/* Stats Cards — FreshCart style: white cards with colored icons */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {overviewStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="bg-card rounded-2xl p-4 md:p-5 border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="rounded-xl p-2.5" style={{ background: stat.iconBg }}>
                          <Icon className="h-5 w-5" style={{ color: stat.iconColor }} />
                        </div>
                      </div>
                      <p className="text-2xl md:text-3xl font-bold text-foreground truncate tabular-nums">{stat.value}</p>
                      <p className="mt-1 text-xs md:text-sm text-muted-foreground font-medium">{stat.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Activity Feed + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ActivityFeed showViewAll={true} />
                </div>

                {/* Quick Actions */}
                <Card className="card-base">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="small-text uppercase tracking-wide">Productivité</p>
                        <CardTitle className="heading-4">Actions rapides</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs badge-success">
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
                            className={`group block card-clean p-4 hover:-translate-y-0.5 ${action.borderClasses}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="label-base">{action.title}</p>
                                <p className="small-text mt-1 leading-relaxed">{action.description}</p>
                              </div>
                              <span className={`rounded-full p-2 ${action.iconClasses}`}>
                                <action.icon className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${action.badgeClasses}`}>
                                {action.badge}
                              </span>
                              <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground font-medium transition-colors-fast">
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
              <AdvancedDashboard period={periodFilter} />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default IndexProtected;