"use client";

import React from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Dashboard: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 1023px)');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar currentPath="/dashboard" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header with dynamic title */}
        <Header 
          title="Tableau de bord"
          description="Vue d'ensemble de votre activité"
          isMobile={isMobile}
        />

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Transactions</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Revenus</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">$0</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Taux de change</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;