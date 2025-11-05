import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @ts-ignore - Temporary workaround for react-router-dom types
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PageProvider } from "@/contexts/PageContext";
import ProtectedRouteEnhanced from "@/components/auth/ProtectedRouteEnhanced";
import IndexProtected from "./pages/Index-Protected";
import ClientsProtected from "./pages/Clients-Protected";
import TransactionsProtected from "./pages/Transactions-Protected";
import FacturesProtected from "./pages/Factures-Protected";
import FacturesCreate from "./pages/Factures-Create";
import FacturesView from "./pages/Factures-View";
import FacturesPreview from "./pages/Factures-Preview";
import ColisAeriens from "./pages/Colis-Aeriens";
import ColisAeriensCreate from "./pages/Colis-Aeriens-Create";
import SettingsWithPermissions from "./pages/Settings-Permissions";
import ActivityLogs from "./pages/ActivityLogs";
import SecurityDashboard from "./pages/SecurityDashboard";
import SecurityAudit from "./pages/SecurityAudit";
import PermissionDiagnosticPage from "./pages/Permission-Diagnostic";
import ComptesFinancesProtected from "./pages/Comptes-Finances-Protected";
import OperationsFinancieres from "./pages/Operations-Financieres";
import EncaissementsProtected from "./pages/Encaissements-Protected";
import Login from "./pages/Login";
import AdminSetup from "./pages/AdminSetup";
import AdminInvitation from "./pages/AdminInvitation";
import NotFound from "./pages/NotFound";

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
          <PageProvider>
            <Routes>
              {/* Admin setup disabled in production for security */}
              {import.meta.env.DEV && (
                <Route path="/admin-setup" element={<AdminSetup />} />
              )}
              <Route path="/login" element={<Login />} />
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
              <Route path="/settings" element={
                <ProtectedRouteEnhanced>
                  <SettingsWithPermissions />
                </ProtectedRouteEnhanced>
              } />
              <Route path="/activity-logs" element={
                <ProtectedRouteEnhanced>
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
              <Route path="/operations-financieres" element={
                <ProtectedRouteEnhanced requiredModule="finances">
                  <OperationsFinancieres />
                </ProtectedRouteEnhanced>
              } />
              <Route path="/finances/encaissements" element={
                <ProtectedRouteEnhanced requiredModule="finances">
                  <EncaissementsProtected />
                </ProtectedRouteEnhanced>
              } />
              <Route path="/permission-diagnostic" element={
                <ProtectedRouteEnhanced>
                  <PermissionDiagnosticPage />
                </ProtectedRouteEnhanced>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;