"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp,
  Activity,
  Eye,
  Calendar,
  Filter
} from 'lucide-react';
import { usePageSetup } from '../hooks/use-page-setup';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '../utils/formatCurrency';
import TransactionChart from '../components/charts/TransactionChart';
import { useTransactions } from '../hooks/useTransactions';
import { useClients } from '../hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog } from '@/types';

const Index = () => {
  usePageSetup({
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité'
  });

  const { stats, isLoading, error } = useDashboard();
  const { transactions } = useTransactions(1, {});
  const { clients } = useClients(1, {});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            *,
            auth_user:auth.users(email)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setRecentActivity(data || []);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchRecentActivity();
  }, []);

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erreur de chargement</p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.clientsCount || 0}
                </p>
                <p className="text-xs text-gray-500">
                  +{stats?.todayTransactions || 0} aujourd'hui
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.transactionsCount || 0}
                </p>
                <p className="text-xs text-gray-500">
                  +{stats?.todayTransactions || 0} aujourd'hui
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Volume USD</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.totalUSD || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(stats?.monthlyRevenue || 0, 'USD')} ce mois
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bénéfice Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.beneficeNet || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">
                  +12% vs mois dernier
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Activité des Transactions</span>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrer
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <TransactionChart transactions={transactions} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée à afficher
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {log.action}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getEntityTypeLabel(log.cible)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">Aucune activité récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;