import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { PageProvider } from '@/contexts/PageContext';
import Layout from '@/components/layout/Layout';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import AdminSetup from '@/pages/AdminSetup';
import NotFound from '@/pages/NotFound';
import FacturesCreate from '@/pages/Factures-Create';
import FacturesProtected from '@/pages/Factures-Protected';
import TransactionsProtected from '@/pages/Transactions-Protected';
import ClientsProtected from '@/pages/Clients-Protected';
import SettingsPage from '@/pages/Settings';
import SettingsPermissionsPage from '@/pages/Settings-Permissions';
import ActivityLogs from '@/pages/ActivityLogs';
import NotificationSettings from '@/pages/NotificationSettings';
import ProtectedRouteEnhanced from '@/components/auth/ProtectedRouteEnhanced';

function App() {
  return (
    <AuthProvider>
      <PageProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-setup" element={<AdminSetup />} />
            <Route path="/factures/new" element={<FacturesCreate />} />
            <Route path="/factures" element={<FacturesProtected />} />
            <Route path="/transactions" element={<TransactionsProtected />} />
            <Route path="/clients" element={<ClientsProtected />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/permissions" element={<SettingsPermissionsPage />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </PageProvider>
    </AuthProvider>
  );
}

export default App;