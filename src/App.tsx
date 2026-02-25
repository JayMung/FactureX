import { lazy, Suspense } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PageProvider } from "@/contexts/PageContext";
import ProtectedRouteEnhanced from "@/components/auth/ProtectedRouteEnhanced";
import { useComptabiliteAI } from '@/hooks/useComptabiliteAI';

// Agent IA Comptabilite - runs silently inside providers
const ComptabiliteAIAgent = () => {
  useComptabiliteAI({
    telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
    telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID,
    maxDaysWithoutReconciliation: 3,
    maxUnrecordedExpenses: 3,
  });
  return null;
};

// Page Loader component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Auth pages (small, loaded early)
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const IndexProtected = lazy(() => import("./pages/Index-Protected"));
const ClientsProtected = lazy(() => import("./pages/Clients-Protected"));
const TransactionsProtected = lazy(() => import("./pages/Transactions-Protected"));
const FacturesProtected = lazy(() => import("./pages/Factures-Protected"));
const FacturesCreate = lazy(() => import("./pages/Factures-Create"));
const FacturesView = lazy(() => import("./pages/Factures-View"));
const FacturesPreview = lazy(() => import("./pages/Factures-Preview"));
const ColisAeriens = lazy(() => import("./pages/Colis-Aeriens"));
const ColisAeriensCreate = lazy(() => import("./pages/Colis-Aeriens-Create"));
const SettingsWithPermissions = lazy(() => import("./pages/Settings-Permissions"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const SecurityAudit = lazy(() => import("./pages/SecurityAudit"));
const PermissionDiagnosticPage = lazy(() => import("./pages/Permission-Diagnostic"));
const ComptesFinancesProtected = lazy(() => import("./pages/Comptes-Finances-Protected"));
const CategoriesFinances = lazy(() => import("./pages/Categories-Finances"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Webhooks = lazy(() => import("./pages/Webhooks"));
const StatistiquesProtected = lazy(() => import('./pages/Statistiques-Protected'));
const FinancesDashboard = lazy(() => import('./pages/Finances-Dashboard'));
const ColisMaritimePage = lazy(() => import('./pages/Colis-Maritime'));
const Rapports = lazy(() => import("./pages/Rapports"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const AdminInvitation = lazy(() => import("./pages/AdminInvitation"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Désactiver le refetch automatique au focus
      refetchOnMount: false, // Désactiver le refetch automatique au mount
      refetchOnReconnect: false, // Désactiver le refetch automatique à la reconnexion
      staleTime: 5 * 60 * 1000, // 5 minutes - les données sont considérées fraîches pendant 5 min
      retry: 1, // Réessayer seulement 1 fois en cas d'erreur
      retryDelay: 1000, // Attendre 1 seconde avant de réessayer
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ComptabiliteAIAgent />
          <PageProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Admin setup disabled in production for security */}
                {import.meta.env.DEV && (
                  <Route path="/admin-setup" element={<AdminSetup />} />
                )}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin-invitation" element={<AdminInvitation />} />
                <Route path="/security_audit" element={<SecurityAudit />} />
                <Route path="/" element={
                  <ProtectedRouteEnhanced>
                    <IndexProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/clients" element={
                  <ProtectedRouteEnhanced>
                    <ClientsProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/transactions" element={
                  <ProtectedRouteEnhanced requiredModule="finances">
                    <TransactionsProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/factures" element={
                  <ProtectedRouteEnhanced>
                    <FacturesProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/factures/new" element={
                  <ProtectedRouteEnhanced>
                    <FacturesCreate />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/factures/edit/:id" element={
                  <ProtectedRouteEnhanced>
                    <FacturesCreate />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/factures/view/:id" element={
                  <ProtectedRouteEnhanced>
                    <FacturesView />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/factures/preview/:id" element={
                  <ProtectedRouteEnhanced>
                    <FacturesPreview />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/colis/aeriens" element={
                  <ProtectedRouteEnhanced>
                    <ColisAeriens />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/colis/aeriens/nouveau" element={
                  <ProtectedRouteEnhanced>
                    <ColisAeriensCreate />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/colis/aeriens/:id/modifier" element={
                  <ProtectedRouteEnhanced>
                    <ColisAeriensCreate />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/colis/maritime" element={
                  <ProtectedRouteEnhanced>
                    <ColisMaritimePage />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/settings" element={
                  <ProtectedRouteEnhanced>
                    <SettingsWithPermissions />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/api-keys" element={
                  <ProtectedRouteEnhanced>
                    <ApiKeys />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/webhooks" element={
                  <ProtectedRouteEnhanced>
                    <Webhooks />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/activity-logs" element={
                  <ProtectedRouteEnhanced adminOnly={false}>
                    <ActivityLogs />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/security-dashboard" element={
                  <ProtectedRouteEnhanced>
                    <SecurityDashboard />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/comptes" element={
                  <ProtectedRouteEnhanced requiredModule="finances">
                    <ComptesFinancesProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/finances/dashboard" element={
                  <ProtectedRouteEnhanced requiredModule="finances">
                    <FinancesDashboard />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/finances/categories" element={
                  <ProtectedRouteEnhanced requiredModule="finances">
                    <CategoriesFinances />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/finances/statistiques" element={
                  <ProtectedRouteEnhanced requiredModule="finances">
                    <StatistiquesProtected />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="/rapports" element={
                  <ProtectedRouteEnhanced>
                    <Rapports />
                  </ProtectedRouteEnhanced>
                } />
                {/* Routes redirigées vers /transactions (pages fusionnées) */}
                <Route path="/operations-financieres" element={<Navigate to="/transactions" replace />} />
                <Route path="/finances/encaissements" element={<Navigate to="/transactions" replace />} />
                <Route path="/permission-diagnostic" element={
                  <ProtectedRouteEnhanced>
                    <PermissionDiagnosticPage />
                  </ProtectedRouteEnhanced>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;