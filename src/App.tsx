import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import SettingsWithPermissions from "./pages/Settings-Permissions";
import ActivityLogs from "./pages/ActivityLogs";
import Login from "./pages/Login";
import AdminSetup from "./pages/AdminSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PageProvider>
            <Routes>
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="/login" element={<Login />} />
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
                <ProtectedRouteEnhanced>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;