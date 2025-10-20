"use client";

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/types';

interface TransactionChartProps {
  transactions: Transaction[];
}

const TransactionChart: React.FC<TransactionChartProps> = ({ transactions }) => {
  // Préparer les données pour le graphique mensuel
  const monthlyData = React.useMemo(() => {
    const data: Record<string, { month: string; USD: number; CDF: number; CNY: number }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.created_at);
      const monthKey = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
      
      if (!data[monthKey]) {
        data[monthKey] = { month: monthKey, USD: 0, CDF: 0, CNY: 0 };
      }
      
      if (transaction.devise === 'USD') {
        data[monthKey].USD += transaction.montant;
        data[monthKey].CNY += transaction.montant_cny;
      } else if (transaction.devise === 'CDF') {
        data[monthKey].CDF += transaction.montant;
      }
    });
    
    return Object.values(data).slice(-6); // Derniers 6 mois
  }, [transactions]);

  // Préparer les données pour le graphique des motifs
  const motifData = React.useMemo(() => {
    const data: Record<string, { name: string; value: number; count: number }> = {};
    
    transactions.forEach(transaction => {
      if (!data[transaction.motif]) {
        data[transaction.motif] = { name: transaction.motif, value: 0, count: 0 };
      }
      data[transaction.motif].value += transaction.benefice;
      data[transaction.motif].count += 1;
    });
    
    return Object.values(data);
  }, [transactions]);

  // Préparer les données pour le graphique des statuts
  const statusData = React.useMemo(() => {
    const data: Record<string, { name: string; value: number }> = {};
    
    transactions.forEach(transaction => {
      if (!data[transaction.statut]) {
        data[transaction.statut] = { name: transaction.statut, value: 0 };
      }
      data[transaction.statut].value += 1;
    });
    
    return Object.values(data);
  }, [transactions]);

  const COLORS = {
    'En attente': '#eab308',
    'Servi': '#22c55e',
    'Remboursé': '#3b82f6',
    'Annulé': '#ef4444',
    'Commande': '#8b5cf6',
    'Transfert': '#06b6d4'
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'CDF' 
                ? `${entry.value.toLocaleString('fr-FR')} F`
                : entry.name === 'CNY'
                ? `¥${entry.value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <p>Aucune donnée à afficher</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Graphique des volumes mensuels */}
      <Card>
        <CardHeader>
          <CardTitle>Volume mensuel des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="USD" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="USD"
              />
              <Line 
                type="monotone" 
                dataKey="CDF" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="CDF"
              />
              <Line 
                type="monotone" 
                dataKey="CNY" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="CNY"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des bénéfices par motif */}
        <Card>
          <CardHeader>
            <CardTitle>Bénéfices par motif</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={motifData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Bénéfice']}
                  labelFormatter={(label) => `Motif: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6"
                  name="Bénéfice"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique des statuts */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionChart;