import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Activity, AlertTriangle, FileText } from 'lucide-react';
import ActivityLogsTab from '@/components/security/ActivityLogsTab';
import SecurityLogsTab from '@/components/security/SecurityLogsTab';
import SecurityAlertsTab from '@/components/security/SecurityAlertsTab';
import AuditTrailTab from '@/components/security/AuditTrailTab';

const SecurityDashboard: React.FC = () => {
  usePageSetup({
    title: 'Dashboard de Sécurité',
    subtitle: 'Monitoring complet de la sécurité et des activités'
  });

  const [activeTab, setActiveTab] = useState('activity');

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-7 w-7 text-green-600" />
              Dashboard de Sécurité
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Surveillance et analyse des événements de sécurité
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activités</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alertes</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="mt-6">
            <ActivityLogsTab />
          </TabsContent>

          {/* Security Logs Tab */}
          <TabsContent value="security" className="mt-6">
            <SecurityLogsTab />
          </TabsContent>

          {/* Security Alerts Tab */}
          <TabsContent value="alerts" className="mt-6">
            <SecurityAlertsTab />
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="mt-6">
            <AuditTrailTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SecurityDashboard;
